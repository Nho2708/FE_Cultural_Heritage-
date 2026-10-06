import { useQuery } from '@tanstack/react-query';
import { homeQueryFn, homeQueryKey } from './quizData';

/**
 * Mã bài học của một bài em đã mở (để làm liên kết "Xem lại bài học"). Lấy từ danh sách bài học của em ở trang học;
 * chưa biết thì trả null và nơi dùng đưa em về trang học.
 */
export function useLessonCode(lessonId: number | null | undefined, hint?: string | null): string | null {
  const home = useQuery({ queryKey: homeQueryKey, queryFn: homeQueryFn });
  if (hint) return hint;
  if (lessonId === null || lessonId === undefined) return null;
  return home.data?.myLessons.find((lesson) => lesson.lessonId === lessonId)?.accessCode ?? null;
}
