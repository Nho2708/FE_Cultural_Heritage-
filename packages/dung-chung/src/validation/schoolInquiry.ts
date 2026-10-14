import type { SchoolInquiryField } from '../api/schoolInquiry';
import { collectErrors, validateEmail, validateOptionalPhone, validateOptionalText, validateRequiredText } from './fields';

// Kiểm tra biểu mẫu liên hệ của trường phía giao diện, cùng luật và cùng câu với SchoolInquiryRequestValidator của backend.
// Backend vẫn là nơi quyết định.

export const SCHOOL_INQUIRY_LIMITS = {
  schoolName: 200,
  province: 100,
  contactName: 100,
  position: 100,
  message: 2000,
} as const;

export type SchoolInquiryValues = Record<SchoolInquiryField, string>;

export function validateSchoolInquiry(values: SchoolInquiryValues): Partial<Record<SchoolInquiryField, string>> {
  return collectErrors<SchoolInquiryField>({
    schoolName: validateRequiredText(values.schoolName, 'tên trường', 'Tên trường', SCHOOL_INQUIRY_LIMITS.schoolName),
    province: validateOptionalText(values.province, 'Tỉnh/thành', SCHOOL_INQUIRY_LIMITS.province),
    contactName: validateRequiredText(values.contactName, 'họ tên người liên hệ', 'Họ tên người liên hệ', SCHOOL_INQUIRY_LIMITS.contactName),
    position: validateOptionalText(values.position, 'Chức vụ', SCHOOL_INQUIRY_LIMITS.position),
    email: validateEmail(values.email),
    phone: validateOptionalPhone(values.phone),
    message: validateRequiredText(values.message, 'nội dung', 'Nội dung', SCHOOL_INQUIRY_LIMITS.message),
  });
}

/** Câu khi gửi quá nhiều lần (429); `seconds` là thời gian máy chủ yêu cầu chờ, null khi không đọc được. */
export function schoolInquiryTooManyMessage(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút.';
  const wait = seconds < 60 ? `${seconds} giây` : `${Math.ceil(seconds / 60)} phút`;
  return `Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ${wait}.`;
}

export const SCHOOL_INQUIRY_SENT = 'Đã gửi. Nhóm sẽ liên hệ lại qua email.';
