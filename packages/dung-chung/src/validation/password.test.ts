import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../messages';
import { checkPassword, isPasswordValid, validateNewPassword, validatePasswordConfirmation } from './password';

// Cùng bộ ca với PasswordPolicyTests của backend để hai phía không lệch nhau.
describe('quy tắc mật khẩu 8-64 ký tự có chữ hoa, chữ thường và chữ số', () => {
  it.each([
    ['MatKhau1', 'đủ 8 ký tự, có hoa, thường, số'],
    ['Abcdefg1', 'biên dưới 8 ký tự'],
    [`A1${'b'.repeat(62)}`, 'biên trên 64 ký tự'],
    ['ĐàNẵng2026', 'chữ hoa và thường có dấu tiếng Việt'],
    ['Mật khẩu 1', 'có khoảng trắng vẫn hợp lệ'],
  ])('chấp nhận %s (%s)', (password) => {
    expect(isPasswordValid(password)).toBe(true);
  });

  it.each([
    ['Abcdef1', 'chỉ 7 ký tự'],
    [`A1${'b'.repeat(63)}`, '65 ký tự'],
    ['matkhau1', 'thiếu chữ hoa'],
    ['MATKHAU1', 'thiếu chữ thường'],
    ['MatKhauMoi', 'thiếu chữ số'],
    ['', 'rỗng'],
  ])('từ chối %s (%s)', (password) => {
    expect(isPasswordValid(password)).toBe(false);
  });

  it('chỉ ra từng điều kiện còn thiếu', () => {
    expect(checkPassword('abc')).toEqual({ length: false, upper: false, lower: true, digit: false });
    expect(checkPassword('Đ1aaaaaa')).toEqual({ length: true, upper: true, lower: true, digit: true });
  });

  it('báo bắt buộc nhập khi trống (kể cả chỉ có khoảng trắng) và câu quy tắc khi không đạt', () => {
    expect(validateNewPassword('', 'mật khẩu mới')).toBe('Vui lòng nhập mật khẩu mới.');
    expect(validateNewPassword('        ')).toBe(MESSAGES.required('mật khẩu'));
    expect(validateNewPassword('matkhau1')).toBe(MESSAGES.passwordPolicy);
    expect(validateNewPassword('MatKhau2026')).toBeNull();
  });

  it('câu quy tắc mật khẩu đúng nguyên văn danh mục thông báo', () => {
    expect(MESSAGES.passwordPolicy).toBe('Mật khẩu phải dài 8-64 ký tự, có chữ hoa, chữ thường và chữ số.');
  });

  it('ô nhập lại: bắt buộc nhập và phải giống mật khẩu mới', () => {
    expect(validatePasswordConfirmation('MatKhau2026', '')).toBe('Vui lòng nhập lại mật khẩu mới.');
    expect(validatePasswordConfirmation('MatKhau2026', 'MatKhau2027')).toBe('Hai lần nhập mật khẩu chưa giống nhau.');
    expect(validatePasswordConfirmation('MatKhau2026', 'MatKhau2026')).toBeNull();
  });
});
