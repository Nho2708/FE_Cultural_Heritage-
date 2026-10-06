import { formatDateTime, formatDuration, formatNumber } from '@dsvhvn/dung-chung';
import { ApiError } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, LoadingState, Modal } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/api/queryKeys';
import { statisticsApi } from '../../lib/api/statisticsEndpoints';
import { AttemptQuestionReview } from './AttemptQuestionReview';
import { BadgeChips, StarCount, StudentStatusBadge } from './StatBits';

// Chi tiết bài làm (hộp thoại) — giáo viên. Mở từ Kết quả bài kiểm tra (tab Từng học sinh) và Hồ sơ học tập của học sinh. Đầu hộp: học
// sinh, bài kiểm tra, điểm, thời gian, số sao (lớp cấp 1); rồi từng câu và huy hiệu đạt được của lượt này. Chỉ giáo viên phụ trách lớp xem được.

export function AttemptDetailDialog({ attemptId, onClose }: { attemptId: number; onClose: () => void }) {
  const detail = useQuery({
    queryKey: queryKeys.attemptDetail(attemptId),
    queryFn: () => statisticsApi.attempt(attemptId).then((r) => r.data),
  });
  const data = detail.data;
  const notFound = detail.error instanceof ApiError && detail.error.status === 404;

  return (
    <Modal
      open
      size="wide"
      title={data ? `${data.fullName ?? ''} · ${data.studentCode ?? ''}` : 'Chi tiết bài làm'}
      description={data ? `${data.quizName ?? ''} · Lớp ${data.className ?? ''} · Cấp ${data.level}` : undefined}
      onClose={onClose}
      footer={
        <>
          <p className="mr-auto type-body-s text-on-surface-variant">Chỉ giáo viên phụ trách lớp {data?.className ?? ''} xem được bài làm này.</p>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      {detail.isError ? (
        notFound ? (
          <EmptyState icon="info" title="Không tìm thấy bài làm.">
            Bài làm không tồn tại hoặc không thuộc lớp do thầy cô phụ trách.
          </EmptyState>
        ) : (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        )
      ) : !data ? (
        <LoadingState rows={3} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md bg-surface-container-low p-4">
            <div>
              <p className="type-label text-on-surface-variant">Điểm</p>
              <p className="type-h2 text-on-surface">
                {formatNumber(data.score)}/{formatNumber(data.totalPoint)}
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 type-body-s text-on-surface-variant">
              <p className="flex flex-wrap items-center gap-2">
                <StudentStatusBadge status={data.status === 'EXPIRED' ? 'EXPIRED' : 'SUBMITTED'} label={data.statusLabel} />
                {data.submittedAt && <span>Nộp lúc {formatDateTime(data.submittedAt)}</span>}
              </p>
              {data.durationSeconds !== null && <p>Thời gian làm {formatDuration(data.durationSeconds)}</p>}
              <p>
                Đúng {data.correctCount} / {data.totalQuestions} câu
              </p>
              {data.stars !== null && (
                <p className="flex flex-wrap items-center gap-2">
                  Em thấy: <StarCount stars={data.stars} /> và lời khen (học sinh lớp cấp 1 không thấy điểm số)
                </p>
              )}
            </div>
          </div>
          <ol className="flex flex-col gap-4">
            {data.questions.map((review, index) => (
              <li key={review.question.questionId}>
                <AttemptQuestionReview review={review} index={index} />
              </li>
            ))}
          </ol>
          {data.badges.length > 0 && (
            <section aria-label="Huy hiệu đạt được" className="rounded-md bg-warning-container p-4 text-on-warning-container">
              <h3 className="type-label">Huy hiệu đạt được</h3>
              <div className="mt-2">
                <BadgeChips badges={data.badges} />
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
