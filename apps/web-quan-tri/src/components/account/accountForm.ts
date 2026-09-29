import type { NewAccount } from '@dsvhvn/dung-chung/api';
import {
  collectErrors,
  trimToNull,
  validateEmail,
  validateFullName,
  validateOptionalPhone,
  validateUsername,
} from '@dsvhvn/dung-chung';

// Giá trị và kiểm tra của biểu mẫu tài khoản mới (Biểu mẫu tài khoản và phần quản trị trường đầu tiên của Chi tiết
// trường).

export type AccountField = keyof NewAccount;

/** Giá trị đang nhập của biểu mẫu (mọi ô là chuỗi). */
export type AccountValues = Record<AccountField, string>;

export const EMPTY_ACCOUNT: AccountValues = { fullName: '', username: '', email: '', phone: '' };

/** Kiểm biểu mẫu tài khoản mới — cùng luật và cùng câu với NewAccountRequestValidator của backend. */
export function validateNewAccount(values: AccountValues): Partial<Record<AccountField, string>> {
  return collectErrors<AccountField>({
    fullName: validateFullName(values.fullName),
    username: validateUsername(values.username),
    email: validateEmail(values.email),
    phone: validateOptionalPhone(values.phone),
  });
}

/** Giá trị gửi lên: cắt khoảng trắng, số điện thoại trống thành null. */
export function newAccountBody(values: AccountValues): NewAccount {
  return {
    fullName: values.fullName.trim(),
    username: values.username.trim(),
    email: values.email.trim(),
    phone: trimToNull(values.phone),
  };
}
