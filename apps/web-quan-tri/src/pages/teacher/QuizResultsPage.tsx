import { errorMessage, ApiError } from '@dsvhvn/dung-chung/api';
import { Button, ButtonLink, ConfirmDialog, EmptyState, ErrorState, Icon, LoadingState, TabPanel, Tabs, TextLink, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { QuizStatusBadge } from '../../components/quiz/QuizBits';
import { AttemptDetailDialog } from '../../components/statistics/AttemptDetailDialog';
import { OverviewTab, QuestionsTab, StudentsTab } from '../../components/statistics/QuizResultTabs';
import { QuizSuggestions } from '../../components/statistics/SuggestionsPanel';
import { queryKeys } from '../../lib/api/queryKeys';
import { quizzesApi } from '../../lib/api/quizEndpoints';
import { statisticsApi } from '../../lib/api/statisticsEndpoints';

// Kết quả bài kiểm tra (nhiều tab) — giáo viên. Đầu trang: tên bài, trạng thái, lớp, cấp, sĩ số; "Đóng bài kiểm tra" khi bài đang phát hành.
// Tab Tổng quan (điểm trung bình, cao nhất, thấp nhất, đã nộp, phổ điểm), Từng câu (tỉ lệ đúng, phương án chọn nhiều nhất, lỗi hay gặp),
// Từng học sinh (trạng thái, điểm, thời gian; mở Chi tiết bài làm), Gợi ý (di sản nên ôn và di sản liên quan, tạo bài ôn tập).
// Tab đang mở nằm trên URL (?tab=).

const TABS = [
  { id: 'tong-quan', label: 'Tổng quan' },
  { id: 'tung-cau', label: 'Từng câu' },
  { id: 'tung-hoc-sinh', label: 'Từng học sinh' },
  { id: 'goi-y', label: 'Gợi ý' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const PREFIX = 'ket-qua-bai-kiem-tra';

export default function QuizResultsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const quizId = Number(useParams().baiKiemTra);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: TabId = TABS.find((t) => t.id === searchParams.get('tab'))?.id ?? 'tong-quan';
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const valid = Number.isInteger(quizId) && quizId > 0;
  const overview = useQuery({
    queryKey: queryKeys.quizOverview(quizId),
    queryFn: () => statisticsApi.quizOverview(quizId).then((r) => r.data),
    enabled: valid,
  });

  const setTab = (next: TabId) => setSearchParams(next === 'tong-quan' ? new URLSearchParams() : new URLSearchParams({ tab: next }), { replace: true });
  const back = <TextLink to={pathOf('quizzes')}>← Bài kiểm tra của tôi</TextLink>;

  if (overview.isPending && overview.fetchStatus !== 'idle') {
    return (
      <AreaPage>
        <PageHeader title="Kết quả bài kiểm tra" before={back} />
        <LoadingState />
      </AreaPage>
    );
  }
  if (overview.isError || !overview.data) {
    const notFound = !valid || (overview.error instanceof ApiError && overview.error.status === 404);
    return (
      <AreaPage>
        <PageHeader title="Kết quả bài kiểm tra" before={back} />
        {notFound ? (
          <EmptyState icon="info" title="Không tìm thấy bài kiểm tra." action={<Button variant="secondary" onClick={() => history.back()}>Quay lại</Button>}>
            Bài kiểm tra không tồn tại, đã bị xóa hoặc không phải bài do thầy cô tạo.
          </EmptyState>
        ) : (
          <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
        )}
      </AreaPage>
    );
  }

  const quiz = overview.data;
  const name = quiz.name ?? 'Bài kiểm tra chưa có tên';

  const close = async () => {
    setClosing(true);
    try {
      const { data } = await quizzesApi.close(quizId);
      toast.success(data.message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.statistics });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setClosing(false);
      setConfirmingClose(false);
    }
  };

  return (
    <AreaPage>
      <PageHeader
        before={back}
        title={name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <QuizStatusBadge status={quiz.status} />
            <span>
              Bài học: <TextLink to={PATHS.lesson(quiz.lessonId)}>{quiz.lessonTitle}</TextLink>
            </span>
            <span>
              Lớp {quiz.className} · Cấp {quiz.level} · {quiz.enrolled} học sinh · {quiz.questionCount} câu
            </span>
          </span>
        }
        actions={
          <>
            <ButtonLink to={PATHS.quiz(quizId)} variant="secondary">
              <Icon name="pencil" size={16} />
              Mở bài kiểm tra
            </ButtonLink>
            {quiz.status === 'PUBLISHED' && (
              <Button variant="danger" onClick={() => setConfirmingClose(true)} disabled={closing}>
                <Icon name="lock" size={16} />
                Đóng bài kiểm tra
              </Button>
            )}
          </>
        }
      />

      <Tabs idPrefix={PREFIX} label="Kết quả bài kiểm tra" items={TABS} value={tab} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id={tab}>
        {tab === 'tong-quan' ? (
          <OverviewTab quizId={quizId} />
        ) : tab === 'tung-cau' ? (
          <QuestionsTab quizId={quizId} />
        ) : tab === 'tung-hoc-sinh' ? (
          <StudentsTab quizId={quizId} onOpenAttempt={setAttemptId} />
        ) : (
          <QuizSuggestions quizId={quizId} classId={quiz.classId} className={quiz.className} />
        )}
      </TabPanel>

      {attemptId !== null && <AttemptDetailDialog attemptId={attemptId} onClose={() => setAttemptId(null)} />}
      <ConfirmDialog
        open={confirmingClose}
        title={`Đóng bài kiểm tra "${name}"?`}
        confirmLabel="Đóng bài kiểm tra"
        tone="danger"
        confirming={closing}
        onConfirm={() => void close()}
        onClose={() => setConfirmingClose(false)}
      >
        Sau khi đóng, học sinh lớp {quiz.className} không vào làm được nữa và bài kiểm tra không mở lại được. Lượt đang làm dở được tự nộp theo
        các câu đã lưu. Hiện {quiz.finished}/{quiz.enrolled} em đã nộp.
      </ConfirmDialog>
    </AreaPage>
  );
}
