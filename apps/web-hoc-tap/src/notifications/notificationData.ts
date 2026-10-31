import { studentApi } from '../lib/api/client';
import { lessonPath } from '../lessons/lessonData';
import { takeQuizPath } from '../quiz/quizData';
import type { StudentNotification } from '@dsvhvn/dung-chung/api';

// Thông báo của em: cùng một truy vấn cho nút chuông và trang Thông báo; tự làm mới mỗi phút để thấy bài thầy cô vừa giao.

export const notificationsQueryKey = ['student', 'notifications'] as const;
export const notificationsQueryFn = () => studentApi.notifications().then((r) => r.data);
export const NOTIFICATIONS_REFRESH_MS = 60_000;

/** Bấm thông báo: bài kiểm tra vào thẳng bài đó, bài học mở bài học. Không còn mã thì ở lại trang Thông báo. */
export function notificationTarget(item: StudentNotification): string | null {
  if (!item.lessonCode) return null;
  return item.quizId ? takeQuizPath(item.lessonCode, item.quizId) : lessonPath(item.lessonCode);
}
