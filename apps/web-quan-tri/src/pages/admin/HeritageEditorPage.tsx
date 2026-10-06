import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { ApiError, ERROR_CODES, errorMessage, type HeritageDetail } from '@dsvhvn/dung-chung/api';
import {
  currentVietnamYear,
  focusFirstInvalid,
  formatDateTime,
  MESSAGES,
  slugify,
  splitApiError,
  validateHeritage,
  type HeritageField,
  type HeritageValues,
} from '@dsvhvn/dung-chung';
import { registerPreviewWindow } from '@dsvhvn/dung-chung/auth';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ExternalButtonLink,
  Icon,
  InlineMessage,
  LoadingState,
  TabPanel,
  Tabs,
  TextLink,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { PATHS, pathOf } from '../../access/screens';
import { heritagePreviewLink, heritagePublicLink } from '../../components/heritage/heritageLink';
import { GENERAL_FORM_ID, GeneralInfoTab } from '../../components/heritage/GeneralInfoTab';
import { HeritageActionDialog } from '../../components/heritage/HeritageActionDialog';
import { HERITAGE_FIELDS, EDITOR_TABS, EMPTY_HERITAGE, formFieldOf, heritageBody, heritageValuesOf, readTab, sameHeritage, tabOfMissing, type EditorTab } from '../../components/heritage/heritageForm';
import { HeritageStatusBadge } from '../../components/heritage/HeritageStatusBadge';
import { MediaTab } from '../../components/heritage/MediaTab';
import { ReferencesTab } from '../../components/heritage/ReferencesTab';
import { TimelineTab } from '../../components/heritage/TimelineTab';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { adminHeritagesApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Biên tập di sản — quản trị hệ thống. Hai trạng thái:
//   /quan-tri/di-san/moi   tạo mới: chỉ tab Thông tin chung; "Lưu nháp" tạo di sản ở trạng thái Nháp (chỉ tên bắt buộc)
//                          rồi chuyển sang trang sửa để thêm ảnh, giai đoạn, nguồn.
//   /quan-tri/di-san/:diSan  bốn tab (Thông tin chung, Ảnh và media, Dòng thời gian, Nguồn tham chiếu; tab nằm trên URL
//                          ?tab=). "Lưu nháp" / "Lưu", "Xuất bản", "Ẩn", "Hiện lại" tùy trạng thái. Xuất bản và hiện lại
//                          chỉ thành công khi đủ điều kiện; thiếu thì báo phần còn thiếu, không đổi gì. Di sản đang xuất
//                          bản vẫn sửa được nhưng sửa xong phải còn đủ điều kiện.

const TAB_PREFIX = 'di-san';
const backLink = <TextLink to={pathOf('heritages')}>← Danh sách di sản</TextLink>;

/** Phần còn thiếu để xuất bản, lấy từ lỗi NOT_READY của máy chủ. */
interface NotReady {
  message: string;
  tab: EditorTab;
}

function notReadyOf(error: unknown): NotReady | null {
  if (!(error instanceof ApiError) || error.code !== ERROR_CODES.notReady) return null;
  const first = Object.keys(error.fieldErrors)[0];
  return { message: error.message, tab: first ? tabOfMissing(first) : 'thong-tin' };
}

const TAB_LABEL: Record<EditorTab, string> = Object.fromEntries(EDITOR_TABS.map((t) => [t.id, t.label])) as Record<EditorTab, string>;

function Workspace({ heritage }: { heritage: HeritageDetail | null }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));
  const creating = heritage === null;

  const [values, setValues] = useState<HeritageValues>(() => (heritage ? heritageValuesOf(heritage) : EMPTY_HERITAGE));
  const [errors, setErrors] = useState<Partial<Record<HeritageField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState<NotReady | null>(null);
  const [slugTouched, setSlugTouched] = useState(!creating);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [opening, setOpening] = useState(false);
  const leaveAllowed = useRef(false);

  const dirty = !sameHeritage(values, heritage ? heritageValuesOf(heritage) : EMPTY_HERITAGE);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaveAllowed.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setTab = (next: EditorTab) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'thong-tin') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true },
    );

  const refreshDetail = () => {
    if (!heritage) return;
    setNotReady(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.heritage(heritage.id) });
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
  };

  /** Đưa chi tiết mới nhận từ máy chủ vào bộ nhớ đệm và vào các ô nhập. */
  const adopt = (detail: HeritageDetail) => {
    queryClient.setQueryData(queryKeys.heritage(detail.id), detail);
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
    setValues(heritageValuesOf(detail));
    setErrors({});
    setFormError(null);
  };

  const change = (field: HeritageField, value: string) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Tạo mới: đường dẫn theo tên tới khi người dùng tự sửa đường dẫn.
      if (field === 'name' && creating && !slugTouched) next.slug = slugify(value);
      return next;
    });
    if (field === 'slug') setSlugTouched(true);
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const suggestSlug = async () => {
    if (!creating || slugTouched || values.name.trim() === '') return;
    try {
      const { data } = await adminHeritagesApi.suggestSlug(values.name.trim());
      setValues((current) => (slugTouched ? current : { ...current, slug: data }));
    } catch {
      // Gợi ý chỉ để tiện; đường dẫn sinh tại máy khách vẫn dùng được và máy chủ kiểm khi lưu.
    }
  };

  const showFailure = (error: unknown) => {
    const missing = notReadyOf(error);
    if (missing) {
      setNotReady(missing);
      if (error instanceof ApiError) {
        const fields: Partial<Record<HeritageField, string>> = {};
        for (const [key, message] of Object.entries(error.fieldErrors)) {
          const field = formFieldOf(key);
          if (field) fields[field] = message;
        }
        setErrors(fields);
      }
      return;
    }
    const failure = splitApiError<string>(error, [...HERITAGE_FIELDS, 'coordinates']);
    const fields: Partial<Record<HeritageField, string>> = {};
    for (const [key, message] of Object.entries(failure.fields) as [string, string][]) {
      const field = formFieldOf(key);
      if (field) fields[field] = message;
    }
    setErrors(fields);
    setFormError(failure.form);
    setTab('thong-tin');
    focusFirstInvalid(formRef.current);
  };

  /** Kiểm rồi lưu thông tin chung; trả chi tiết đã lưu, hoặc null khi có lỗi (lỗi đã hiện). */
  const save = async (): Promise<HeritageDetail | null> => {
    setFormError(null);
    setNotReady(null);
    const found = validateHeritage(values, currentVietnamYear());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setTab('thong-tin');
      focusFirstInvalid(formRef.current);
      return null;
    }
    setSaving(true);
    try {
      const body = heritageBody(values);
      if (!heritage) {
        const { data, message } = await adminHeritagesApi.create(body);
        queryClient.setQueryData(queryKeys.heritage(data.id), data);
        void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
        toast.success(message ?? MESSAGES.success('Tạo di sản'));
        leaveAllowed.current = true;
        navigate(PATHS.heritage(data.id), { replace: true });
        return data;
      }
      const { data, message } = await adminHeritagesApi.update(heritage.id, body);
      adopt(data);
      toast.success(message ?? MESSAGES.success('Lưu di sản'));
      return data;
    } catch (error) {
      showFailure(error);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save();
  };

  /** Xuất bản (từ Nháp) hoặc hiện lại (từ Đã ẩn); có thay đổi chưa lưu thì lưu trước. */
  const publish = async () => {
    if (!heritage) return;
    if (dirty && !(await save())) return;
    setActing(true);
    setNotReady(null);
    try {
      const call = heritage.status === 'ARCHIVED' ? adminHeritagesApi.restore : adminHeritagesApi.publish;
      const { data, message } = await call(heritage.id);
      adopt(data);
      toast.success(
        message ?? MESSAGES.success(heritage.status === 'ARCHIVED' ? 'Hiện lại di sản' : 'Xuất bản di sản'),
      );
    } catch (error) {
      const missing = notReadyOf(error);
      if (missing) {
        setNotReady(missing);
      } else {
        toast.error(errorMessage(error));
      }
    } finally {
      setActing(false);
    }
  };

  /**
   * "Xem trước" bản nháp: mở tab mới ngay trong lúc bấm (nếu đợi máy chủ rồi mới mở, trình duyệt chặn cửa sổ mới), có thay đổi chưa
   * lưu thì lưu trước, xin mã xem trước rồi chuyển tab sang trang xem trước của web học tập. Tab được đăng ký để chỉ nó nhận token.
   */
  const openPreview = async () => {
    if (!heritage) return;
    const previewTab = window.open('', '_blank');
    if (!previewTab) {
      toast.error('Trình duyệt đang chặn cửa sổ mới. Hãy cho phép cửa sổ bật lên cho trang này rồi bấm lại.');
      return;
    }
    registerPreviewWindow(previewTab);
    setOpening(true);
    try {
      if (dirty && !(await save())) {
        previewTab.close();
        return;
      }
      const { data } = await adminHeritagesApi.issuePreview(heritage.id);
      previewTab.location.href = heritagePreviewLink(data.path);
    } catch (error) {
      previewTab.close();
      toast.error(errorMessage(error));
    } finally {
      setOpening(false);
    }
  };

  const status = heritage?.status ?? 'DRAFT';
  const readiness = heritage?.readiness;
  const missingText = readiness?.missing.map((m) => m.label).join(', ');
  const banner: NotReady | null =
    notReady ??
    (heritage && status !== 'PUBLISHED' && readiness && !readiness.isReady
      ? { message: `Chưa đủ điều kiện xuất bản. Còn thiếu: ${missingText}.`, tab: tabOfMissing(readiness.missing[0]?.field ?? '') }
      : null);
  const busy = saving || acting;
  const title = heritage?.name?.trim() || (creating ? 'Tạo di sản' : 'Di sản');

  const stamp = heritage?.updatedAt ?? heritage?.createdAt;
  const description = (
    <span className="flex flex-wrap items-center gap-3">
      {heritage && <HeritageStatusBadge status={status} />}
      <span>
        {creating
          ? 'Di sản mới được lưu ở trạng thái Nháp; chỉ cần có tên.'
          : `${status === 'DRAFT' ? 'Lưu nháp' : 'Cập nhật'} lần cuối lúc ${formatDateTime(stamp)}`}
      </span>
    </span>
  );

  return (
    <AreaPage>
      <PageHeader
        title={title}
        before={backLink}
        description={description}
        actions={
          <>
            <Button type="submit" form={GENERAL_FORM_ID} variant={heritage && status === 'DRAFT' ? 'secondary' : 'primary'} loading={saving} disabled={acting}>
              {status === 'DRAFT' ? 'Lưu nháp' : 'Lưu'}
            </Button>
            {heritage && status === 'PUBLISHED' && heritage.slug && (
              <ExternalButtonLink variant="secondary" href={heritagePublicLink(heritage.slug)}>
                <Icon name="external-link" size={16} />
                Xem trang công khai
              </ExternalButtonLink>
            )}
            {heritage && status !== 'PUBLISHED' && (
              <Button variant="secondary" loading={opening} disabled={saving || acting} onClick={() => void openPreview()}>
                <Icon name="eye" size={16} />
                Xem trước
              </Button>
            )}
            {heritage && status === 'PUBLISHED' && (
              <Button variant="danger" onClick={() => setArchiving(true)} disabled={busy}>
                Ẩn
              </Button>
            )}
            {heritage && status !== 'PUBLISHED' && (
              <Button onClick={() => void publish()} loading={acting} disabled={saving}>
                {status === 'ARCHIVED' ? 'Hiện lại' : 'Xuất bản'}
              </Button>
            )}
          </>
        }
      />

      {banner && (
        <InlineMessage
          tone={notReady ? 'danger' : 'warning'}
          action={
            banner.tab !== tab && (
              <Button variant="secondary" size="sm" onClick={() => setTab(banner.tab)}>
                Mở tab {TAB_LABEL[banner.tab]}
              </Button>
            )
          }
        >
          {banner.message}
        </InlineMessage>
      )}
      {heritage && status === 'PUBLISHED' && readiness && readiness.warnings.length > 0 && tab === 'thong-tin' && (
        <InlineMessage tone="info">{readiness.warnings.join(' ')}</InlineMessage>
      )}

      <Tabs idPrefix={TAB_PREFIX} label="Nội dung di sản" items={EDITOR_TABS} value={tab} onChange={setTab} />

      {/* Tab Thông tin chung luôn nằm trong cây để giữ các ô đang nhập khi chuyển tab. */}
      <div
        ref={formRef}
        role="tabpanel"
        id={`${TAB_PREFIX}-panel-thong-tin`}
        aria-labelledby={`${TAB_PREFIX}-tab-thong-tin`}
        hidden={tab !== 'thong-tin'}
        className="pt-8"
      >
        <GeneralInfoTab
          heritage={heritage}
          values={values}
          errors={errors}
          formError={formError}
          disabled={busy}
          onChange={change}
          onNameBlur={() => void suggestSlug()}
          onSubmit={onSubmit}
          onThumbnailChanged={(detail, message) => {
            queryClient.setQueryData(queryKeys.heritage(detail.id), detail);
            void queryClient.invalidateQueries({ queryKey: [...queryKeys.heritages, 'list'] });
            toast.success(message ?? MESSAGES.success('Chọn ảnh đại diện'));
          }}
          onOpenMediaTab={() => setTab('anh')}
        />
      </div>

      {tab !== 'thong-tin' && (
        <TabPanel idPrefix={TAB_PREFIX} id={tab}>
          {!heritage ? (
            <EmptyState icon="info" title="Lưu thông tin chung trước.">
              Sau khi lưu nháp, bạn thêm được ảnh, giai đoạn, sự kiện và nguồn tham chiếu cho di sản.
            </EmptyState>
          ) : tab === 'anh' ? (
            <MediaTab heritage={heritage} onChanged={refreshDetail} />
          ) : tab === 'dong-thoi-gian' ? (
            <TimelineTab heritage={heritage} onChanged={refreshDetail} />
          ) : (
            <ReferencesTab heritage={heritage} onChanged={refreshDetail} />
          )}
        </TabPanel>
      )}

      {heritage && (
        <HeritageActionDialog
          action={archiving ? { kind: 'archive', heritage: { id: heritage.id, name: heritage.name ?? '' } } : null}
          onDone={(_kind, message, detail) => {
            setArchiving(false);
            if (detail) adopt(detail);
            toast.success(message ?? MESSAGES.success('Ẩn di sản'));
          }}
          onFailed={(message) => {
            setArchiving(false);
            toast.error(message);
            refreshDetail();
          }}
          onClose={() => setArchiving(false)}
        />
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Rời khỏi trang"
        confirmLabel="Rời khỏi trang"
        cancelLabel="Ở lại"
        tone="danger"
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
      >
        Bạn có thay đổi chưa lưu ở tab Thông tin chung. Rời khỏi trang thì các thay đổi này sẽ mất.
      </ConfirmDialog>
    </AreaPage>
  );
}

function HeritageEditor({ id }: { id: number }) {
  const detail = useQuery({
    queryKey: queryKeys.heritage(id),
    queryFn: () => adminHeritagesApi.get(id).then((r) => r.data),
  });

  if (detail.isPending) {
    return (
      <AreaPage>
        <PageHeader title="Biên tập di sản" before={backLink} />
        <LoadingState rows={6} />
      </AreaPage>
    );
  }
  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <AreaPage>
        <PageHeader title="Biên tập di sản" before={backLink} />
        <ErrorState error={detail.error} onRetry={notFound ? undefined : () => void detail.refetch()} />
      </AreaPage>
    );
  }
  return <Workspace heritage={detail.data} />;
}

export default function HeritageEditorPage() {
  const { diSan } = useParams();
  if (diSan === undefined) return <Workspace key="moi" heritage={null} />;
  const id = Number(diSan);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <AreaPage>
        <PageHeader title="Biên tập di sản" before={backLink} />
        <InlineMessage tone="danger">{MESSAGES.blocked('xem di sản', 'Không tìm thấy di sản.')}</InlineMessage>
      </AreaPage>
    );
  }
  return <HeritageEditor key={id} id={id} />;
}
