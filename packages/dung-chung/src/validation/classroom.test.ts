import { describe, expect, it } from 'vitest';
import { currentSchoolYear, isSchoolYear, validateClassName, validateGrade, validateSchoolYear } from './classroom';

describe('biểu mẫu lớp', () => {
  it('tên lớp bắt buộc và tối đa 100 ký tự', () => {
    expect(validateClassName('  ')).toBe('Vui lòng nhập tên lớp.');
    expect(validateClassName('7A1')).toBeNull();
    expect(validateClassName('x'.repeat(101))).toBe('Tên lớp không hợp lệ: tối đa 100 ký tự.');
  });

  it('khối lớp là số nguyên 1-12', () => {
    expect(validateGrade('')).toBe('Vui lòng nhập khối lớp.');
    expect(validateGrade('0')).toContain('từ 1 đến 12');
    expect(validateGrade('13')).toContain('từ 1 đến 12');
    expect(validateGrade('7.5')).toContain('từ 1 đến 12');
    expect(validateGrade('12')).toBeNull();
  });

  it('năm học là hai năm liên tiếp dạng YYYY-YYYY', () => {
    expect(isSchoolYear('2026-2027')).toBe(true);
    expect(isSchoolYear('2026-2028')).toBe(false);
    expect(isSchoolYear('26-27')).toBe(false);
    expect(validateSchoolYear('')).toBe('Vui lòng nhập năm học.');
    expect(validateSchoolYear('2026-2026')).toContain('YYYY-YYYY');
    expect(validateSchoolYear(' 2026-2027 ')).toBeNull();
  });

  it('năm học hiện hành đổi từ tháng 8 theo giờ Việt Nam', () => {
    expect(currentSchoolYear(new Date('2026-10-06T03:00:00Z'))).toBe('2026-2027');
    expect(currentSchoolYear(new Date('2026-03-01T03:00:00Z'))).toBe('2025-2026');
    expect(currentSchoolYear(new Date('2026-07-31T18:00:00Z'))).toBe('2026-2027');
  });
});
