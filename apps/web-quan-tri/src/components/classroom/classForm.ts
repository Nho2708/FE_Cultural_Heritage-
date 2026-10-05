import { collectErrors, currentSchoolYear, validateClassName, validateGrade, validateSchoolYear } from '@dsvhvn/dung-chung';
import type { ClassInput, ClassRoom, SchoolLevel } from '@dsvhvn/dung-chung/api';
import { schoolLevelOfGrade, SCHOOL_LEVEL_LABEL } from '@dsvhvn/dung-chung/theme';

// Biểu mẫu lớp dùng ở hai nơi: khối "Tạo lớp" ngay trên màn hình Lớp học và hộp thoại sửa lớp. Cấp học suy từ khối lớp
// (khối 1-5 cấp 1, khối 6-9 cấp 2, khối 10-12 cấp 3), không có ô chọn cấp.

export type ClassField = 'name' | 'grade' | 'schoolYear';

/** Giá trị đang nhập (mọi ô là chuỗi; khối lớp rỗng là chưa chọn). */
export type ClassValues = Record<ClassField, string>;

export const emptyClassValues = (): ClassValues => ({ name: '', grade: '', schoolYear: currentSchoolYear() });

export const classValuesOf = (c: ClassRoom): ClassValues => ({ name: c.name, grade: String(c.grade), schoolYear: c.schoolYear });

export function validateClass(values: ClassValues): Partial<Record<ClassField, string>> {
  return collectErrors<ClassField>({
    name: validateClassName(values.name),
    grade: validateGrade(values.grade),
    schoolYear: validateSchoolYear(values.schoolYear),
  });
}

export function classBody(values: ClassValues, confirmLevelChange = false): ClassInput {
  return {
    name: values.name.trim(),
    grade: Number(values.grade),
    schoolYear: values.schoolYear.trim(),
    ...(confirmLevelChange ? { confirmLevelChange: true } : {}),
  };
}

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export const GRADE_OPTIONS = [
  { value: '', label: 'Chọn khối' },
  ...GRADES.map((grade) => {
    const level = schoolLevelOfGrade(grade) as SchoolLevel;
    return { value: String(grade), label: `Khối ${grade} · ${SCHOOL_LEVEL_LABEL[level]}` };
  }),
];

export const GRADE_FILTER_OPTIONS = [{ value: '', label: 'Tất cả khối' }, ...GRADE_OPTIONS.slice(1)];

/** Nhãn cấp học của một khối ("Cấp 2"). */
export function levelNameOfGrade(grade: number | string): string | null {
  const level = schoolLevelOfGrade(Number(grade));
  return level ? `Cấp ${level}` : null;
}

export const LEVEL_RULE_NOTE = 'Khối quyết định giao diện học của học sinh trong lớp: khối 1–5 dùng giao diện Cấp 1, khối 6–9 Cấp 2, khối 10–12 Cấp 3.';
