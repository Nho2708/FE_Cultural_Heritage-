import { MESSAGES } from '../messages';

// Quy tắc mật khẩu: dài 8-64 ký tự, có ít nhất một chữ hoa, một chữ thường và một chữ số — mọi vai trò, kể cả học sinh.
// Áp dụng cho đặt mật khẩu lần đầu, đặt lại và đổi mật khẩu; không áp cho ô mật khẩu của màn hình đăng nhập.
// Cách đếm giống PasswordPolicy của backend: độ dài tính theo đơn vị UTF-16 (như string.Length của .NET),
// chữ hoa/thường/số theo Unicode (Lu/Ll/Nd) nên chữ có dấu như "Đ", "ư" vẫn được tính.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

/** Dòng gợi ý dưới ô mật khẩu mới. */
export const PASSWORD_HINT = '8-64 ký tự, có chữ hoa, chữ thường và chữ số';

/** Các điều kiện của quy tắc, dùng cho danh sách đánh dấu khi đạt (màn hình đổi mật khẩu của học sinh). */
export const PASSWORD_RULES = [
  { key: 'length', label: 'Dài 8-64 ký tự' },
  { key: 'upper', label: 'Có chữ hoa' },
  { key: 'lower', label: 'Có chữ thường' },
  { key: 'digit', label: 'Có chữ số' },
] as const;

const UPPER = /\p{Lu}/u;
const LOWER = /\p{Ll}/u;
const DIGIT = /\p{Nd}/u;

export interface PasswordCheck {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
}

export function checkPassword(password: string): PasswordCheck {
  let upper = false;
  let lower = false;
  let digit = false;
  for (let i = 0; i < password.length; i++) {
    const unit = password[i] ?? '';
    if (UPPER.test(unit)) upper = true;
    else if (LOWER.test(unit)) lower = true;
    else if (DIGIT.test(unit)) digit = true;
  }
  const length = password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
  return { length, upper, lower, digit };
}

export function isPasswordValid(password: string): boolean {
  const c = checkPassword(password);
  return c.length && c.upper && c.lower && c.digit;
}

/**
 * Lỗi của ô mật khẩu mới (đặt lần đầu, đặt lại, đổi mật khẩu): câu "Vui lòng nhập …" khi trống, câu quy tắc mật khẩu
 * khi không đạt. `field` là tên trường trong câu bắt buộc nhập, ví dụ "mật khẩu" hoặc "mật khẩu mới".
 */
export function validateNewPassword(password: string, field = 'mật khẩu'): string | null {
  if (password.trim() === '') return MESSAGES.required(field);
  return isPasswordValid(password) ? null : MESSAGES.passwordPolicy;
}

/** Ô "Nhập lại mật khẩu mới": bắt buộc nhập, phải giống mật khẩu mới. Chỉ kiểm ở giao diện, API chỉ nhận một mật khẩu. */
export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (confirmation === '') return MESSAGES.required('lại mật khẩu mới');
  return confirmation === password ? null : MESSAGES.passwordMismatch;
}
