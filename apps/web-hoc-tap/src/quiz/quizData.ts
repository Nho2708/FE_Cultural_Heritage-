import type { QueryClient } from '@tanstack/react-query';
import { pathOf } from '../access/screens';
import { studentApi } from '../lib/api/client';

// Khóa truy vấn, đường dẫn và hàm lấy dữ liệu của khu làm bài: trang học, giới thiệu bài kiểm tra, kết quả, lịch sử, tiến độ.

export const homeQueryKey = ['student', 'home'] as const;
export const progressQueryKey = ['student', 'progress'] as const;
export const historyQueryKey = ['student', 'history'] as const;
export const introQueryKey = (quizId: number) => ['student', 'quiz-intro', quizId] as const;
export const resultQueryKey = (attemptId: number) => ['student', 'result', attemptId] as const;
export const albumQueryKey = ['student', 'album'] as const;

export const homeQueryFn = () => studentApi.home().then((r) => r.data);
export const progressQueryFn = () => studentApi.progress().then((r) => r.data);
export const historyQueryFn = (page: number, pageSize: number) => () => studentApi.history(page, pageSize).then((r) => r.data);
export const introQueryFn = (quizId: number) => () => studentApi.quizIntro(quizId).then((r) => r.data);
export const resultQueryFn = (attemptId: number) => () => studentApi.result(attemptId).then((r) => r.data);
export const albumQueryFn = () => studentApi.album().then((r) => r.data);

export const resultPath = (attemptId: number) => pathOf('result').replace(':luotLam', String(attemptId));

/** Đường dẫn làm bài kiểm tra của một bài học (mã bài học đã chuẩn hóa). */
export const takeQuizPath = (code: string, quizId: number) =>
  pathOf('takeQuiz').replace(':maBaiHoc', encodeURIComponent(code)).replace(':baiKiemTra', String(quizId));

/** Sau khi nộp bài: trang học, tiến độ, lịch sử, album và giới thiệu bài kiểm tra đều đã cũ. */
export function refreshAfterSubmit(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: homeQueryKey });
  void queryClient.invalidateQueries({ queryKey: progressQueryKey });
  void queryClient.invalidateQueries({ queryKey: historyQueryKey });
  void queryClient.invalidateQueries({ queryKey: albumQueryKey });
  void queryClient.invalidateQueries({ queryKey: ['student', 'lesson'] });
  void queryClient.invalidateQueries({ queryKey: ['student', 'recommendations'] });
  queryClient.removeQueries({ queryKey: ['student', 'quiz-intro'] });
}

/** Số của bài kiểm tra trên đường dẫn, hoặc null nếu không phải số nguyên dương. */
export function parseQuizId(text: string | undefined): number | null {
  const n = Number(text);
  return text !== undefined && Number.isInteger(n) && n > 0 ? n : null;
}
