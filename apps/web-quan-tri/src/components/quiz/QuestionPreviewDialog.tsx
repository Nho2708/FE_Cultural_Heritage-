import { formatPoints } from '@dsvhvn/dung-chung';
import { Button, ErrorState, Icon, LoadingState, Modal } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { questionsApi } from '../../lib/api/questionEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { QuestionPreviewCard } from '../question/QuestionBits';

// Xem trước như học sinh (hộp thoại): từng câu hiện đúng bố cục của cấp lớp làm bài, không có đáp án đúng, không chấm. Mở từ biểu
// tượng con mắt ở danh sách câu của bài kiểm tra và ở hộp chọn câu (xem một câu); nút "Xem trước" của bài mở cả bài và bấm Câu trước,
// Câu sau để duyệt từng câu. Câu không còn dùng được ở cấp của lớp báo lỗi của máy chủ ngay trong khung.

export interface PreviewItem {
  questionId: number;
  /** Điểm của câu trong bài (không có khi xem câu từ ngân hàng). */
  point?: number;
}

interface QuestionPreviewDialogProps {
  heading: string;
  items: PreviewItem[];
  startIndex?: number;
  /** Cấp của lớp làm bài, quyết định bố cục câu. */
  level: number;
  onClose: () => void;
}

export function QuestionPreviewDialog({ heading, items, startIndex = 0, level, onClose }: QuestionPreviewDialogProps) {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)));
  const current = items[index];
  const preview = useQuery({
    queryKey: queryKeys.questionPreview(current?.questionId ?? 0, level),
    queryFn: () => questionsApi.preview(current!.questionId, level).then((r) => r.data),
    enabled: current !== undefined,
  });

  return (
    <Modal
      open
      title={heading}
      description={`Như học sinh lớp cấp ${level} thấy: không hiện đáp án đúng, không chấm điểm.`}
      size="panel"
      onClose={onClose}
      footer={
        <>
          {items.length > 1 && (
            <>
              <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                <Icon name="chevron-left" size={16} />
                Câu trước
              </Button>
              <Button variant="secondary" disabled={index >= items.length - 1} onClick={() => setIndex(index + 1)}>
                Câu sau
                <Icon name="chevron-right" size={16} />
              </Button>
            </>
          )}
          <Button onClick={onClose}>Đóng</Button>
        </>
      }
    >
      {items.length > 1 && (
        <p className="mb-3 type-label text-on-surface" aria-live="polite">
          Câu {index + 1}/{items.length}
          {current?.point !== undefined && ` · ${formatPoints(current.point)}`}
        </p>
      )}
      {preview.isPending ? (
        <LoadingState rows={3} />
      ) : preview.isError ? (
        <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
      ) : (
        <QuestionPreviewCard preview={preview.data} />
      )}
    </Modal>
  );
}
