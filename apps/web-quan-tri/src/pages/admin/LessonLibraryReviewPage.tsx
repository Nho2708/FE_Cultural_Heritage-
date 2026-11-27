import { LESSON_SAMPLE_STATUS_LABEL, MESSAGES, formatCount, formatDate } from '@dsvhvn/dung-chung';
import type { AdminLessonLibraryRow, LessonSampleStatus } from '@dsvhvn/dung-chung/api';
import { Badge, Button, EmptyState, ErrorState, Icon, LoadingState, Pagination, SearchForm, SelectField, Table, Td, Th, Tabs, Tr } from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { LibraryPreviewDialog } from '../../components/lesson/LibraryPreviewDialog';
import { SampleReviewDialog, type SampleReviewAction } from '../../components/lesson/SampleReviewDialogs';
import { adminLessonLibraryApi } from '../../lib/api/libraryEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Thư viện bài mẫu — quản trị hệ thống. Ba tab: Chờ duyệt, Trong thư viện, Đã từ chối (kèm bài bị gỡ). Mỗi dòng: bài và di sản, người soạn và
// trường, cấp và khối, ngày đề xuất, (ngày duyệt, số lượt dùng, lý do). Xem trước bài như học sinh thấy (chỉ đọc), Duyệt, Từ chối (bài chờ duyệt),
// Gỡ khỏi thư viện (bài đang ở thư viện). Từ chối và gỡ bắt buộc nhập lý do. Bộ lọc và tab nằm trên URL.

type TabId = 'cho-duyet' | 'trong-thu-vien' | 'da-tu-choi';
const TAB_STATUS: Record<TabId, LessonSampleStatus> = { 'cho-duyet': 'PENDING', 'trong-thu-vien': 'APPROVED', 'da-tu-choi': 'REJECTED' };
const TAB_ITEMS = [
  { id: 'cho-duyet' as const, label: 'Chờ duyệt' },
  { id: 'trong-thu-vien' as const, label: 'Trong thư viện' },
  { id: 'da-tu-choi' as const, label: 'Đã từ chối' },
];
const TAB_SLUG = slugMap<LessonSampleStatus>({ PENDING: 'cho-duyet', APPROVED: 'trong-thu-vien', REJECTED: 'da-tu-choi' });
const LEVEL_OPTIONS = [{ value: '', label: 'Tất cả cấp' }, ...[1, 2, 3].map((l) => ({ value: String(l), label: `Cấp ${l}` }))];
const EMPTY: Record<TabId, string> = {
  'cho-duyet': 'Không có bài mẫu nào đang chờ duyệt.',
  'trong-thu-vien': 'Thư viện chưa có bài mẫu nào.',
  'da-tu-choi': 'Chưa có bài mẫu nào bị từ chối hoặc gỡ.',
};

type DialogState = { kind: 'preview'; row: AdminLessonLibraryRow } | { kind: 'review'; action: SampleReviewAction; row: AdminLessonLibraryRow } | null;

