import { MESSAGES, formatCount } from '@dsvhvn/dung-chung';
import type { LessonLibraryItem, LessonLibrarySort } from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  SearchForm,
  SelectField,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '../../access/screens';
import { LibraryPreviewDialog } from '../../components/lesson/LibraryPreviewDialog';
import { PlanNotice } from '../../components/lesson/LessonBits';
import { sampleNoticeOf } from '../../components/lesson/sampleNotice';
import { UseSampleDialog } from '../../components/lesson/UseSampleDialog';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { HeritageSelect } from '../../components/question/QuestionPickers';
import { fileUrl } from '../../lib/fileUrl';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { lessonLibraryApi } from '../../lib/api/libraryEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Thư viện bài mẫu — giáo viên. Bài hay của giáo viên các trường, đã được quản trị hệ thống duyệt: thầy cô xem trước rồi dùng cho lớp của
// mình để khỏi soạn từ đầu. Lọc theo cấp, khối, di sản, từ khóa; sắp xếp Mới nhất hoặc Dùng nhiều. Thẻ bài hiện tiêu đề, cấp và khối, di sản,
// trích tóm tắt, số phần, số bài kiểm tra, người soạn và trường, số lượt dùng, nhãn "Bài của tôi". "Xem trước" mở bài như học sinh thấy (chỉ đọc);
// "Dùng cho lớp…" tạo bài Nháp mới ở lớp đã chọn (chép kèm bài kiểm tra được) rồi chuyển tới trang Soạn bài học của bài mới.
// Bộ lọc nằm trên URL. Trường hết gói thì nút "Dùng cho lớp…" bị khóa.

