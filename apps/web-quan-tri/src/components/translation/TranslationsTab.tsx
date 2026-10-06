import type { HeritageDetail, TranslationCell, TranslationKind, TranslationOverview } from '@dsvhvn/dung-chung/api';
import { errorMessage } from '@dsvhvn/dung-chung/api';
import { formatDateTime } from '@dsvhvn/dung-chung';
import { Badge, Button, ErrorState, Icon, InlineMessage, LoadingState, Table, Td, Th, Tr, useToast } from '@dsvhvn/dung-chung/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { adminTranslationsApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { LANGUAGE_NAME } from './translationLabels';
import { reviewPath } from './translationLinks';
import { CellBadge } from './translationUi';

// Tab Bản dịch và tóm tắt của Biên tập di sản (quản trị hệ thống): bảng năm ngôn ngữ × hai đơn vị duyệt (Bản dịch: mô tả ngắn, nội dung, giai đoạn, sự
// kiện, chú thích ảnh cùng lúc; Tóm tắt: bản ngắn và bản chi tiết cùng lúc) với trạng thái từng ô, dải nhắc "cần dịch lại" và nút "Dịch và tóm tắt bằng AI".
// Tiếng Việt và tiếng Anh phải được duyệt mới hiện; tiếng Hàn, Trung, Nhật hiện ngay kèm nhãn bản dịch máy. Việc dịch không tính hạn mức lượt AI của trường.

function updatedAt(...cells: Array<TranslationCell | undefined>): string {
  const stamps = cells.map((cell) => cell?.updatedAt ?? cell?.createdAt).filter((value): value is string => Boolean(value));
  stamps.sort();
  return formatDateTime(stamps.at(-1));
}

/** Ghi chú dưới nhãn trạng thái của một ô. */
function CellNote({ cell, kind, heritageId }: { cell: TranslationCell | undefined; kind: TranslationKind; heritageId: number }) {
  if (!cell || cell.status === null) {
    return <span className="type-body-s text-on-surface-variant">{kind === 'SUMMARY' ? 'Chưa tạo tóm tắt' : 'Chưa dịch'}</span>;
  }
  const machine = cell.language === 'ko' || cell.language === 'zh-Hans' || cell.language === 'ja';
  const notes: string[] = [];
  if (cell.isOutdated) notes.push('Bản cũ vẫn hiện cho khách');
  else if (cell.status === 'PENDING') notes.push(`Dịch lại lúc ${formatDateTime(cell.updatedAt ?? cell.createdAt)}`);
  else if (cell.status === 'APPROVED') notes.push(`Duyệt bởi ${cell.reviewedByName ?? 'quản trị hệ thống'}, ${formatDateTime(cell.reviewedAt)}`);
  else if (cell.status === 'REJECTED') notes.push('Không hiện cho khách. Bấm "Dịch và tóm tắt bằng AI" để dịch lại');
  else if (machine && cell.status === 'MACHINE') notes.push('Hiện ngay kèm nhãn bản dịch máy');
  if (machine && cell.isOutdated) notes.push('Bản dịch máy');
  const reviewable = cell.status === 'PENDING' || cell.status === 'APPROVED';
  return (
    <div className="flex flex-col gap-1">
      {reviewable && !cell.isOutdated && (
        <Link
          to={reviewPath({ heritageId, kind, language: cell.language }, cell.status)}
          className="inline-flex items-center gap-1 type-control text-link underline-offset-4 hover:underline"
        >
          {cell.status === 'PENDING' ? 'Duyệt' : 'Xem và sửa'}
          <Icon name="chevron-right" size={16} />
        </Link>
      )}
      {notes.length > 0 && <span className="type-body-s text-on-surface-variant">{notes.join(' · ')}</span>}
    </div>
  );
}

function Cell({ cell, kind, heritageId }: { cell: TranslationCell | undefined; kind: TranslationKind; heritageId: number }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {cell ? <CellBadge cell={cell} /> : <Badge>Chưa có</Badge>}
      <CellNote cell={cell} kind={kind} heritageId={heritageId} />
    </div>
  );
}

