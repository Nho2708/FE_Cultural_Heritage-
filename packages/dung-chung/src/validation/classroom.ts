import { MESSAGES } from '../messages';
import { LIMITS, validateRequired, validateRequiredText } from './fields';

// Kiểm tra biểu mẫu lớp và nhập danh sách học sinh phía giao diện, cùng luật và cùng câu với ClassRequestValidator và
// StudentValidators của backend. Backend vẫn là nơi quyết định.

/** Khối lớp 1-12; sĩ số tối đa và số dòng nhập tối đa mỗi lần. */
export const CLASS_RULES = {
  minGrade: 1,
  maxGrade: 12,
  maxStudents: 60,
  maxImportRows: 60,
  maxImportFileBytes: 1024 * 1024,
} as const;

const SCHOOL_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;
const SCHOOL_YEAR_RULE = 'phải đúng dạng YYYY-YYYY gồm hai năm liên tiếp, ví dụ 2026-2027';

export function validateClassName(value: string): string | null {
  return validateRequiredText(value, 'tên lớp', 'Tên lớp', LIMITS.className);
}

/** Khối lớp lấy từ ô chọn (chuỗi); rỗng là chưa chọn. */
export function validateGrade(value: string): string | null {
  if (value.trim() === '') return MESSAGES.required('khối lớp');
  const grade = Number(value);
  const ok = Number.isInteger(grade) && grade >= CLASS_RULES.minGrade && grade <= CLASS_RULES.maxGrade;
  return ok ? null : MESSAGES.invalid('Khối lớp', `phải là số nguyên từ ${CLASS_RULES.minGrade} đến ${CLASS_RULES.maxGrade}`);
}

export function isSchoolYear(value: string): boolean {
  const match = SCHOOL_YEAR_PATTERN.exec(value.trim());
  return match !== null && Number(match[2]) === Number(match[1]) + 1;
}

export function validateSchoolYear(value: string): string | null {
  const required = validateRequired(value, 'năm học');
  if (required) return required;
  return isSchoolYear(value) ? null : MESSAGES.invalid('Năm học', SCHOOL_YEAR_RULE);
}

/** Năm học hiện hành theo năm dương lịch Việt Nam: từ tháng 8 trở đi là năm học mới (tháng 10/2026 → 2026-2027). */
export function currentSchoolYear(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric' }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const start = month >= 8 ? year : year - 1;
  return `${start}-${start + 1}`;
}
