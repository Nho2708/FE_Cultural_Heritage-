import { MESSAGES, QUIZ_STATUS_LABEL, QUIZ_STATUSES, formatDateTime, timeLimitLabel } from '@dsvhvn/dung-chung';
import { errorMessage, type QuizRow, type QuizStatus } from '@dsvhvn/dung-chung/api';
import {
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
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '../../access/screens';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { PlanNotice } from '../../components/lesson/LessonBits';
import { CreateQuizDialog } from '../../components/quiz/CreateQuizDialog';
import { QuizStatusBadge, SubmissionProgress } from '../../components/quiz/QuizBits';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { quizzesApi } from '../../lib/api/quizEndpoints';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Bài kiểm tra của tôi — giáo viên. Mọi bài kiểm tra thầy cô tạo: tên (kèm số câu và thời gian làm), bài học, lớp (của bài học), trạng
// thái (Nháp, Đang phát hành, Đã đóng), giờ mở và đóng, số đã nộp trên sĩ số. Lọc theo trạng thái, bài học, lớp và từ khóa; bộ lọc nằm
// trên URL. Thao tác trên dòng: sao chép = Nhân bản (bản Nháp mới trong cùng bài học, không chép giờ mở và đóng), ổ khóa = Đóng (hỏi
// xác nhận, không mở lại được), biểu đồ = Kết quả, bút = Soạn, thùng rác = Xóa bài Nháp. Bài kiểm tra không có mã riêng.
// Trường hết gói thì "Tạo bài kiểm tra" và "Nhân bản" bị khóa.

const STATUS_SLUG = slugMap<QuizStatus>({ DRAFT: 'nhap', PUBLISHED: 'dang-phat-hanh', CLOSED: 'da-dong' });
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...QUIZ_STATUSES.map((s) => ({ value: STATUS_SLUG.toSlug(s), label: QUIZ_STATUS_LABEL[s] })),
];

function summaryOf(total: number, rows: QuizRow[]) {
  const count = (status: QuizStatus) => rows.filter((r) => r.status === status).length;
  const parts = [`${total} bài kiểm tra${rows.length > 0 ? ` ở ${new Set(rows.map((r) => r.classId)).size} lớp` : ''}`];
  if (rows.length === total) parts.push(`${count('PUBLISHED')} đang phát hành`, `${count('DRAFT')} nháp`, `${count('CLOSED')} đã đóng`);
  return parts.join(' · ');
}

function openCloseOf(row: QuizRow) {
  if (row.status === 'DRAFT' && !row.openAt && !row.closeAt) {
    return (
      <>
        <span className="block">Chưa đặt giờ mở</span>
        <span className="block type-body-s text-on-surface-variant">Chưa đặt giờ đóng</span>
      </>
    );
  }
  return (
    <>
      <span className="block whitespace-nowrap type-mono-label">{row.openAt ? `Mở ${formatDateTime(row.openAt)}` : 'Chưa đặt giờ mở'}</span>
      <span className="block whitespace-nowrap type-mono-label text-on-surface-variant">{row.closeAt ? `Đóng ${formatDateTime(row.closeAt)}` : 'Chưa đặt giờ đóng'}</span>
    </>
  );
}

