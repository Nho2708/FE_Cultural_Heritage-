import { DIFFICULTIES, DIFFICULTY_LABEL, HERITAGE_TYPE_LABEL, LESSON_STATUS_LABEL, MESSAGES } from '@dsvhvn/dung-chung';
import { errorMessage, type ContentStatus, type HeritageType, type LessonRow, type QuestionDifficulty } from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Blank,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  SearchForm,
  SelectField,
  Table,
  Td,
  TextLink,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { formatDate } from '@dsvhvn/dung-chung';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '../../access/screens';
import { CreateLessonDialog } from '../../components/lesson/CreateLessonDialog';
import { DuplicateLessonDialog } from '../../components/lesson/DuplicateLessonDialog';
import { CodeDisplay, LessonStatusBadge, PlanNotice } from '../../components/lesson/LessonBits';
import { LessonCodeDialog, type CodeTarget } from '../../components/lesson/LessonCodeDialog';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Bài học của tôi — giáo viên. Mọi bài học của thầy cô ở các lớp: tiêu đề và di sản, lớp, trạng thái, mã bài học (chỉ bài đã
// xuất bản), số bài kiểm tra, ngày sửa. Lọc theo lớp, trạng thái, loại di sản và từ khóa; bộ lọc nằm trên URL. Thao tác trên
// dòng: bàn phím = Mã bài học (chỉ bài đã xuất bản), sao chép = Nhân bản sang lớp khác (chép kèm bài kiểm tra được), bút = Soạn, hộp = Lưu
// trữ (hỏi xác nhận), thùng rác = Xóa bài nháp chưa có bài kiểm tra. Cột và bộ lọc Độ khó: độ khó của bài tính từ các câu trong các bài
// kiểm tra của bài (không nhập tay); bài chưa có bài kiểm tra ghi "Chưa có bài kiểm tra" và không khớp mức nào. Trường hết gói thì nút
// "Tạo bài học" và "Nhân bản" bị khóa.

const STATUS_SLUG = slugMap<ContentStatus>({ DRAFT: 'nhap', PUBLISHED: 'da-xuat-ban', ARCHIVED: 'luu-tru' });
const TYPE_SLUG = slugMap<HeritageType>({
  TANGIBLE: 'vat-the',
  INTANGIBLE: 'phi-vat-the',
  NATURAL: 'thien-nhien',
  MIXED: 'hon-hop',
  DOCUMENTARY: 'tu-lieu',
});

const DIFFICULTY_SLUG = slugMap<QuestionDifficulty>({ EASY: 'de', MEDIUM: 'trung-binh', HARD: 'kho' });
const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Tất cả mức' },
  ...DIFFICULTIES.map((d) => ({ value: DIFFICULTY_SLUG.toSlug(d), label: DIFFICULTY_LABEL[d] })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...(Object.keys(LESSON_STATUS_LABEL) as ContentStatus[]).map((s) => ({ value: STATUS_SLUG.toSlug(s), label: LESSON_STATUS_LABEL[s] })),
];
const TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại di sản' },
  ...(Object.keys(HERITAGE_TYPE_LABEL) as HeritageType[]).map((t) => ({ value: TYPE_SLUG.toSlug(t), label: HERITAGE_TYPE_LABEL[t] })),
];

function heritageSummary(row: LessonRow): string {
  const names = row.heritages.map((h) => h.name).filter(Boolean);
  if (names.length === 0) return '';
  return names.length === 1 ? names[0]! : `${names[0]} +${names.length - 1} di sản`;
}

function summaryOf(total: number, rows: LessonRow[], classCount: number) {
  const count = (status: ContentStatus) => rows.filter((r) => r.status === status).length;
  const parts = [`${total} bài học${classCount > 0 ? ` ở ${classCount} lớp` : ''}`];
  if (rows.length === total) {
    parts.push(`${count('PUBLISHED')} đã xuất bản`, `${count('DRAFT')} nháp`, `${count('ARCHIVED')} lưu trữ`);
  }
  return parts.join(' · ');
}