function OverviewTable({ overview }: { overview: TranslationOverview }) {
  const translationOf = (language: string) => overview.translations.find((cell) => cell.language === language);
  const summaryOf = (language: string) => overview.summaries.find((cell) => cell.language === language);
  const rows = (['vi', 'en', 'ko', 'zh-Hans', 'ja'] as const).map((language) => ({
    language,
    translation: translationOf(language),
    summary: summaryOf(language),
  }));
  return (
    <div>
      <Table caption="Bản dịch và tóm tắt theo ngôn ngữ">
        <thead>
          <tr>
            <Th>Ngôn ngữ</Th>
            <Th>Bản dịch</Th>
            <Th>Tóm tắt</Th>
            <Th>Cập nhật lần cuối</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ language, translation, summary }) => (
            <Tr key={language}>
              <Td className="font-medium whitespace-nowrap" lang={language}>
                {LANGUAGE_NAME[language]}
              </Td>
              <Td className="min-w-[220px] align-top">
                {language === 'vi' ? (
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge>Bản gốc</Badge>
                    <span className="type-body-s text-on-surface-variant">Bản gốc tiếng Việt, không cần dịch</span>
                  </div>
                ) : (
                  <Cell cell={translation} kind="TRANSLATION" heritageId={overview.heritageId} />
                )}
              </Td>
              <Td className="min-w-[220px] align-top">
                <Cell cell={summary} kind="SUMMARY" heritageId={overview.heritageId} />
              </Td>
              <Td className="type-mono-label whitespace-nowrap align-top">{updatedAt(translation, summary)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-4 flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 type-label text-on-surface-variant">
          Trạng thái từng ô:
          <Badge>Chưa có</Badge>
          <Badge>Bản dịch máy</Badge>
          <Badge tone="danger">Chờ duyệt</Badge>
          <Badge tone="success">Đã duyệt</Badge>
          <Badge tone="danger">Bị từ chối</Badge>
          <Badge tone="warning">Cần dịch lại</Badge>
        </p>
        <p className="type-label text-on-surface-variant">
          Bản tiếng Hàn, Trung, Nhật là bản dịch máy từ bản tiếng Anh đã duyệt (chưa có thì từ tiếng Việt), không có bước duyệt.
        </p>
      </div>
    </div>
  );
}

export function TranslationsTab({ heritage }: { heritage: HeritageDetail }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: queryKeys.translationOverview(heritage.id),
    queryFn: () => adminTranslationsApi.overview(heritage.id).then((r) => r.data),
  });

  const generate = useMutation({
    mutationFn: () => adminTranslationsApi.generate(heritage.id),
    onSuccess: ({ data, message }) => {
      queryClient.setQueryData(queryKeys.translationOverview(heritage.id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.translations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.heritage(heritage.id) });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
      toast.success(message ?? 'Đã dịch và tóm tắt di sản.');
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      void queryClient.invalidateQueries({ queryKey: queryKeys.translationOverview(heritage.id) });
    },
  });

  if (overview.isPending) return <LoadingState rows={5} />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  const data = overview.data;
  const busy = generate.isPending;
  const noTranslationYet = heritage.status === 'PUBLISHED' && heritage.translationState === 'NONE';

  return (
    <div className="flex flex-col gap-6">
      {data.outdatedCount > 0 && data.outdatedNotice && <InlineMessage tone="warning">{data.outdatedNotice}</InlineMessage>}
      {noTranslationYet && data.outdatedCount === 0 && (
        <InlineMessage tone="info">
          Di sản đã xuất bản nhưng chưa có bản dịch. Bấm "Dịch và tóm tắt bằng AI" để khách xem được di sản bằng năm ngôn ngữ.
        </InlineMessage>
      )}

      <div className="flex flex-col gap-4 dsvmd:flex-row dsvmd:items-start dsvmd:justify-between">
        <div className="max-w-[720px]">
          <h2 className="type-h3">Bản dịch và tóm tắt theo ngôn ngữ</h2>
          <p className="mt-1 type-body-s text-on-surface-variant">
            Bản dịch gồm mô tả ngắn, nội dung, giai đoạn, sự kiện, chú thích ảnh. Tóm tắt gồm bản ngắn và bản chi tiết. Dịch và tóm tắt bằng AI không tính vào hạn mức lượt
            AI của trường.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 dsvmd:items-end">
          <Button onClick={() => generate.mutate()} loading={busy} disabled={!data.canGenerate}>
            <Icon name="sparkles" size={16} />
            Dịch và tóm tắt bằng AI
          </Button>
          {!data.canGenerate && data.cannotGenerateReason && (
            <p className="max-w-[360px] type-body-s text-on-surface-variant dsvmd:text-right">{data.cannotGenerateReason}</p>
          )}
        </div>
      </div>

      {busy && (
        <output className="flex items-start gap-3 rounded-sm bg-surface-container px-4 py-3 type-body-s text-on-surface">
          <Icon name="sparkles" size={20} className="mt-px shrink-0" />
          <span>
            AI đang xử lý, vui lòng đợi trong giây lát. Đang dịch và tóm tắt "{data.name}" sang 4 ngôn ngữ; việc này có thể mất vài phút khi nội dung dài.
          </span>
        </output>
      )}
      {generate.isError && (
        <InlineMessage
          tone="danger"
          action={
            <Button variant="secondary" size="sm" onClick={() => generate.mutate()} disabled={busy || !data.canGenerate}>
              Thử lại
            </Button>
          }
        >
          {errorMessage(generate.error)}
        </InlineMessage>
      )}

      <OverviewTable overview={data} />
    </div>
  );
}
