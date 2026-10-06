import type { StudentLesson, StudentQuiz, StudentSection } from '../api';

// Hàm thuần của bố cục bài học: tách đoạn văn, lọc phần theo loại, mốc thời gian, trạng thái bài kiểm tra.

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

export function quizActionLabel(quiz: StudentQuiz): string | null {
  if (quiz.state === 'OPEN') return 'Làm bài';
  if (quiz.state === 'IN_PROGRESS') return 'Làm tiếp';
  return null;
}
