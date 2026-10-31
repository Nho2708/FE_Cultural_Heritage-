import type { ContentStatus } from './api/heritage';
import type { LessonLength, LessonSectionType } from './api/lessons';
import { normalizeCode } from './validation/studentCode';

// Quy tắc và nhãn của bài học dùng chung cho giáo viên (soạn) và học sinh (mở bằng mã). Mã bài học: tiền tố "BH" + 6 ký
// tự lấy từ bảng 32 ký tự (chữ số 2-9, chữ in hoa A-Z bỏ O và I), ví dụ BH7F3K2Q. Người dùng gõ "bh 7f3-k2q" vẫn đúng:
// bỏ khoảng trắng và dấu gạch, đổi chữ hoa. Máy chủ chuẩn hóa lại, không dựa vào giao diện. Mã bài kiểm tra cùng cách viết với tiền tố "KT":
// em gõ ở cùng ô nhập mã để vào thẳng bài kiểm tra.

export const LESSON_CODE_PATTERN = /^BH[2-9A-HJ-NP-Z]{6}$/;
export const QUIZ_CODE_PATTERN = /^KT[2-9A-HJ-NP-Z]{6}$/;

/** Mã người dùng gõ → dạng gửi lên máy chủ. */
export function normalizeLessonCode(value: string): string {
  return normalizeCode(value);
}

export function isWellFormedLessonCode(value: string): boolean {
  return LESSON_CODE_PATTERN.test(normalizeLessonCode(value));
}

/** Mã bài học hoặc mã bài kiểm tra: hai loại mã em gõ được ở ô nhập mã. */
export function isWellFormedAccessCode(value: string): boolean {
  const normalized = normalizeLessonCode(value);
  return LESSON_CODE_PATTERN.test(normalized) || QUIZ_CODE_PATTERN.test(normalized);
}

/** BH7F3K2Q → "BH 7F3 K2Q" để đọc to trên bảng; mã sai dạng giữ nguyên. */
export function spacedLessonCode(code: string): string {
  const normalized = normalizeLessonCode(code);
  return isWellFormedAccessCode(normalized) ? `${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5)}` : code;
}

/** Số từ như máy chủ đếm: tách theo khoảng trắng. */
export function countLessonWords(text: string | null | undefined): number {
  const trimmed = (text ?? '').trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/u).length;
}

/** Trạng thái của bài học: Nháp, Đã xuất bản, Lưu trữ. */
export const LESSON_STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
};

export const LESSON_LENGTH_LABEL: Record<LessonLength, string> = {
  SHORT: 'Ngắn',
  MEDIUM: 'Vừa',
  DETAILED: 'Chi tiết',
};

export const LESSON_LENGTHS: readonly LessonLength[] = ['SHORT', 'MEDIUM', 'DETAILED'];

export const LESSON_SECTION_LABEL: Record<LessonSectionType, string> = {
  STORY: 'Bước câu chuyện',
  IMAGE: 'Hình và chú thích',
  READING: 'Đoạn văn',
  MILESTONE: 'Mốc thời gian',
  SOURCE_EXCERPT: 'Trích tư liệu gốc',
  REFLECTION: 'Câu hỏi gợi suy nghĩ',
};

/** Giới hạn khớp máy chủ (LessonRules). */
export const LESSON_LIMITS = {
  titleMaxLength: 255,
  summaryMaxLength: 40_000,
  sectionBodyMaxLength: 20_000,
  sectionTitleMaxLength: 255,
  sourceCitationMaxLength: 500,
  keyPointMaxLength: 300,
  minKeyPoints: 1,
  maxKeyPoints: 10,
  minHeritages: 1,
  maxHeritages: 10,
  maxSections: 60,
  level1StepMaxWords: 50,
  level1MinSteps: 3,
  level1MaxSteps: 6,
  level2MinMilestones: 3,
  level2MaxMilestones: 8,
  level3MaxExcerpts: 3,
  level3ExcerptMaxWords: 150,
} as const;
