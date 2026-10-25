import { LessonLinksProvider, LessonThemeScope, LessonView, NO_LESSON_LINKS, SpeechNotice } from '@dsvhvn/dung-chung/lesson';
import { ErrorState, InlineMessage, LoadingState, Modal } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// "Xem như học sinh" (giáo viên, màn hình Soạn bài học): bài học đúng bố cục, khung và dữ liệu mà học sinh của lớp thấy, vẽ bằng
// chính các thành phần bố cục cấp 1, 2, 3 của web học tập và bộ giao diện của cấp đó. Chỉ đọc: không có liên kết sang trang công
// khai của di sản, không làm bài kiểm tra, không ghi kết quả hay tiến độ. Xem được cả bài Nháp, chưa có mã.

interface Props {
  lessonId: number;
  open: boolean;
  onClose: () => void;
}

export function StudentPreviewDialog({ lessonId, open, onClose }: Props) {
  // Luôn lấy bản mới: bài vừa lưu phải hiện đúng, không giữ lại bản xem trước cũ.
  const preview = useQuery({
    queryKey: queryKeys.lessonPreview(lessonId),
    queryFn: () => lessonsApi.previewAsStudent(lessonId).then((r) => r.data),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });
  const lesson = preview.data?.lesson;

  return (
    <Modal open={open} size="full" title="Xem như học sinh" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {lesson && (
          <InlineMessage tone="info">
            Bạn đang xem bài như học sinh lớp {lesson.className} ({lesson.schoolLevelName}). Đây chỉ là bản xem trước: không lưu kết quả,
            không tính lượt làm bài.
            {lesson.quizzes.length > 0 ? ' Bài kiểm tra chỉ hiện để xem; học sinh làm bài ở web học tập.' : ''}
            {preview.data?.status === 'DRAFT' ? ' Bài chưa xuất bản nên chưa có mã bài học.' : ''}
          </InlineMessage>
        )}
        {preview.isPending && open && <LoadingState rows={4} />}
        {preview.isError && <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />}
        {lesson && (
          <LessonThemeScope level={lesson.schoolLevel}>
            <LessonLinksProvider links={NO_LESSON_LINKS}>
              <LessonView lesson={lesson} />
              <SpeechNotice />
            </LessonLinksProvider>
          </LessonThemeScope>
        )}
      </div>
    </Modal>
  );
}
