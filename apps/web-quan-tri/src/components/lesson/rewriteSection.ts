import type { LessonSectionType } from '@dsvhvn/dung-chung/api';

// Quy tắc viết lại một phần bằng AI: đoạn trích tư liệu gốc phải nguyên văn nên không viết lại; ba yêu cầu chọn nhanh.

export type RewritableType = Exclude<LessonSectionType, 'SOURCE_EXCERPT'>;

export const QUICK_INSTRUCTIONS = ['Ngắn hơn', 'Dễ hiểu hơn', 'Sinh động hơn'] as const;

/** Loại phần được viết lại bằng AI (mọi loại trừ đoạn trích tư liệu gốc). */
export function isRewritable(type: LessonSectionType): type is RewritableType {
  return type !== 'SOURCE_EXCERPT';
}
