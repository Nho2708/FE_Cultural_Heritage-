import { MESSAGES } from '../messages';

// Kiểm tra phía giao diện, cùng luật và cùng câu với validator của backend (ValidationRules, UsernamePolicy,
// NewAccountRequestValidator, OrganizationInfoRequestValidator, UpdateProfileRequestValidator).
// Backend vẫn là nơi quyết định; ở đây chỉ để báo lỗi sớm dưới ô nhập.

/** Độ dài theo cột của CSDL (AccountRules của backend). */
export const LIMITS = {
  email: 255,
  fullName: 255,
  usernameMin: 3,
  usernameMax: 50,
  avatarUrl: 500,
  organizationName: 255,
  organizationAddress: 500,
  className: 100,
} as const;

// Có một @, có tên miền với dấu chấm, không khoảng trắng (giống ValidationRules.IsEmail).
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Có thể bắt đầu bằng +, gồm chữ số, dấu cách, dấu chấm, gạch ngang; 8-20 ký tự (ValidationRules.IsPhone).
const PHONE_PATTERN = /^(?=.{8,20}$)\+?[0-9][0-9 .-]*[0-9]$/;
// Tên đăng nhập: chữ không dấu, chữ số, dấu chấm, gạch dưới.
const USERNAME_PATTERN = /^[A-Za-z0-9._]+$/;

const EMAIL_RULE = `sai định dạng hoặc dài quá ${LIMITS.email} ký tự`;
const PHONE_RULE = 'chỉ gồm chữ số, dấu cách, dấu chấm, gạch ngang, có thể bắt đầu bằng dấu +, dài 8-20 ký tự';
const USERNAME_RULE = 'dài 3-50 ký tự, chỉ gồm chữ không dấu, chữ số, dấu chấm, dấu gạch dưới';

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function validateRequired(value: string, field: string): string | null {
  return value.trim() === '' ? MESSAGES.required(field) : null;
}

/** Chuỗi bắt buộc, sau khi cắt khoảng trắng không dài quá `max` (RequiredText). */
export function validateRequiredText(value: string, field: string, label: string, max: number): string | null {
  if (value.trim() === '') return MESSAGES.required(field);
  return value.trim().length > max ? MESSAGES.invalid(label, `tối đa ${max} ký tự`) : null;
}

/** Chuỗi không bắt buộc, có thì không dài quá `max` (OptionalText). */
export function validateOptionalText(value: string, label: string, max: number): string | null {
  return value.trim().length > max ? MESSAGES.invalid(label, `tối đa ${max} ký tự`) : null;
}

/** Email bắt buộc (RequiredEmail). */
export function validateEmail(value: string): string | null {
  if (value.trim() === '') return MESSAGES.required('email');
  return isEmail(value) && value.trim().length <= LIMITS.email ? null : MESSAGES.invalid('Email', EMAIL_RULE);
}

/** Email không bắt buộc, ví dụ email liên hệ của trường (OptionalEmail). */
export function validateOptionalEmail(value: string): string | null {
  if (value.trim() === '') return null;
  return isEmail(value) && value.trim().length <= LIMITS.email ? null : MESSAGES.invalid('Email', EMAIL_RULE);
}

/** Số điện thoại không bắt buộc (OptionalPhone). */
export function validateOptionalPhone(value: string): string | null {
  if (value.trim() === '') return null;
  return PHONE_PATTERN.test(value.trim()) ? null : MESSAGES.invalid('Số điện thoại', PHONE_RULE);
}

/** Tên đăng nhập 3-50 ký tự, chữ không dấu, chữ số, dấu chấm, gạch dưới. */
export function validateUsername(value: string): string | null {
  const v = value.trim();
  if (v === '') return MESSAGES.required('tên đăng nhập');
  const ok = v.length >= LIMITS.usernameMin && v.length <= LIMITS.usernameMax && USERNAME_PATTERN.test(v);
  return ok ? null : MESSAGES.invalid('Tên đăng nhập', USERNAME_RULE);
}

export function validateFullName(value: string): string | null {
  return validateRequiredText(value, 'họ tên', 'Họ tên', LIMITS.fullName);
}

/** Ảnh đại diện: để trống hoặc đường dẫn http/https, tối đa 500 ký tự. */
export function validateAvatarUrl(value: string): string | null {
  const v = value.trim();
  if (v === '') return null;
  let ok = v.length <= LIMITS.avatarUrl;
  if (ok) {
    try {
      const url = new URL(v);
      ok = url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      ok = false;
    }
  }
  return ok ? null : MESSAGES.invalid('Ảnh đại diện', `phải là đường dẫn http hoặc https, tối đa ${LIMITS.avatarUrl} ký tự`);
}

/** Gom lỗi theo trường, bỏ trường không lỗi. */
export function collectErrors<K extends string>(checks: Record<K, string | null>): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const key of Object.keys(checks) as K[]) {
    const message = checks[key];
    if (message) errors[key] = message;
  }
  return errors;
}

/** Chuỗi rỗng hoặc toàn khoảng trắng gửi lên là null (máy chủ lưu NULL). */
export function trimToNull(value: string): string | null {
  const v = value.trim();
  return v === '' ? null : v;
}
