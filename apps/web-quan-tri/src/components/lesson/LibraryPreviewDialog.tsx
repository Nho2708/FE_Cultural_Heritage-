import { ErrorState, InlineMessage, LoadingState, Modal } from '@dsvhvn/dung-chung/ui';
import type { LessonLibraryQuiz, StudentLesson } from '@dsvhvn/dung-chung/api';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { StudentLessonPreviewView } from './StudentPreviewDialog';

// Xem trước một bài mẫu của thư viện (giáo viên và quản trị hệ thống): bài đúng bố cục, khung và bộ giao diện của cấp như học sinh thấy
// (cùng thành phần xem bài của "Xem như học sinh"), chỉ đọc, kèm người soạn, trường và các bài kiểm tra đi kèm. Nút hành động (Dùng cho lớp,
// Duyệt, Từ chối...) do trang gọi đặt ở chân hộp thoại.

export interface LibraryPreviewData {
  lesson: StudentLesson;
  quizzes: LessonLibraryQuiz[];
  authorName: string | null;
  schoolName: string | null;
}

interface Props {
  title: string;
  queryKey: readonly unknown[];
  load: () => Promise<LibraryPreviewData>;
  footer?: ReactNode;
  onClose: () => void;
}

export function LibraryPreviewDialog({ title, queryKey, load, footer, onClose }: Props) {
  // Luôn lấy bản mới: bài mẫu có thể vừa được sửa hoặc gỡ.
  const preview = useQuery({ queryKey, queryFn: load, staleTime: 0, gcTime: 0 });
  const data = preview.data;

  return (
    <Modal open size="full" title={title} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-4">
        {data && (
          <InlineMessage tone="info">
            {`Bài của ${data.authorName ?? 'giáo viên'}${data.schoolName ? `, ${data.schoolName}` : ''}. Đây là bản xem trước đúng như học sinh thấy: chỉ đọc, không lưu kết quả.`}
            {data.quizzes.length > 0
              ? ` Bài có ${data.quizzes.length} bài kiểm tra: ${data.quizzes.map((q) => `${q.title ?? 'Bài kiểm tra'} (${q.questionCount} câu)`).join('; ')}.`
              : ' Bài chưa có bài kiểm tra.'}
          </InlineMessage>
        )}
        {preview.isPending && <LoadingState rows={4} />}
        {preview.isError && <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />}
        {data && <StudentLessonPreviewView lesson={data.lesson} />}
      </div>
    </Modal>
  );
}