const SORT_SLUG = slugMap<LessonLibrarySort>({ newest: 'moi-nhat', popular: 'dung-nhieu' });
const SORT_OPTIONS = [
  { value: '', label: 'Mới nhất' },
  { value: 'dung-nhieu', label: 'Dùng nhiều' },
];
const LEVEL_OPTIONS = [{ value: '', label: 'Tất cả cấp' }, ...[1, 2, 3].map((l) => ({ value: String(l), label: `Cấp ${l}` }))];
const GRADE_OPTIONS = [{ value: '', label: 'Tất cả khối' }, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Khối ${i + 1}` }))];

function SampleCard({ item, onPreview, onUse, planLocked }: { item: LessonLibraryItem; onPreview: () => void; onUse: () => void; planLocked: boolean }) {
  const title = item.title ?? 'Bài học chưa có tiêu đề';
  return (
    <li className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4" aria-label={title}>
      <div className="flex flex-wrap items-start gap-2">
        <h2 className="min-w-0 flex-1 type-h4 text-on-surface">{title}</h2>
        {item.isMine && <Badge tone="success">Bài của tôi</Badge>}
      </div>
      <p className="type-body-s text-on-surface-variant">
        Cấp {item.schoolLevel} · Khối {item.grade}
      </p>
      {item.heritages.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Di sản của bài">
          {item.heritages.map((h) => (
            <li key={h.id} className="flex items-center gap-3">
              {h.thumbnailUrl ? (
                <img src={fileUrl(h.thumbnailUrl) ?? h.thumbnailUrl} alt="" className="size-10 shrink-0 rounded-xs object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-image-placeholder text-on-surface-variant">
                  <Icon name="book-open" size={18} />
                </span>
              )}
              <span className="min-w-0 truncate type-label text-on-surface">{h.name}</span>
            </li>
          ))}
        </ul>
      )}
      {item.summaryExcerpt && <p className="type-body-s text-on-surface">{item.summaryExcerpt}</p>}
      <p className="type-body-s text-on-surface-variant">
        {item.sectionCount} phần · {item.quizCount} bài kiểm tra · {formatCount(item.useCount)} lượt dùng
      </p>
      <p className="type-body-s text-on-surface-variant">
        Người soạn: {item.authorName ?? 'Giáo viên'}
        {item.schoolName ? ` · ${item.schoolName}` : ''}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button variant="secondary" size="sm" aria-label={`Xem trước "${title}"`} onClick={onPreview}>
          <Icon name="eye" size={16} />
          Xem trước
        </Button>
        <Button size="sm" disabled={planLocked} aria-label={`Dùng "${title}" cho lớp`} onClick={onUse}>
          <Icon name={planLocked ? 'lock' : 'copy'} size={16} />
          Dùng cho lớp…
        </Button>
      </div>
    </li>
  );
}

export default function LessonLibraryPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const level = params.get('cap') ?? '';
  const grade = params.get('khoi') ?? '';
  const heritageParam = params.get('di-san') ?? '';
  const heritageName = params.get('ten-di-san') ?? '';
  const keyword = params.get('tu-khoa') ?? '';
  const sort = SORT_SLUG.fromSlug(params.get('sap-xep')) || 'newest';
  const filter = {
    level: level ? Number(level) : ('' as const),
    grade: grade ? Number(grade) : ('' as const),
    heritageId: heritageParam ? Number(heritageParam) : ('' as const),
    keyword,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const list = useQuery({
    queryKey: queryKeys.lessonLibraryList(filter),
    queryFn: () => lessonLibraryApi.list(filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const quota = useQuery({ queryKey: queryKeys.aiQuota, queryFn: () => lessonsApi.aiQuota().then((r) => r.data) });
  const planLocked = quota.data?.hasEffectivePlan === false;

  const [previewing, setPreviewing] = useState<LessonLibraryItem | null>(null);
  const [using, setUsing] = useState<LessonLibraryItem | null>(null);

  const rows = list.data?.items ?? [];
  const filtered = Boolean(level || grade || heritageParam || keyword);
  const clearAll = () => update({ cap: null, khoi: null, 'di-san': null, 'ten-di-san': null, 'tu-khoa': null });

  return (
    <AreaPage>
      <PlanNotice quota={quota.data} />
      <PageHeader
        title="Thư viện bài mẫu"
        description={
          list.data
            ? `${list.data.totalItems} bài mẫu đã được quản trị hệ thống duyệt. Xem trước rồi dùng cho lớp của thầy cô để khỏi soạn từ đầu; bài mới là bản nháp để thầy cô sửa tiếp.`
            : 'Bài hay của giáo viên các trường đã được quản trị hệ thống duyệt.'
        }
      />

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-3">
          <SelectField label="Cấp" value={level} options={LEVEL_OPTIONS} onChange={(e) => update({ cap: e.target.value })} />
          <SelectField label="Khối" value={grade} options={GRADE_OPTIONS} onChange={(e) => update({ khoi: e.target.value })} />
          <SelectField
            label="Sắp xếp"
            value={sort === 'newest' ? '' : SORT_SLUG.toSlug(sort)}
            options={SORT_OPTIONS}
            onChange={(e) => update({ 'sap-xep': e.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <HeritageSelect
            heritageId={heritageParam ? Number(heritageParam) : null}
            heritageName={heritageName}
            label="Lọc theo di sản"
            onChange={(id, name) => update({ 'di-san': String(id), 'ten-di-san': name })}
          />
          {heritageParam && (
            <Button variant="ghost" size="sm" onClick={() => update({ 'di-san': null, 'ten-di-san': null })}>
              <Icon name="x" size={16} />
              Bỏ lọc di sản
            </Button>
          )}
        </div>
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
              <Button variant="secondary" onClick={clearAll}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="cards" title="Thư viện chưa có bài mẫu nào.">
            Bài mẫu xuất hiện sau khi giáo viên đề xuất bài đã xuất bản của mình và quản trị hệ thống duyệt.
          </EmptyState>
        )
      ) : (
        <div>
          <ul aria-label="Bài mẫu" className="grid gap-4 dsvmd:grid-cols-2 dsvxl:grid-cols-3" aria-busy={list.isFetching}>
            {rows.map((item) => (
              <SampleCard key={item.id} item={item} planLocked={planLocked} onPreview={() => setPreviewing(item)} onUse={() => setUsing(item)} />
            ))}
          </ul>
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

      {previewing && (
        <LibraryPreviewDialog
          title={`Xem trước bài mẫu: ${previewing.title ?? ''}`}
          queryKey={queryKeys.lessonLibraryDetail(previewing.id)}
          load={() =>
            lessonLibraryApi.get(previewing.id).then(({ data }) => ({
              lesson: data.lesson,
              quizzes: data.quizzes,
              authorName: data.item.authorName,
              schoolName: data.item.schoolName,
            }))
          }
          onClose={() => setPreviewing(null)}
          footer={
            <>
              <Button
                disabled={planLocked}
                onClick={() => {
                  setUsing(previewing);
                  setPreviewing(null);
                }}
              >
                <Icon name={planLocked ? 'lock' : 'copy'} size={16} />
                Dùng cho lớp…
              </Button>
            </>
          }
        />
      )}
      {using && (
        <UseSampleDialog
          item={using}
          onClose={() => setUsing(null)}
          onDone={(result) => {
            setUsing(null);
            toast.success(result.message);
            void queryClient.invalidateQueries({ queryKey: queryKeys.lessons });
            void queryClient.invalidateQueries({ queryKey: queryKeys.lessonLibrary });
            void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
            void navigate(PATHS.lesson(result.lesson.id), { state: { sampleNotice: sampleNoticeOf(result) } });
          }}
        />
      )}
    </AreaPage>
  );
}
