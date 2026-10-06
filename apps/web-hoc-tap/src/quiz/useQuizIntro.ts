import { useQuery } from '@tanstack/react-query';
import { introQueryFn, introQueryKey } from './quizData';

/** Giới thiệu một bài kiểm tra: luôn hỏi lại máy chủ (việc em làm được thay đổi khi em bắt đầu hoặc nộp bài) và không giữ lại trong bộ nhớ. */
export function useQuizIntro(quizId: number) {
  return useQuery({ queryKey: introQueryKey(quizId), queryFn: introQueryFn(quizId), staleTime: 0, gcTime: 0 });
}
