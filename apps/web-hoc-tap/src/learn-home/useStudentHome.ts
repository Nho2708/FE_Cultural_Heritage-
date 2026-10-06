import { useQuery } from '@tanstack/react-query';
import { homeQueryFn, homeQueryKey } from '../quiz/quizData';

/** Trang học của em: luôn lấy mới từ máy chủ mỗi lần mở trang (em vừa nộp bài hoặc thầy cô vừa mở bài kiểm tra mới). */
export function useStudentHome() {
  return useQuery({ queryKey: homeQueryKey, queryFn: homeQueryFn, staleTime: 0 });
}