export default function LessonLibraryReviewPage() {
  const { params, update, page } = useListParams();
  const tab = (TAB_SLUG.fromSlug(params.get('tab')) ? params.get('tab') : 'cho-duyet') as TabId;
  const status = TAB_STATUS[tab];
  const level = params.get('cap') ?? '';
  const keyword = params.get('tu-khoa') ?? '';
  const query = { status, level: level ? Number(level) : ('' as const), keyword, page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: queryKeys.adminLessonLibraryList(query),
    queryFn: () => adminLessonLibraryApi.list(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const [dialog, setDialog] = useState<DialogState>(null);
  const rows = list.data?.items ?? [];
  const filtered = Boolean(level || keyword);

  const reviewButtons = (row: AdminLessonLibraryRow, label: (verb: string) => string) => (
    <>
      <Button variant="ghost" size="icon" aria-label={label('Xem trước')} onClick={() => setDialog({ kind: 'preview', row })}>
        <Icon name="eye" size={18} />
      </Button>
      {row.status === 'PENDING' && (
        <>
          <Button variant="ghost" size="icon" aria-label={label('Duyệt')} onClick={() => setDialog({ kind: 'review', action: 'approve', row })}>
            <Icon name="check" size={18} />
          </Button>
          <Button variant="ghost" size="icon" aria-label={label('Từ chối')} onClick={() => setDialog({ kind: 'review', action: 'reject', row })}>
            <Icon name="x" size={18} />
          </Button>
        </>
      )}
      {row.status === 'APPROVED' && (
        <Button variant="ghost" size="icon" aria-label={label('Gỡ khỏi thư viện')} onClick={() => setDialog({ kind: 'review', action: 'remove', row })}>
          <Icon name="eye-off" size={18} />
        </Button>
      )}
    </>
  );

  return (
    <AreaPage>
      <PageHeader
        title="Thư viện bài mẫu"
        description={
          list.data
            ? `${list.data.totalItems} bài ở tab ${TAB_ITEMS.find((t) => t.id === tab)?.label.toLocaleLowerCase('vi-VN')}. Xem trước bài rồi duyệt; bài được duyệt vào thư viện dùng chung cho giáo viên mọi trường.`
            : 'Duyệt bài giáo viên đề xuất vào thư viện dùng chung cho giáo viên mọi trường.'
        }
      />

      <Tabs
        idPrefix="thu-vien"
        label="Thư viện bài mẫu"
        items={TAB_ITEMS}
        value={tab}
        onChange={(next) => update({ tab: next === 'cho-duyet' ? null : next })}
      />

      <div id={`thu-vien-panel-${tab}`} role="tabpanel" aria-labelledby={`thu-vien-tab-${tab}`} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
          <SelectField label="Cấp" value={level} options={LEVEL_OPTIONS} onChange={(e) => update({ cap: e.target.value })} containerClassName="dsvmd:w-48" />
          <SearchForm key={keyword} label="Tìm theo tiêu đề" placeholder="Tiêu đề bài mẫu" value={keyword} onSearch={(v) => update({ 'tu-khoa': v })} />
        </div>

        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon="search"
              title={MESSAGES.noResults}
              action={
                <Button variant="secondary" onClick={() => update({ cap: null, 'tu-khoa': null })}>
                  Bỏ bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState icon="cards" title={EMPTY[tab]} />
          )
        ) : (
          <div>
            <Table caption={`Bài mẫu: ${TAB_ITEMS.find((t) => t.id === tab)?.label}`} busy={list.isFetching}>
              <thead>
                <tr>
                  <Th>Bài mẫu và di sản</Th>
                  <Th>Người soạn và trường</Th>
                  <Th>Cấp và khối</Th>
                  <Th>Ngày đề xuất</Th>
                  {tab === 'trong-thu-vien' && <Th>Ngày duyệt</Th>}
                  {tab === 'trong-thu-vien' && <Th>Lượt dùng</Th>}
                  {tab === 'da-tu-choi' && <Th>Lý do</Th>}
                  <Th className="text-right">Hành động</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const title = row.title ?? 'Bài học chưa có tiêu đề';
                  const names = row.heritages.map((h) => h.name).filter(Boolean);
                  return (
                    <Tr key={row.id}>
                      <Td className="max-w-[360px]">
                        <button type="button" className="text-left font-medium text-link hover:underline" onClick={() => setDialog({ kind: 'preview', row })}>
                          {title}
                        </button>
                        <p className="type-body-s text-on-surface-variant">{names.join(', ')}</p>
                      </Td>
                      <Td>
                        <span className="block">{row.authorName}</span>
                        <span className="block type-body-s text-on-surface-variant">{row.schoolName}</span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        Cấp {row.schoolLevel} · Khối {row.grade}
                      </Td>
                      <Td className="type-mono-label whitespace-nowrap">{formatDate(row.requestedAt)}</Td>
                      {tab === 'trong-thu-vien' && <Td className="type-mono-label whitespace-nowrap">{formatDate(row.reviewedAt)}</Td>}
                      {tab === 'trong-thu-vien' && <Td className="tabular-nums">{formatCount(row.useCount)}</Td>}
                      {tab === 'da-tu-choi' && (
                        <Td className="max-w-[320px]">
                          <Badge tone="danger">{LESSON_SAMPLE_STATUS_LABEL.REJECTED}</Badge>
                          <p className="mt-1 type-body-s text-on-surface">{row.note}</p>
                        </Td>
                      )}
                      <Td>
                        <div className="flex justify-end gap-1">{reviewButtons(row, (verb) => `${verb} "${title}"`)}</div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              label="bài mẫu"
              page={list.data.page}
              pageSize={list.data.pageSize}
              totalItems={list.data.totalItems}
              totalPages={list.data.totalPages}
              onChange={(next) => update({ trang: next })}
            />
          </div>
        )}
      </div>

      {dialog?.kind === 'preview' && (
        <LibraryPreviewDialog
          title={`Xem trước bài mẫu: ${dialog.row.title ?? ''}`}
          queryKey={queryKeys.adminLessonLibraryDetail(dialog.row.id)}
          load={() =>
            adminLessonLibraryApi.get(dialog.row.id).then(({ data }) => ({
              lesson: data.lesson,
              quizzes: data.quizzes,
              authorName: data.item.authorName,
              schoolName: data.item.schoolName,
            }))
          }
          onClose={() => setDialog(null)}
          footer={
            <>
              {dialog.row.status === 'PENDING' && (
                <>
                  <Button variant="secondary" onClick={() => setDialog({ kind: 'review', action: 'reject', row: dialog.row })}>
                    Từ chối
                  </Button>
                  <Button onClick={() => setDialog({ kind: 'review', action: 'approve', row: dialog.row })}>
                    <Icon name="check" size={16} />
                    Duyệt
                  </Button>
                </>
              )}
              {dialog.row.status === 'APPROVED' && (
                <Button variant="secondary" onClick={() => setDialog({ kind: 'review', action: 'remove', row: dialog.row })}>
                  Gỡ khỏi thư viện
                </Button>
              )}
            </>
          }
        />
      )}
      {dialog?.kind === 'review' && (
        <SampleReviewDialog key={`${dialog.action}-${dialog.row.id}`} action={dialog.action} row={dialog.row} onClose={() => setDialog(null)} onDone={() => setDialog(null)} />
      )}
    </AreaPage>
  );
}
