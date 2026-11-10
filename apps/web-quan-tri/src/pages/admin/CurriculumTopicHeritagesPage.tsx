import { MESSAGES } from '@dsvhvn/dung-chung';
import { ApiError, errorMessage, type AdminCurriculumTopicHeritage, type HeritageSummary } from '@dsvhvn/dung-chung/api';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Pagination,
  SearchForm,
  Table,
  Td,
  TextLink,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useBlocker, useParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { HeritageStatusBadge } from '../../components/heritage/HeritageStatusBadge';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { adminCurriculumApi } from '../../lib/api/curriculumEndpoints';
import { adminHeritagesApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Di sản của chủ đề chương trình — quản trị hệ thống (trang con của Chủ đề chương trình). Danh sách di sản đang gắn với chủ đề (kể cả nháp và đã ẩn;
// giáo viên chỉ thấy di sản đã xuất bản), ô tìm di sản của kho để thêm, nút Bỏ cho từng dòng. Thay đổi giữ trên trang cho tới khi bấm Lưu; Lưu thay
// toàn bộ danh sách (tối đa 200 di sản). Rời trang khi còn thay đổi chưa lưu thì hỏi lại.

const MAX_HERITAGES = 200;
const SEARCH_PAGE_SIZE = 8;

const sameIds = (a: readonly AdminCurriculumTopicHeritage[], b: readonly AdminCurriculumTopicHeritage[]) =>
  a.length === b.length && a.every((item, index) => item.id === b[index]?.id);

const itemOf = (h: HeritageSummary): AdminCurriculumTopicHeritage => ({
  id: h.id,
  slug: h.slug,
  name: h.name,
  provinceName: h.provinceName,
  status: h.status,
});

export default function CurriculumTopicHeritagesPage() {
  const topicId = Number(useParams().chuDe);
  const validId = Number.isInteger(topicId) && topicId > 0;
  const toast = useToast();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: queryKeys.adminTopicHeritages(topicId),
    queryFn: () => adminCurriculumApi.heritages(topicId).then((r) => r.data),
    enabled: validId,
    gcTime: 0,
    staleTime: 0,
  });

  // Danh sách đang sửa; null là chưa đổi gì (đang dùng danh sách của máy chủ).
  const [draft, setDraft] = useState<AdminCurriculumTopicHeritage[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [searchPage, setSearchPage] = useState(1);

  const saved = detail.data?.items ?? [];
  const items = draft ?? saved;
  const dirty = draft !== null && !sameIds(draft, saved);
  const ids = new Set(items.map((i) => i.id));
  const full = items.length >= MAX_HERITAGES;

  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const search = useQuery({
    queryKey: queryKeys.heritageList({ keyword, page: searchPage, pageSize: SEARCH_PAGE_SIZE }),
    queryFn: () => adminHeritagesApi.list({ keyword, page: searchPage, pageSize: SEARCH_PAGE_SIZE }).then((r) => r.data),
    enabled: keyword.length >= 2,
    placeholderData: keepPreviousData,
  });

  const back = <TextLink to={pathOf('curriculumTopics')}>← Chủ đề chương trình</TextLink>;

  if (!validId || (detail.isError && detail.error instanceof ApiError && detail.error.status === 404)) {
    return (
      <AreaPage>
        <PageHeader title="Di sản của chủ đề" before={back} />
        <EmptyState icon="info" title="Không tìm thấy chủ đề.">
          Chủ đề không tồn tại hoặc đã bị xóa khỏi danh sách.
        </EmptyState>
      </AreaPage>
    );
  }
  if (detail.isPending) {
    return (
      <AreaPage>
        <PageHeader title="Di sản của chủ đề" before={back} />
        <LoadingState />
      </AreaPage>
    );
  }
  if (detail.isError) {
    return (
      <AreaPage>
        <PageHeader title="Di sản của chủ đề" before={back} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </AreaPage>
    );
  }

  const topic = detail.data.topic;
  const add = (heritage: HeritageSummary) => setDraft([...items, itemOf(heritage)]);
  const remove = (id: number) => setDraft(items.filter((i) => i.id !== id));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data, message } = await adminCurriculumApi.setHeritages(topic.id, items.map((i) => i.id));
      queryClient.setQueryData(queryKeys.adminTopicHeritages(topic.id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminTopics });
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherTopics });
      void queryClient.invalidateQueries({ queryKey: queryKeys.heritages });
      setDraft(null);
      toast.success(message ?? MESSAGES.success('Lưu danh sách di sản của chủ đề'));
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const results = search.data?.items ?? [];

  return (
    <AreaPage>
      <PageHeader
        title={topic.title}
        before={back}
        description={
          <>
            Khối {topic.grade} · {topic.subject} · {topic.groupTitle}
            {topic.description ? <span className="mt-1 block">{topic.description}</span> : null}
          </>
        }
        actions={
          <>
            <Button variant="secondary" disabled={!dirty || saving} onClick={() => setDraft(null)}>
              Hủy thay đổi
            </Button>
            <Button loading={saving} disabled={!dirty} onClick={() => void save()}>
              Lưu danh sách
            </Button>
          </>
        }
      />

      {saveError && <InlineMessage tone="danger">{saveError}</InlineMessage>}
      {topic.localProvince && (
        <InlineMessage tone="info">
          Đây là chủ đề theo tỉnh, thành phố của trường nên thường không gắn di sản cố định; giáo viên chọn di sản theo tỉnh của trường.
        </InlineMessage>
      )}
      {!topic.isActive && (
        <InlineMessage tone="warning">Chủ đề đã ngừng dùng nên giáo viên không thấy; danh sách di sản vẫn được giữ.</InlineMessage>
      )}

      <section aria-labelledby="di-san-cua-chu-de" className="flex flex-col gap-3">
        <h2 id="di-san-cua-chu-de" className="type-h3 text-on-surface">
          Di sản của chủ đề ({items.length})
        </h2>
        {items.length === 0 ? (
          <EmptyState icon="map-pin" title="Chủ đề chưa có di sản nào.">
            Tìm di sản ở phần bên dưới rồi bấm "Thêm"; nhớ bấm "Lưu danh sách" khi xong.
          </EmptyState>
        ) : (
          <Table caption="Di sản của chủ đề">
            <thead>
              <tr>
                <Th>Di sản</Th>
                <Th>Tỉnh, thành phố</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td className="max-w-[380px]">
                    <TextLink to={PATHS.heritage(item.id)}>{item.name}</TextLink>
                  </Td>
                  <Td>{item.provinceName}</Td>
                  <Td>
                    <HeritageStatusBadge status={item.status} />
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" aria-label={`Bỏ "${item.name}" khỏi chủ đề`} onClick={() => remove(item.id)}>
                        <Icon name="x" size={18} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section aria-labelledby="tim-them-di-san" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
        <h2 id="tim-them-di-san" className="type-h3 text-on-surface">
          Tìm thêm di sản
        </h2>
        <SearchForm
          label="Tìm di sản theo tên"
          placeholder="Nhập ít nhất 2 ký tự"
          value={keyword}
          onSearch={(value) => {
            setKeyword(value);
            setSearchPage(1);
          }}
        />
        {full && <InlineMessage tone="warning">Chủ đề đã đủ {MAX_HERITAGES} di sản, hãy bỏ bớt trước khi thêm.</InlineMessage>}
        {keyword.length < 2 ? (
          <p className="type-body-s text-on-surface-variant">Tìm theo tên di sản trong kho, kể cả di sản nháp hoặc đã ẩn.</p>
        ) : search.isPending ? (
          <LoadingState rows={2} />
        ) : search.isError ? (
          <ErrorState error={search.error} onRetry={() => void search.refetch()} />
        ) : results.length === 0 ? (
          <EmptyState icon="search" title={MESSAGES.noResults} />
        ) : (
          <div>
            <ul aria-label="Kết quả tìm di sản" className="flex flex-col divide-y divide-border">
              {results.map((heritage) => {
                const added = ids.has(heritage.id);
                return (
                  <li key={heritage.id} className="flex flex-wrap items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate type-label text-on-surface">{heritage.name}</span>
                      <span className="type-body-s text-on-surface-variant">{heritage.provinceName}</span>
                    </span>
                    <HeritageStatusBadge status={heritage.status} />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={added || full}
                      aria-label={added ? `"${heritage.name}" đã có trong chủ đề` : `Thêm "${heritage.name}" vào chủ đề`}
                      onClick={() => add(heritage)}
                    >
                      {added ? (
                        <>
                          <Icon name="check" size={16} />
                          Đã thêm
                        </>
                      ) : (
                        <>
                          <Icon name="plus" size={16} />
                          Thêm
                        </>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Pagination
              label="di sản"
              page={search.data.page}
              pageSize={search.data.pageSize}
              totalItems={search.data.totalItems}
              totalPages={search.data.totalPages}
              onChange={setSearchPage}
            />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Rời khỏi trang này?"
        confirmLabel="Rời đi"
        tone="danger"
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
      >
        Danh sách di sản của chủ đề còn thay đổi chưa lưu. Nếu rời đi, những thay đổi này sẽ mất.
      </ConfirmDialog>
    </AreaPage>
  );
}
