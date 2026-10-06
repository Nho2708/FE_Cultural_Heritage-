import { createContext, useContext, type ComponentType } from 'react';

// Đường dẫn và hộp thoại mà bố cục bài học đặt vào các liên kết, nút. Web học tập cung cấp đường dẫn thật và hộp thoại bắt đầu
// làm bài kiểm tra; khi giáo viên xem trước "như học sinh" thì mọi đường dẫn là null và không có hộp thoại: bố cục bỏ hẳn các
// liên kết, nút đó (không mở trang công khai của di sản, không làm bài kiểm tra), không đặt tiêu đề trang và ghi chú các phần
// chỉ có ở học sinh.

/** Hộp thoại mở từ nút của một bài kiểm tra trong bài học: bắt đầu làm, làm tiếp hoặc xem kết quả. */
export interface LessonQuizDialogProps {
  /** Bài kiểm tra đang mở hộp thoại; null là đóng. */
  quizId: number | null;
  name: string | null;
  /** Mã bài học, để quay lại bài sau khi làm. */
  code: string;
  onClose: () => void;
}

export interface LessonLinks {
  /** Trang chi tiết di sản. */
  heritage: (slug: string) => string | null;
  /** Bản đồ mở sẵn thẻ của di sản. */
  map: (slug: string) => string | null;
  timeline: (slug: string) => string | null;
  /** Hộp thoại bắt đầu làm bài kiểm tra của bài; null thì không có nút làm bài. */
  quizDialog: ComponentType<LessonQuizDialogProps> | null;
  /** Về trang học của em. */
  home: string | null;
  /** Đang xem trước: không ghi gì, không đặt tiêu đề trang. */
  preview: boolean;
}

export const NO_LESSON_LINKS: LessonLinks = {
  heritage: () => null,
  map: () => null,
  timeline: () => null,
  quizDialog: null,
  home: null,
  preview: true,
};

export const LessonLinksContext = createContext<LessonLinks>(NO_LESSON_LINKS);

export function useLessonLinks(): LessonLinks {
  return useContext(LessonLinksContext);
}
