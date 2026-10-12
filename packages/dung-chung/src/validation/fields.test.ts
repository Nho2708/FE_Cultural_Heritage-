import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validateFullName,
  validateOptionalEmail,
  validateOptionalPhone,
  validateRequired,
  validateRequiredText,
  validateUsername,
} from './fields';

// Cùng luật và cùng câu với validator backend (ValidationRules, UsernamePolicy, NewAccountRequestValidator) để lỗi
// hiện dưới ô nhập không đổi giọng giữa giao diện và máy chủ.
describe('kiểm tra trường nhập', () => {
  it('báo bắt buộc nhập khi trống (kể cả chỉ có khoảng trắng)', () => {
    expect(validateRequired('  ', 'email hoặc tên đăng nhập')).toBe('Vui lòng nhập email hoặc tên đăng nhập.');
    expect(validateFullName('')).toBe('Vui lòng nhập họ tên.');
    expect(validateEmail('')).toBe('Vui lòng nhập email.');
    expect(validateUsername(' ')).toBe('Vui lòng nhập tên đăng nhập.');
  });

  it('tên đăng nhập 3-50 ký tự, chữ không dấu, chữ số, dấu chấm, gạch dưới', () => {
    const rule = 'Tên đăng nhập không hợp lệ: dài 3-50 ký tự, chỉ gồm chữ không dấu, chữ số, dấu chấm, dấu gạch dưới.';
    expect(validateUsername('gv.binh_01')).toBeNull();
    expect(validateUsername('ab')).toBe(rule);
    expect(validateUsername('a'.repeat(51))).toBe(rule);
    expect(validateUsername('bình')).toBe(rule);
    expect(validateUsername('gv binh')).toBe(rule);
    expect(validateUsername('gv@truong')).toBe(rule);
  });

  it('báo không hợp lệ khi email sai định dạng hoặc dài quá 255 ký tự', () => {
    const rule = 'Email không hợp lệ: sai định dạng hoặc dài quá 255 ký tự.';
    expect(validateEmail('an@')).toBe(rule);
    expect(validateEmail('an x@y.vn')).toBe(rule);
    expect(validateEmail(`${'a'.repeat(251)}@x.vn`)).toBe(rule);
    expect(validateEmail(' an.nguyen@thcs.edu.vn ')).toBeNull();
    expect(validateOptionalEmail('')).toBeNull();
    expect(validateOptionalEmail('sai')).toBe(rule);
  });

  it('số điện thoại không bắt buộc: chữ số, dấu cách, dấu chấm, gạch ngang, có thể bắt đầu bằng +, 8-20 ký tự', () => {
    expect(validateOptionalPhone('')).toBeNull();
    expect(validateOptionalPhone('0901 234 567')).toBeNull();
    expect(validateOptionalPhone('+84-28.3822.1234')).toBeNull();
    expect(validateOptionalPhone('1234567')).toMatch(/^Số điện thoại không hợp lệ: /);
    expect(validateOptionalPhone('09012a4567')).toMatch(/^Số điện thoại không hợp lệ: /);
  });

  it('báo không hợp lệ khi vượt độ dài cột của CSDL', () => {
    expect(validateFullName('Ă'.repeat(256))).toBe('Họ tên không hợp lệ: tối đa 255 ký tự.');
    expect(validateFullName('Nguyễn Thị An')).toBeNull();
    expect(validateRequiredText('', 'tên trường', 'Tên trường', 255)).toBe('Vui lòng nhập tên trường.');
  });
});
