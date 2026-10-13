import type { StudentLesson, StudentQuiz, StudentSection } from '../api';

// Hàm thuần của bố cục bài học: tách đoạn văn, lọc phần theo loại, mốc thời gian, trạng thái bài kiểm tra.

/** Tách văn bản thành các đoạn theo dòng trống hoặc xuống dòng. */
export function paragraphsOf(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n+/u)
    .map((p) => p.trim())
    .filter((p) => p !== '');
}

/**
 * Dòng ghi công của một hình. Máy chủ gửi `credit` đã ghép sẵn ("tác giả · giấy phép · nguồn") và tách thêm ba phần để màn hình
 * nào cần thì hiện riêng; chỉ nối thêm phần nào chưa có trong dòng ghép sẵn, không nối cả hai (sẽ lặp ghi công hai lần).
 */
export function imageCreditLine(
  image: { credit: string | null; author: string | null; license: string | null; source: string | null } | null | undefined,
): string {
  if (!image) return '';
  const composed = image.credit?.trim() ?? '';
  const missing = [image.author, image.license, image.source]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '' && !composed.includes(part));
  return [composed, ...missing].filter((part) => part !== '').join(' · ');
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

/** Nhãn nút của bài kiểm tra; bài chơi cấp 1 (`playful`) mời "Bắt đầu chơi" thay cho "Làm bài". */
export function quizActionLabel(quiz: StudentQuiz, playful = false): string | null {
  if (quiz.state === 'OPEN') return playful ? 'Bắt đầu chơi' : 'Làm bài';
  if (quiz.state === 'IN_PROGRESS') return 'Làm tiếp';
  if (quiz.state === 'SUBMITTED') return 'Xem kết quả';
  return null;
}
