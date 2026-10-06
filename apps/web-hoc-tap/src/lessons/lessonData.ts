import type { StudentLesson, StudentQuiz, StudentSection } from '@dsvhvn/dung-chung/api';
import { pathOf } from '../access/screens';
import { studentApi } from '../lib/api/client';

// Dữ liệu và hàm thuần của khu Bài học của học sinh: mở bài bằng mã, đường dẫn, tách đoạn văn, lọc phần theo loại.

export const lessonQueryKey = (code: string) => ['student', 'lesson', code] as const;

/** Mở bài bằng mã đã chuẩn hóa. Mã sai / chưa xuất bản / không thuộc lớp của em đều là cùng một câu 404. */
export const lessonQueryFn = (code: string) => () => studentApi.lessonByCode(code).then((r) => r.data);

export const lessonPath = (code: string) => `${pathOf('lesson').replace(':maBaiHoc', '')}${encodeURIComponent(code)}`;

/** Tách văn bản thành các đoạn theo dòng trống hoặc xuống dòng. */
export function paragraphsOf(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n+/u)
    .map((p) => p.trim())
    .filter((p) => p !== '');
}

export const sectionsOf = (lesson: StudentLesson, ...types: StudentSection['type'][]): StudentSection[] =>
  lesson.sections.filter((s) => types.includes(s.type)).sort((a, b) => a.sortOrder - b.sortOrder);

/** Mốc thời gian theo thứ tự năm. */
export const milestonesOf = (lesson: StudentLesson): StudentSection[] =>
  sectionsOf(lesson, 'MILESTONE').sort((a, b) => (a.milestoneYear ?? 0) - (b.milestoneYear ?? 0));

/** Bài kiểm tra em làm được ngay: đang mở hoặc em đang làm dở. */
export const canTakeQuiz = (quiz: StudentQuiz) => quiz.state === 'OPEN' || quiz.state === 'IN_PROGRESS';

/** Bài kiểm tra có nút mở hộp thoại: làm được ngay, hoặc đã nộp (xem kết quả). */
export const canOpenQuiz = (quiz: StudentQuiz) => canTakeQuiz(quiz) || quiz.state === 'SUBMITTED';

export function quizActionLabel(quiz: StudentQuiz): string | null {
  if (quiz.state === 'OPEN') return 'Làm bài';
  if (quiz.state === 'IN_PROGRESS') return 'Làm tiếp';
  if (quiz.state === 'SUBMITTED') return 'Xem kết quả';
  return null;
}