export default function LessonsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const classParam = params.get('lop') ?? '';
  const status = STATUS_SLUG.fromSlug(params.get('trang-thai'));
  const heritageType = TYPE_SLUG.fromSlug(params.get('loai'));
  const difficulty = DIFFICULTY_SLUG.fromSlug(params.get('do-kho'));
  const keyword = params.get('tu-khoa') ?? '';
  const filter = { classId: classParam ? Number(classParam) : ('' as const), status, heritageType, difficulty, keyword, page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: queryKeys.lessonList(filter),
    queryFn: () => lessonsApi.list(filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const classes = useQuery({
    queryKey: queryKeys.classList({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const quota = useQuery({ queryKey: queryKeys.aiQuota, queryFn: () => lessonsApi.aiQuota().then((r) => r.data) });
  const planLocked = quota.data?.hasEffectivePlan === false;

  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState<CodeTarget | null>(null);
  const [copying, setCopying] = useState<LessonRow | null>(null);
  const [archiving, setArchiving] = useState<LessonRow | null>(null);
  const [deleting, setDeleting] = useState<LessonRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.lessons });

  const run = async (action: () => Promise<{ message: string | null }>, fallback: string, done: () => void) => {
    setBusy(true);
    try {
      const { message } = await action();
      toast.success(message ?? fallback);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      done();
      void refresh();
    }
  };

  const rows = list.data?.items ?? [];
  const filtered = Boolean(classParam || status || heritageType || difficulty || keyword);
  const classOptions = [
    { value: '', label: 'Tất cả lớp' },
    ...(classes.data?.items ?? []).map((c) => ({ value: String(c.id), label: `Lớp ${c.name}` })),
  ];

  return (
    <AreaPage>
      <PlanNotice quota={quota.data} />
      <PageHeader
        title="Bài học"
        description={list.data ? summaryOf(list.data.totalItems, rows, new Set(rows.map((r) => r.classId)).size) : undefined}
        actions={
          <Button onClick={() => setCreating(true)} disabled={planLocked} aria-label="Tạo bài học">
            <Icon name={planLocked ? 'lock' : 'plus'} size={16} />
            Tạo bài học
          </Button>
        }
      />

      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
        <SelectField
          label="Lớp"
          value={classParam}
          options={classOptions}
          onChange={(e) => update({ lop: e.target.value })}
          containerClassName="dsvmd:w-48"
        />
        <SelectField
          label="Trạng thái"
          value={STATUS_SLUG.toSlug(status)}
          options={STATUS_OPTIONS}
          onChange={(e) => update({ 'trang-thai': e.target.value })}
          containerClassName="dsvmd:w-52"
        />
        <SelectField
          label="Loại di sản"
          value={TYPE_SLUG.toSlug(heritageType)}
          options={TYPE_OPTIONS}
          onChange={(e) => update({ loai: e.target.value })}
          containerClassName="dsvmd:w-52"
        />
        <SelectField
          label="Độ khó"
          value={DIFFICULTY_SLUG.toSlug(difficulty)}
          options={DIFFICULTY_OPTIONS}
          onChange={(e) => update({ 'do-kho': e.target.value })}
          containerClassName="dsvmd:w-44"
        />
        <SearchForm key={keyword} label="Tìm theo tiêu đề" placeholder="Tiêu đề bài học" value={keyword} onSearch={(v) => update({ 'tu-khoa': v })} />
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
              <Button variant="secondary" onClick={() => update({ lop: null, 'trang-thai': null, loai: null, 'do-kho': null, 'tu-khoa': null })}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="book-open" title="Thầy cô chưa có bài học nào.">
            Bấm "Tạo bài học", chọn một lớp và các di sản; AI soạn bản nháp đúng cấp của lớp để thầy cô sửa và xuất bản.
          </EmptyState>
        )
      ) : (
        <div>
          <Table caption="Bài học của tôi" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Bài học và di sản</Th>
                <Th>Lớp</Th>
                <Th>Trạng thái</Th>
                <Th>Mã bài học</Th>
                <Th>Bài kiểm tra</Th>
                <Th>Độ khó</Th>
                <Th>Ngày sửa</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const title = row.title ?? 'Bài học chưa có tiêu đề';
                return (
                  <Tr key={row.id}>
                    <Td>
                      <TextLink to={PATHS.lesson(row.id)} className="font-medium">
                        {title}
                      </TextLink>
                      <p className="type-body-s text-on-surface-variant">{heritageSummary(row)}</p>
                    </Td>
                    <Td className="whitespace-nowrap">{row.className}</Td>
                    <Td>
                      <LessonStatusBadge status={row.status} />
                    </Td>
                    <Td>{row.accessCode ? <CodeDisplay code={row.accessCode} className="type-mono-label" /> : <Blank />}</Td>
                    <Td className="type-mono-label">{row.quizCount}</Td>
                    <Td className="whitespace-nowrap">
                      {row.difficulty ? row.difficultyLabel : <Badge>{row.difficultyLabel || 'Chưa có bài kiểm tra'}</Badge>}
                    </Td>
                    <Td className="type-mono-label whitespace-nowrap">{formatDate(row.updatedAt ?? row.createdAt)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {row.status === 'PUBLISHED' && row.accessCode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Mã bài học "${title}"`}
                            onClick={() =>
                              setCode({
                                title: row.title,
                                className: row.className,
                                accessCode: row.accessCode!,
                                notify: row.status === 'PUBLISHED' ? (message) => lessonsApi.notifyClass(row.id, message) : undefined,
                              })
                            }
                          >
                            <Icon name="keyboard" size={18} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={planLocked}
                          aria-label={`Nhân bản "${title}" sang lớp khác`}
                          onClick={() => setCopying(row)}
                        >
                          <Icon name={planLocked ? 'lock' : 'copy'} size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Soạn "${title}"`} onClick={() => void navigate(PATHS.lesson(row.id))}>
                          <Icon name="pencil" size={18} />
                        </Button>
                        {row.status === 'PUBLISHED' && (
                          <Button variant="ghost" size="icon" aria-label={`Lưu trữ "${title}"`} onClick={() => setArchiving(row)}>
                            <Icon name="archive" size={18} />
                          </Button>
                        )}
                        {row.quizCount === 0 && (
                          <Button variant="ghost" size="icon" aria-label={`Xóa "${title}"`} onClick={() => setDeleting(row)}>
                            <Icon name="trash" size={18} />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <Pagination
            label="bài học"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}
      <p className="type-body-s text-on-surface-variant">
        Thao tác trên dòng: bàn phím — Mã bài học (chỉ bài đã xuất bản); sao chép — Nhân bản sang lớp khác; bút — Soạn; hộp — Lưu trữ (hỏi xác
        nhận); thùng rác — Xóa bài chưa có bài kiểm tra. Độ khó suy từ câu hỏi trong các bài kiểm tra của bài, không nhập tay.
      </p>

      {creating && (
        <CreateLessonDialog
          onCreated={(lesson, message) => {
            setCreating(false);
            toast.success(message ?? MESSAGES.success('Tạo bài học'));
            void refresh();
            void navigate(PATHS.lesson(lesson.id));
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {code && <LessonCodeDialog target={code} onClose={() => setCode(null)} />}
      {copying && (
        <DuplicateLessonDialog
          source={{
            id: copying.id,
            title: copying.title,
            classId: copying.classId,
            className: copying.className,
            schoolLevel: copying.schoolLevel,
            heritageCount: copying.heritages.length,
            quizCount: copying.quizCount,
            isPublished: copying.status === 'PUBLISHED',
          }}
          onDone={(result) => {
            setCopying(null);
            toast.success(result.message);
            void refresh();
            void navigate(PATHS.lesson(result.lesson.id));
          }}
          onClose={() => setCopying(null)}
        />
      )}
      <ConfirmDialog
        open={archiving !== null}
        title={`Lưu trữ bài học "${archiving?.title ?? ''}"?`}
        confirmLabel="Lưu trữ"
        confirming={busy}
        onConfirm={() => archiving && void run(() => lessonsApi.archive(archiving.id), MESSAGES.success('Lưu trữ bài học'), () => setArchiving(null))}
        onClose={() => setArchiving(null)}
      >
        Bạn có chắc muốn lưu trữ bài học này? Học sinh lớp {archiving?.className} không mở được bài học bằng mã nữa; kết quả các bài đã làm vẫn được giữ.
      </ConfirmDialog>
      <ConfirmDialog
        open={deleting !== null}
        title="Xóa bài học"
        confirmLabel="Xóa"
        tone="danger"
        confirming={busy}
        onConfirm={() => deleting && void run(() => lessonsApi.remove(deleting.id), MESSAGES.success('Xóa bài học'), () => setDeleting(null))}
        onClose={() => setDeleting(null)}
      >
        <p>{MESSAGES.confirm('xóa bài học', deleting?.title ?? '')}</p>
        <p className="mt-2 type-body-s">Xóa bài học là xóa mềm. Mã bài học của bài đã xóa không được cấp lại.</p>
      </ConfirmDialog>
    </AreaPage>
  );
}
