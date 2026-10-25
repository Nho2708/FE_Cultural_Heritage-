import { createContext, useContext, type ComponentType } from 'react';
import type { LessonCompletion, StudentRecall } from '../api';

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
  /** Trang Album di sản của em (cấp 1); không có thì bỏ nút "Xem album". */
  album?: string | null;
  /** Cấp 1: lấy câu ôn của bước Nhớ lại; không có (xem trước) thì bỏ bước này, không gọi máy chủ. */
  recall?: ((code: string) => Promise<StudentRecall>) | null;
  /** Cấp 1: ghi em đã học xong bài khi tới bước Nhận thẻ; không có (xem trước) thì chỉ hiện thẻ mẫu. */
  completeLesson?: ((code: string) => Promise<LessonCompletion>) | null;
}

export const NO_LESSON_LINKS: LessonLinks = {
  heritage: () => null,
  map: () => null,
  timeline: () => null,
  quizDialog: null,
  home: null,
  preview: true,
  album: null,
  recall: null,
  completeLesson: null,
};

export const LessonLinksContext = createContext<LessonLinks>(NO_LESSON_LINKS);

export function useLessonLinks(): LessonLinks {
  return useContext(LessonLinksContext);
}
