import { formatDateTime } from '@dsvhvn/dung-chung';
import type { ReviewScope, SummaryDetail, SummaryText, TranslationDetail, TranslationText } from '@dsvhvn/dung-chung/api';
import { errorMessage } from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Button,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Modal,
  TextAreaField,
  TextField,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../../access/screens';
import { adminTranslationsApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { LANGUAGE_IN_SENTENCE, LANGUAGE_NAME } from './translationLabels';
import type { ReviewItemRef } from './translationLinks';
import { draftOf, patchOf, type TranslationDraft } from './translationDraft';
import { StatusBadge } from './translationUi';

// Khung hai cột của màn hình Duyệt bản dịch và tóm tắt: bản gốc tiếng Việt bên trái (chỉ đọc), bản đang duyệt bên phải (tiếng Anh và tóm tắt tiếng Việt,
// tiếng Anh sửa được tại chỗ). "Duyệt" hiện công khai và ghi người, thời điểm duyệt; "Từ chối" là yêu cầu dịch lại (lý do chỉ ghi vào nhật ký thao tác).
// Bản tiếng Hàn, Trung, Nhật là bản dịch máy: chỉ xem, không có bước duyệt.

const MAX_REASON = 500;

/** Lưu chỉnh sửa trước khi duyệt không được: lỗi đã báo ở lần lưu nên lần duyệt không báo thêm. */
class SaveFailed extends Error {}

function ReadOnly({ children }: { children: ReactNode }) {
  return <div className="rounded-sm bg-surface-container-low px-3 py-2.5 type-body-s whitespace-pre-line text-on-surface">{children || <span className="text-on-surface-muted">(trống)</span>}</div>;
}

function ColumnHeadings({ left, right, editable }: { left: string; right: string; editable: boolean }) {
  return (
    <div className="grid gap-4 dsvmd:grid-cols-2">
      <h3 className="flex flex-wrap items-center gap-2 type-h4">
        {left}
        <Badge>Chỉ đọc</Badge>
      </h3>
      <h3 className="flex flex-wrap items-center gap-2 type-h4">
        {right}
        {editable && <Badge tone="danger">Sửa được tại chỗ</Badge>}
      </h3>
    </div>
  );
}

/** Một hàng của khung: nhãn và bản gốc bên trái, ô sửa (hoặc chữ chỉ đọc) bên phải. */
function Row({ label, original, children }: { label: string; original: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-4 dsvmd:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <p className="type-label text-on-surface-variant">{label}</p>
        <ReadOnly>{original}</ReadOnly>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

const joined = (name: string | null, description: string | null) => [name, description].filter(Boolean).join('\n');

// ---------------------------------------------------------------------------------------------------------------
// Hành động chung: lưu chỉnh sửa, duyệt, từ chối

interface Actions {
  save: () => Promise<unknown>;
  dirty: boolean;
}

function RejectDialog({ open, scopeLabel, pending, onConfirm, onClose }: { open: boolean; scopeLabel: string; pending: boolean; onConfirm: (reason: string | null) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const tooLong = reason.length > MAX_REASON;
  return (
    <Modal
      open={open}
      title="Từ chối và yêu cầu dịch lại"
      description={`${scopeLabel} sẽ ngừng hiện cho khách. Để dịch lại, bấm "Dịch và tóm tắt bằng AI" ở tab Bản dịch và tóm tắt của di sản.`}
      size="panel"
      busy={pending}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button variant="danger" loading={pending} disabled={tooLong} onClick={() => onConfirm(reason.trim() === '' ? null : reason.trim())}>
            Từ chối
          </Button>
        </>
      }
    >
      <TextAreaField
        label="Lý do (không bắt buộc)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={tooLong ? `Lý do tối đa ${MAX_REASON} ký tự.` : null}
        hint="Lý do chỉ lưu ở nhật ký thao tác, không hiện cho khách."
        rows={3}
      />
    </Modal>
  );
}

function checkTranslationCompleteness(original: TranslationText, draft: TranslationDraft, isOutdated: boolean): string | null {
  if (isOutdated) {
    return 'Di sản đang ở trạng thái Cần dịch lại. Hãy dịch lại bằng AI trước khi duyệt.';
  }
  if (original.name && !draft.name.trim()) {
    return 'Tên di sản chưa được dịch.';
  }
  if (original.shortDescription && !draft.shortDescription.trim()) {
    return 'Mô tả ngắn chưa được dịch.';
  }
  if (original.content && !draft.content.trim()) {
    return 'Nội dung chưa được dịch.';
  }
  for (let i = 0; i < original.timelines.length; i++) {
    const t = original.timelines[i]!;
    const dt = draft.timelines[t.id];
    if (t.name && (!dt || !dt.name.trim())) {
      return `Tên giai đoạn ${i + 1} chưa được dịch.`;
    }
    if (t.description && (!dt || !dt.description.trim())) {
      return `Mô tả giai đoạn ${i + 1} chưa được dịch.`;
    }
  }
  for (let i = 0; i < original.events.length; i++) {
    const e = original.events[i]!;
    const de = draft.events[e.id];
    if (e.name && (!de || !de.name.trim())) {
      return `Tên sự kiện ${i + 1} chưa được dịch.`;
    }
    if (e.description && (!de || !de.description.trim())) {
      return `Mô tả sự kiện ${i + 1} chưa được dịch.`;
    }
  }
  for (let i = 0; i < original.media.length; i++) {
    const m = original.media[i]!;
    const caption = draft.media[m.id];
    if (m.caption && (!caption || !caption.trim())) {
      return `Chú thích ảnh ${i + 1} chưa được dịch.`;
    }
  }
  return null;
}

function checkSummaryCompleteness(draft: SummaryText, isOutdated: boolean): string | null {
  if (isOutdated) {
    return 'Di sản đang ở trạng thái Cần dịch lại. Hãy dịch lại bằng AI trước khi duyệt.';
  }
  if (!draft.shortText.trim()) {
    return 'Bản tóm tắt ngắn chưa được điền.';
  }
  if (!draft.detailedText.trim()) {
    return 'Bản tóm tắt chi tiết chưa được điền.';
  }
  return null;
}

function ReviewBar({
  item,
  status,
  language,
  isOutdated = false,
  canApprove = true,
  validationReason = null,
  editable,
  actions,
  onResolved,
  onRegenerate,
  isRegenerating = false,
}: {
  item: ReviewItemRef;
  status: TranslationDetail['status'];
  language: ReviewItemRef['language'];
  isOutdated?: boolean;
  canApprove?: boolean;
  validationReason?: string | null;
  editable: boolean;
  actions: Actions;
  onResolved: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.translations });
    void queryClient.invalidateQueries({ queryKey: queryKeys.heritage(item.heritageId) });
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
  };

  const approve = useMutation({
    mutationFn: async (scope: ReviewScope) => {
      if (actions.dirty) {
        try {
          await actions.save();
        } catch {
          throw new SaveFailed();
        }
      }
      return adminTranslationsApi.approve(item.heritageId, item.language, scope);
    },
    onSuccess: ({ data, message }) => {
      toast.success(message ?? 'Duyệt thành công.');
      if (data.warning) toast.warning(data.warning);
      refresh();
      onResolved();
    },
    onError: (error) => {
      if (!(error instanceof SaveFailed)) toast.error(errorMessage(error));
    },
  });

  const reject = useMutation({
    mutationFn: (reason: string | null) => adminTranslationsApi.reject(item.heritageId, item.language, item.kind, reason),
    onSuccess: ({ message }) => {
      toast.success(message ?? 'Từ chối thành công.');
      setRejecting(false);
      refresh();
      onResolved();
    },
    onError: (error) => {
      setRejecting(false);
      toast.error(errorMessage(error));
    },
  });

  if (status === 'MACHINE') {
    return (
      <InlineMessage tone="info">
        Bản tiếng Hàn, Trung, Nhật là bản dịch máy: không có bước duyệt và luôn mang nhãn "bản dịch máy" khi khách xem. Muốn dịch lại, bấm "Dịch và tóm tắt bằng AI" ở
        tab Bản dịch và tóm tắt của di sản.
      </InlineMessage>
    );
  }
  const busy = approve.isPending || reject.isPending;
  const approvable = status === 'PENDING';
  const rejectable = status === 'PENDING' || status === 'APPROVED';
  const scopeLabel = item.kind === 'TRANSLATION' ? `Bản dịch ${LANGUAGE_IN_SENTENCE[language]}` : `Tóm tắt ${LANGUAGE_IN_SENTENCE[language]}`;

  return (
    <div className="flex flex-col gap-3">
      {status === 'APPROVED' && (
        <InlineMessage tone="info">
          Sửa bản đã duyệt thì bản đó quay về tab Chờ duyệt và ngừng hiện cho khách cho tới khi được duyệt lại. Từ chối để gỡ một bản đã hiện mà còn sai.
        </InlineMessage>
      )}
      {status === 'REJECTED' && (
        <InlineMessage tone="info">Bản này đã bị từ chối nên không hiện cho khách. Bấm "Dịch và tóm tắt bằng AI" ở di sản để dịch lại, hoặc sửa rồi lưu để đưa về Chờ duyệt.</InlineMessage>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {rejectable && (
          <Button variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
            Từ chối
          </Button>
        )}
        {approvable && (
          <p className="max-w-[360px] type-label text-on-surface-variant">Duyệt sẽ hiện bản này công khai và ghi người duyệt, thời điểm duyệt.</p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {editable && actions.dirty && (
            <Button variant="secondary" onClick={() => void actions.save().catch(() => undefined)} disabled={busy}>
              Lưu chỉnh sửa
            </Button>
          )}
          {isOutdated && onRegenerate && (
            <Button variant="secondary" onClick={onRegenerate} loading={isRegenerating} disabled={busy || isRegenerating}>
              <Icon name="sparkles" size={16} />
              Dịch lại bằng AI
            </Button>
          )}
          {approvable && language === 'en' && (
            <Button
              variant="secondary"
              onClick={() => approve.mutate('BOTH')}
              loading={approve.isPending && approve.variables === 'BOTH'}
              disabled={busy || !canApprove || isRegenerating}
            >
              Duyệt cả bản dịch và tóm tắt của ngôn ngữ này
            </Button>
          )}
          {approvable && (
            <Button
              onClick={() => approve.mutate(item.kind)}
              loading={approve.isPending && approve.variables === item.kind}
              disabled={busy || !canApprove || isRegenerating}
            >
              Duyệt
            </Button>
          )}
        </div>
      </div>
      {approvable && !canApprove && validationReason && (
        <p className="type-body-s font-medium text-danger">{validationReason}</p>
      )}
      <RejectDialog
        open={rejecting}
        scopeLabel={scopeLabel}
        pending={reject.isPending}
        onConfirm={(reason) => reject.mutate(reason)}
        onClose={() => setRejecting(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Bản dịch nội dung

function TranslationBody({
  detail,
  item,
  onResolved,
  onRegenerate,
  isRegenerating = false,
}: {
  detail: TranslationDetail;
  item: ReviewItemRef;
  onResolved: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [initial] = useState(() => draftOf(detail.original, detail.translated));
  const [draft, setDraft] = useState<TranslationDraft>(initial);
  const editable = detail.language === 'en' && detail.status !== 'MACHINE';
  const patch = patchOf(initial, draft, detail.original);
  const validationError = checkTranslationCompleteness(detail.original, draft, detail.isOutdated);

  const save = useMutation({
    mutationFn: () => adminTranslationsApi.updateTranslation(item.heritageId, item.language, patch ?? {}),
    onSuccess: ({ data, message }) => {
      queryClient.setQueryData(queryKeys.translationDetail(item.heritageId, 'TRANSLATION', item.language), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.translations });
      toast.success(message ?? 'Lưu bản dịch thành công.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const o: TranslationText = detail.original;
  const t: TranslationText = detail.translated;
  const set = (change: Partial<TranslationDraft>) => setDraft((current) => ({ ...current, ...change }));
  const field = (label: string, value: string, key: 'name' | 'shortDescription' | 'content', rows: number) =>
    editable ? (
      <TextAreaField label={label} value={value} rows={rows} onChange={(event) => set({ [key]: event.target.value })} />
    ) : (
      <>
        <p className="type-label text-on-surface-variant">{label}</p>
        <ReadOnly>{value}</ReadOnly>
      </>
    );

  return (
    <div className="flex flex-col gap-6">
      <ColumnHeadings left="Bản gốc tiếng Việt" right={`${detail.status === 'MACHINE' ? 'Bản dịch máy' : detail.status === 'PENDING' ? 'Bản chờ duyệt' : 'Bản dịch'} — ${LANGUAGE_NAME[detail.language]}`} editable={editable} />
      <Row label="Tên" original={o.name}>
        {field('Tên', draft.name, 'name', 2)}
      </Row>
      <Row label="Mô tả ngắn" original={o.shortDescription}>
        {field('Mô tả ngắn', draft.shortDescription, 'shortDescription', 4)}
      </Row>
      <Row label="Nội dung" original={o.content}>
        {field('Nội dung', draft.content, 'content', 10)}
      </Row>
      {o.timelines.length > 0 &&
        o.timelines.map((timeline, index) => (
          <Row key={timeline.id} label={`Giai đoạn ${index + 1} trên ${o.timelines.length}`} original={joined(timeline.name, timeline.description)}>
            {editable ? (
              <>
                <TextField
                  label={`Tên giai đoạn ${index + 1}`}
                  value={draft.timelines[timeline.id]?.name ?? ''}
                  onChange={(event) => set({ timelines: { ...draft.timelines, [timeline.id]: { name: event.target.value, description: draft.timelines[timeline.id]?.description ?? '' } } })}
                />
                <TextAreaField
                  label={`Mô tả giai đoạn ${index + 1}`}
                  rows={3}
                  value={draft.timelines[timeline.id]?.description ?? ''}
                  onChange={(event) => set({ timelines: { ...draft.timelines, [timeline.id]: { name: draft.timelines[timeline.id]?.name ?? '', description: event.target.value } } })}
                />
              </>
            ) : (
              <>
                <p className="type-label text-on-surface-variant">{`Giai đoạn ${index + 1}`}</p>
                <ReadOnly>{joined(t.timelines.find((c) => c.id === timeline.id)?.name ?? null, t.timelines.find((c) => c.id === timeline.id)?.description ?? null)}</ReadOnly>
              </>
            )}
          </Row>
        ))}
      {o.events.map((event, index) => (
        <Row key={event.id} label={`Sự kiện ${index + 1} trên ${o.events.length}`} original={joined(event.name, event.description)}>
          {editable ? (
            <>
              <TextField
                label={`Tên sự kiện ${index + 1}`}
                value={draft.events[event.id]?.name ?? ''}
                onChange={(e) => set({ events: { ...draft.events, [event.id]: { name: e.target.value, description: draft.events[event.id]?.description ?? '' } } })}
              />
              <TextAreaField
                label={`Mô tả sự kiện ${index + 1}`}
                rows={2}
                value={draft.events[event.id]?.description ?? ''}
                onChange={(e) => set({ events: { ...draft.events, [event.id]: { name: draft.events[event.id]?.name ?? '', description: e.target.value } } })}
              />
            </>
          ) : (
            <>
              <p className="type-label text-on-surface-variant">{`Sự kiện ${index + 1}`}</p>
              <ReadOnly>{joined(t.events.find((c) => c.id === event.id)?.name ?? null, t.events.find((c) => c.id === event.id)?.description ?? null)}</ReadOnly>
            </>
          )}
        </Row>
      ))}
      {o.media.map((media, index) => (
        <Row key={media.id} label={`Chú thích ảnh ${index + 1} trên ${o.media.length}`} original={media.caption}>
          {editable ? (
            <TextAreaField
              label={`Chú thích ảnh ${index + 1}`}
              rows={2}
              value={draft.media[media.id] ?? ''}
              onChange={(e) => set({ media: { ...draft.media, [media.id]: e.target.value } })}
            />
          ) : (
            <>
              <p className="type-label text-on-surface-variant">{`Chú thích ảnh ${index + 1}`}</p>
              <ReadOnly>{t.media.find((c) => c.id === media.id)?.caption ?? ''}</ReadOnly>
            </>
          )}
        </Row>
      ))}
      <ReviewBar
        item={item}
        status={detail.status}
        language={detail.language}
        isOutdated={detail.isOutdated}
        canApprove={!detail.isOutdated && validationError === null}
        validationReason={validationError}
        editable={editable}
        actions={{ dirty: patch !== null, save: () => save.mutateAsync() }}
        onResolved={onResolved}
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Tóm tắt

function SummaryBody({
  detail,
  item,
  onResolved,
  onRegenerate,
  isRegenerating = false,
}: {
  detail: SummaryDetail;
  item: ReviewItemRef;
  onResolved: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [initial] = useState<SummaryText>(() => ({ shortText: detail.summary.shortText, detailedText: detail.summary.detailedText }));
  const [draft, setDraft] = useState<SummaryText>(initial);
  const editable = (detail.language === 'vi' || detail.language === 'en') && detail.status !== 'MACHINE';
  const dirty = draft.shortText !== initial.shortText || draft.detailedText !== initial.detailedText;
  const validationError = checkSummaryCompleteness(draft, detail.isOutdated);

  const save = useMutation({
    mutationFn: () => adminTranslationsApi.updateSummary(item.heritageId, item.language, { shortText: draft.shortText, detailedText: draft.detailedText }),
    onSuccess: ({ data, message }) => {
      queryClient.setQueryData(queryKeys.translationDetail(item.heritageId, 'SUMMARY', item.language), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.translations });
      toast.success(message ?? 'Lưu tóm tắt thành công.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  // Nguồn bên trái: tóm tắt tiếng Việt (cho bản dịch của tóm tắt) hoặc chữ tiếng Việt của di sản (cho chính tóm tắt tiếng Việt).
  const source = detail.language === 'vi' ? null : detail.viSummary;
  const heritageText = [detail.original.shortDescription, detail.original.content].filter(Boolean).join('\n\n');

  return (
    <div className="flex flex-col gap-6">
      <ColumnHeadings
        left={source ? 'Tóm tắt tiếng Việt' : 'Nội dung tiếng Việt của di sản'}
        right={`${detail.status === 'MACHINE' ? 'Bản dịch máy' : detail.status === 'PENDING' ? 'Bản chờ duyệt' : 'Tóm tắt'} — ${LANGUAGE_NAME[detail.language]}`}
        editable={editable}
      />
      <Row label="Bản ngắn (để nghe)" original={source ? source.shortText : heritageText}>
        {editable ? (
          <TextAreaField label="Bản ngắn (để nghe)" rows={5} value={draft.shortText} onChange={(event) => setDraft({ ...draft, shortText: event.target.value })} hint="Tối đa 2000 ký tự, đọc to trong khoảng một phút." />
        ) : (
          <>
            <p className="type-label text-on-surface-variant">Bản ngắn (để nghe)</p>
            <ReadOnly>{detail.summary.shortText}</ReadOnly>
          </>
        )}
      </Row>
      <Row label="Bản chi tiết (để đọc)" original={source ? source.detailedText : ''}>
        {editable ? (
          <TextAreaField label="Bản chi tiết (để đọc)" rows={10} value={draft.detailedText} onChange={(event) => setDraft({ ...draft, detailedText: event.target.value })} />
        ) : (
          <>
            <p className="type-label text-on-surface-variant">Bản chi tiết (để đọc)</p>
            <ReadOnly>{detail.summary.detailedText}</ReadOnly>
          </>
        )}
      </Row>
      <ReviewBar
        item={item}
        status={detail.status}
        language={detail.language}
        isOutdated={detail.isOutdated}
        canApprove={!detail.isOutdated && validationError === null}
        validationReason={validationError}
        editable={editable}
        actions={{ dirty, save: () => save.mutateAsync() }}
        onResolved={onResolved}
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------

export function ReviewPanel({ item, onResolved }: { item: ReviewItemRef; onResolved: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery<TranslationDetail | SummaryDetail>({
    queryKey: queryKeys.translationDetail(item.heritageId, item.kind, item.language),
    queryFn: () =>
      item.kind === 'TRANSLATION'
        ? adminTranslationsApi.translation(item.heritageId, item.language).then((r) => r.data)
        : adminTranslationsApi.summary(item.heritageId, item.language).then((r) => r.data),
    staleTime: 0,
  });

  const generate = useMutation({
    mutationFn: () => adminTranslationsApi.generate(item.heritageId),
    onSuccess: ({ message }) => {
      toast.success(message ?? 'Đã dịch và tóm tắt di sản.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.translations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.translationDetail(item.heritageId, item.kind, item.language) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.heritage(item.heritageId) });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const detail = query.data;
  const kindName = item.kind === 'TRANSLATION' ? 'Bản dịch' : 'Tóm tắt';

  return (
    <section aria-label="Chi tiết bản dịch hoặc tóm tắt" className="flex flex-col gap-5 rounded-md border border-border bg-surface p-6">
      {query.isPending && <LoadingState rows={5} />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {detail && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="type-h3">{detail.heritageName}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 type-body-s text-on-surface-variant">
                {kindName} · {LANGUAGE_NAME[detail.language]} <StatusBadge status={detail.status} outdated={detail.isOutdated} />
                {detail.status === 'APPROVED' && detail.reviewedByName && (
                  <span>
                    Duyệt bởi {detail.reviewedByName}, {formatDateTime(detail.reviewedAt)}
                  </span>
                )}
              </p>
            </div>
            <Link to={PATHS.heritage(item.heritageId)} className="inline-flex items-center gap-1.5 type-control text-link underline-offset-4 hover:underline">
              <Icon name="external-link" size={16} />
              Mở di sản
            </Link>
          </header>
          {detail.isOutdated && (
            <div className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning-container/30 p-4 dsvsm:flex-row dsvsm:items-center dsvsm:justify-between">
              <div className="flex items-center gap-2">
                <Icon name="alert-triangle" size={18} className="shrink-0 text-warning" />
                <p className="type-body-s text-on-warning-container">
                  Nội dung tiếng Việt đã được sửa sau khi dịch. Bản này vẫn hiện cho khách; hãy dịch lại di sản để cập nhật.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generate.mutate()}
                loading={generate.isPending}
                disabled={generate.isPending}
                className="shrink-0"
              >
                <Icon name="sparkles" size={16} />
                Dịch lại bằng AI
              </Button>
            </div>
          )}
          {item.language === 'en' && detail.status === 'PENDING' && (
            <InlineMessage tone="success">Duyệt bản tiếng Anh thì hệ thống dịch lại bản Hàn, Trung, Nhật từ bản đã duyệt.</InlineMessage>
          )}
          {'translated' in detail ? (
            <TranslationBody
              key={query.dataUpdatedAt}
              detail={detail}
              item={item}
              onResolved={onResolved}
              onRegenerate={() => generate.mutate()}
              isRegenerating={generate.isPending}
            />
          ) : (
            <SummaryBody
              key={query.dataUpdatedAt}
              detail={detail}
              item={item}
              onResolved={onResolved}
              onRegenerate={() => generate.mutate()}
              isRegenerating={generate.isPending}
            />
          )}
        </>
      )}
    </section>
  );
}
