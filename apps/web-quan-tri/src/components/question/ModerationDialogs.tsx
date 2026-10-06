import { MESSAGES, questionRateLabel } from '@dsvhvn/dung-chung';
import { errorMessage, type QuestionQualityRow } from '@dsvhvn/dung-chung/api';
import { Badge, Button, ErrorState, Icon, InlineMessage, LoadingState, Modal, TextAreaField, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminQuestionsApi } from '../../lib/api/overviewEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { DifficultyBadge, LevelRangeBadge, ReviewStatusBadge } from './QuestionBits';
import { QuestionReadOnlyView } from './QuestionReadOnlyView';

// Hộp thoại của màn hình Kiểm duyệt ngân hàng câu hỏi: xem câu chỉ đọc (kèm đáp án và chất lượng), xác nhận ẩn câu, xác nhận hiện lại câu.
// Lý do (tùy chọn) vào nhật ký thao tác của quản trị hệ thống; câu bị ẩn không chọn được vào bài kiểm tra mới, bài đã phát hành giữ nguyên.

export type ModerationAction = 'hide' | 'restore';

const MAX_REASON = 500;

const COPY = {
  hide: {
    title: (content: string) => `Bạn có chắc muốn ẩn câu hỏi "${content}"?`,
    description: 'Câu hỏi không còn chọn được vào bài kiểm tra mới và không nhân bản được. Bài kiểm tra đã phát hành và kết quả cũ giữ nguyên.',
    confirm: 'Ẩn câu',
    tone: 'danger' as const,
    success: 'Ẩn câu hỏi',
  },
  restore: {
    title: (content: string) => `Hiện lại câu hỏi "${content}"?`,
    description: 'Câu hỏi về trạng thái đã duyệt: giáo viên các trường thấy lại trong ngân hàng và chọn được vào bài kiểm tra mới.',
    confirm: 'Hiện lại câu',
    tone: 'primary' as const,
    success: 'Hiện lại câu hỏi',
  },
};

/** Hộp xác nhận ẩn hoặc hiện lại một câu, kèm ô lý do tùy chọn. */
export function ModerationConfirmDialog({
  action,
  questionId,
  content,
  onClose,
  onDone,
}: {
  action: ModerationAction;
  questionId: number;
  content: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const copy = COPY[action];
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const call = action === 'hide' ? adminQuestionsApi.hide : adminQuestionsApi.restore;
      const { message } = await call(questionId, reason.trim() || null);
      toast.success(message ?? MESSAGES.success(copy.success));
      void queryClient.invalidateQueries({ queryKey: queryKeys.moderation });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const short = content.length > 80 ? `${content.slice(0, 80)}…` : content;
  return (
    <Modal
      open
      title={copy.title(short)}
      description={copy.description}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button variant={copy.tone} onClick={() => void confirm()} loading={busy}>
            {copy.confirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <InlineMessage tone="danger">{error}</InlineMessage>}
        <TextAreaField
          label="Lý do (không bắt buộc)"
          hint="Ghi vào nhật ký thao tác để người sau biết vì sao."
          rows={3}
          maxLength={MAX_REASON}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/** Xem câu chỉ đọc: đáp án đúng, giải thích, số lượt trả lời và tỉ lệ đúng; nút ẩn hoặc hiện lại tùy trạng thái. */
export function ModerationDetailDialog({
  row,
  minAnswers,
  lowCorrectPercent,
  onClose,
  onAction,
}: {
  row: QuestionQualityRow;
  minAnswers: number;
  lowCorrectPercent: number;
  onClose: () => void;
  onAction: (action: ModerationAction) => void;
}) {
  const question = row.question;
  const detail = useQuery({
    queryKey: queryKeys.moderationDetail(question.id),
    queryFn: () => adminQuestionsApi.get(question.id).then((r) => r.data),
    gcTime: 0,
  });
  const hidden = question.isHidden;
  const access = detail.data?.access;
  const canHide = access?.canHide ?? !hidden;
  const canRestore = access?.canRestore ?? hidden;

  return (
    <Modal
      open
      size="wide"
      title="Câu hỏi"
      description={
        <span className="flex flex-wrap items-center gap-2">
          <ReviewStatusBadge status={question.reviewStatus} hidden={hidden} />
          <Badge>Chỉ đọc</Badge>
          <span>
            {question.typeName} · {question.heritageName}
          </span>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          {hidden
            ? canRestore && (
                <Button onClick={() => onAction('restore')}>
                  <Icon name="refresh" size={16} />
                  Hiện lại câu
                </Button>
              )
            : canHide && (
                <Button variant="danger" onClick={() => onAction('hide')}>
                  Ẩn câu
                </Button>
              )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 type-body-s">
          <dt className="text-on-surface-variant">Người tạo</dt>
          <dd className="text-on-surface">
            {question.creatorName}
            {question.organizationName ? `, ${question.organizationName}` : ''}
          </dd>
          <dt className="text-on-surface-variant">Cấp và độ khó</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <LevelRangeBadge min={question.levelMin} max={question.levelMax} />
            <DifficultyBadge value={question.difficultyLevel} />
          </dd>
          <dt className="text-on-surface-variant">Đang dùng</dt>
          <dd className="text-on-surface">{question.quizCount} bài kiểm tra</dd>
          <dt className="text-on-surface-variant">Kết quả làm bài</dt>
          <dd className="text-on-surface" data-testid="chat-luong">
            {row.answered === 0
              ? 'Chưa có lượt trả lời.'
              : `${row.answered} lượt trả lời, ${row.correct} lượt đúng hoàn toàn (${questionRateLabel(row.correctRatePercent)}).`}
          </dd>
        </dl>
        {row.lowQuality && (
          <InlineMessage tone="warning">
            Câu này cần xem lại: có ít nhất {minAnswers} lượt trả lời mà tỉ lệ đúng dưới {lowCorrectPercent}%. Kiểm tra đáp án và lời câu trước khi quyết định ẩn.
          </InlineMessage>
        )}
        {detail.isPending ? (
          <LoadingState rows={3} />
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        ) : (
          <QuestionReadOnlyView detail={detail.data} />
        )}
      </div>
    </Modal>
  );
}