export default function QuizzesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const status = STATUS_SLUG.fromSlug(params.get('trang-thai'));
  const lessonParam = params.get('bai-hoc') ?? '';
  const classParam = params.get('lop') ?? '';
  const keyword = params.get('tu-khoa') ?? '';
  const filter = {
    status,
    lessonId: lessonParam ? Number(lessonParam) : ('' as const),
    classId: classParam ? Number(classParam) : ('' as const),
    keyword,
    page,
    pageSize: PAGE_SIZE,
  };

  const list = useQuery({
    queryKey: queryKeys.quizList(filter),
    queryFn: () => quizzesApi.list(filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const lessons = useQuery({
    queryKey: queryKeys.lessonList({ page: 1, pageSize: 100 }),
    queryFn: () => lessonsApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const classes = useQuery({
    queryKey: queryKeys.classList({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const quota = useQuery({ queryKey: queryKeys.aiQuota, queryFn: () => lessonsApi.aiQuota().then((r) => r.data) });
  const planLocked = quota.data?.hasEffectivePlan === false;

  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState<QuizRow | null>(null);
  const [deleting, setDeleting] = useState<QuizRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
  const rows = list.data?.items ?? [];
  const filtered = Boolean(status || lessonParam || classParam || keyword);

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

  const duplicate = async (row: QuizRow) => {
    try {
      const { data } = await quizzesApi.duplicate(row.id);
      toast.success(data.message);
      void refresh();
      void navigate(PATHS.quiz(data.quiz.id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <AreaPage>
      <PlanNotice quota={quota.data} />
      <PageHeader
        title="Bài kiểm tra"
        description={
          <>
            {list.data ? <p>{summaryOf(list.data.totalItems, rows)}</p> : null}
            <p className="mt-1 flex items-center gap-2 type-body-s">
              <Icon name="info" size={16} className="shrink-0" />
              Học sinh vào bài kiểm tra bằng mã bài học; bài kiểm tra không có mã riêng.
            </p>
          </>
        }
        actions={
          <Button onClick={() => setCreating(true)} disabled={planLocked}>
            <Icon name={planLocked ? 'lock' : 'plus'} size={16} />
            Tạo bài kiểm tra
          </Button>
        }
      />

      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
        <SelectField
          label="Trạng thái"
          value={STATUS_SLUG.toSlug(status)}
          options={STATUS_OPTIONS}
          onChange={(e) => update({ 'trang-thai': e.target.value })}
          containerClassName="dsvmd:w-52"
        />
        <SelectField
          label="Bài học"
          value={lessonParam}
          options={[
            { value: '', label: 'Tất cả bài học' },
            ...(lessons.data?.items ?? []).map((l) => ({ value: String(l.id), label: `${l.title ?? 'Bài học chưa có tiêu đề'} · lớp ${l.className}` })),
          ]}
          onChange={(e) => update({ 'bai-hoc': e.target.value })}
          containerClassName="dsvmd:w-72"
        />
        <SelectField
          label="Lớp"
          value={classParam}
          options={[{ value: '', label: 'Tất cả lớp' }, ...(classes.data?.items ?? []).map((c) => ({ value: String(c.id), label: `Lớp ${c.name}` }))]}
          onChange={(e) => update({ lop: e.target.value })}
          containerClassName="dsvmd:w-48"
        />
        <SearchForm key={keyword} label="Tìm theo tên" placeholder="Tên bài kiểm tra" value={keyword} onSearch={(v) => update({ 'tu-khoa': v })} />
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
              <Button variant="secondary" onClick={() => update({ 'trang-thai': null, 'bai-hoc': null, lop: null, 'tu-khoa': null })}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="file-text"
            title="Chưa có bài kiểm tra nào. Tạo bài kiểm tra từ một bài học của thầy cô, rồi thêm câu từ ngân hàng câu hỏi."
            action={
              <Button onClick={() => setCreating(true)} disabled={planLocked}>
                <Icon name="plus" size={16} />
                Tạo bài kiểm tra
              </Button>
            }
          />
        )
      ) : (
        <div>
          <Table caption="Bài kiểm tra của tôi" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Tên bài kiểm tra</Th>
                <Th>Bài học</Th>
                <Th>Lớp</Th>
                <Th>Trạng thái</Th>
                <Th>Giờ mở / đóng</Th>
                <Th>Đã nộp / sĩ số</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const name = row.name ?? 'Bài kiểm tra chưa có tên';
                const sent = row.status !== 'DRAFT';
                return (
                  <Tr key={row.id}>
                    <Td className="max-w-[300px]">
                      <TextLink to={PATHS.quiz(row.id)} className="font-medium">
                        {name}
                      </TextLink>
                      <p className="type-body-s text-on-surface-variant">
                        {row.questionCount} câu · {timeLimitLabel(row.timeLimitMinutes)}
                      </p>
                    </Td>
                    <Td className="max-w-[220px]">{row.lessonTitle}</Td>
                    <Td className="whitespace-nowrap">{row.className}</Td>
                    <Td>
                      <QuizStatusBadge status={row.status} openState={row.openState} openStateLabel={row.openStateLabel} />
                    </Td>
                    <Td>{openCloseOf(row)}</Td>
                    <Td>{sent ? <SubmissionProgress submitted={row.submittedCount} students={row.studentCount} /> : <Blank />}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {row.status === 'DRAFT' && (
                          <Button variant="ghost" size="icon" aria-label={`Soạn "${name}"`} onClick={() => void navigate(PATHS.quiz(row.id))}>
                            <Icon name="pencil" size={18} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={planLocked}
                          aria-label={`Nhân bản "${name}"`}
                          onClick={() => void duplicate(row)}
                        >
                          <Icon name={planLocked ? 'lock' : 'copy'} size={18} />
                        </Button>
                        {row.status === 'PUBLISHED' && (
                          <Button variant="ghost" size="icon" aria-label={`Đóng "${name}"`} onClick={() => setClosing(row)}>
                            <Icon name="lock" size={18} />
                          </Button>
                        )}
                        {sent && (
                          <Button variant="ghost" size="icon" aria-label={`Kết quả "${name}"`} onClick={() => void navigate(PATHS.quizResults(row.id))}>
                            <Icon name="bar-chart" size={18} />
                          </Button>
                        )}
                        {row.status === 'DRAFT' && (
                          <Button variant="ghost" size="icon" aria-label={`Xóa "${name}"`} onClick={() => setDeleting(row)}>
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
            label="bài kiểm tra"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}
      <p className="type-body-s text-on-surface-variant">
        Thao tác trên dòng: sao chép — Nhân bản (bản Nháp mới trong cùng bài học, không chép giờ mở, đóng); ổ khóa — Đóng (hỏi xác nhận, không mở
        lại được); biểu đồ — Kết quả; bút — Soạn; thùng rác — Xóa bài Nháp. Bấm tên để mở trang soạn.
      </p>

      {creating && (
        <CreateQuizDialog
          onCreated={(quiz, message) => {
            setCreating(false);
            toast.success(message ?? MESSAGES.success('Tạo bài kiểm tra'));
            void refresh();
            void navigate(PATHS.quiz(quiz.id));
          }}
          onClose={() => setCreating(false)}
        />
      )}
      <ConfirmDialog
        open={closing !== null}
        title={`Đóng bài kiểm tra "${closing?.name ?? ''}"?`}
        confirmLabel="Đóng bài kiểm tra"
        tone="danger"
        confirming={busy}
        onConfirm={() => closing && void run(() => quizzesApi.close(closing.id).then((r) => ({ message: r.data.message })), MESSAGES.success('Đóng bài kiểm tra'), () => setClosing(null))}
        onClose={() => setClosing(null)}
      >
        Sau khi đóng, học sinh lớp {closing?.className} không vào làm được nữa và bài kiểm tra không mở lại được. Lượt đang làm dở được tự nộp theo
        các câu đã lưu. Hiện {closing?.submittedCount}/{closing?.studentCount} em đã nộp.
      </ConfirmDialog>
      <ConfirmDialog
        open={deleting !== null}
        title="Xóa bài kiểm tra"
        confirmLabel="Xóa"
        tone="danger"
        confirming={busy}
        onConfirm={() => deleting && void run(() => quizzesApi.remove(deleting.id), MESSAGES.success('Xóa bài kiểm tra'), () => setDeleting(null))}
        onClose={() => setDeleting(null)}
      >
        <p>{MESSAGES.confirm('xóa bài kiểm tra', deleting?.name ?? '')}</p>
        <p className="mt-2 type-body-s">Chỉ xóa được bài Nháp. Các câu hỏi trong bài vẫn ở ngân hàng câu hỏi.</p>
      </ConfirmDialog>
    </AreaPage>
  );
}
