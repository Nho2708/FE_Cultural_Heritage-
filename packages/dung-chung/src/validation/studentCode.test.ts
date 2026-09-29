import { describe, expect, it } from 'vitest';
import { STUDENT_CODE_PATTERN, normalizeCode, validateStudentCodeInput } from './studentCode';

describe('mã học sinh do học sinh gõ', () => {
  it('bỏ khoảng trắng, dấu gạch và đổi sang chữ hoa trước khi gửi', () => {
    expect(normalizeCode(' hs 8k2-qx7 ')).toBe('HS8K2QX7');
    expect(normalizeCode('HS8K2–QX7')).toBe('HS8K2QX7');
    expect(normalizeCode('')).toBe('');
  });

  it('dạng mã: HS + 6 ký tự không gồm 0, O, 1, I', () => {
    expect(STUDENT_CODE_PATTERN.test('HS8K2QX7')).toBe(true);
    expect(STUDENT_CODE_PATTERN.test('HS8K2QX')).toBe(false);
    expect(STUDENT_CODE_PATTERN.test('HS0K2QX7')).toBe(false);
    expect(STUDENT_CODE_PATTERN.test('HSOK2QX7')).toBe(false);
    expect(STUDENT_CODE_PATTERN.test('BH8K2QX7')).toBe(false);
  });

  it('chỉ báo bắt buộc nhập; mã sai dạng vẫn để máy chủ trả câu chung', () => {
    expect(validateStudentCodeInput('  ')).toBe('Vui lòng nhập mã học sinh.');
    expect(validateStudentCodeInput('abc')).toBeNull();
  });
});
