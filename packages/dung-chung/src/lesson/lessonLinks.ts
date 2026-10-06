import { createContext, useContext } from 'react';

// Đường dẫn mà bố cục bài học đặt vào các liên kết. Web học tập cung cấp đường dẫn thật; khi giáo viên xem trước "như học
// sinh" thì mọi đường dẫn là null: bố cục bỏ hẳn các liên kết đó (không mở trang công khai của di sản, không làm bài kiểm tra),
// không đặt tiêu đề trang và ghi chú các phần chỉ có ở học sinh.

export interface LessonLinks {
  /** Trang chi tiết di sản. */
  heritage: (slug: string) => string | null;
  /** Bản đồ mở sẵn thẻ của di sản. */
  map: (slug: string) => string | null;
  timeline: (slug: string) => string | null;
  /** Làm bài kiểm tra của bài. */
  quiz: (code: string, quizId: number) => string | null;
  /** Về trang học của em. */
  home: string | null;
  /** Đang xem trước: không ghi gì, không đặt tiêu đề trang. */
  preview: boolean;
}

export const NO_LESSON_LINKS: LessonLinks = {
  heritage: () => null,
  map: () => null,
  timeline: () => null,
  quiz: () => null,
  home: null,
  preview: true,
};

export const LessonLinksContext = createContext<LessonLinks>(NO_LESSON_LINKS);

export function useLessonLinks(): LessonLinks {
  return useContext(LessonLinksContext);
}
