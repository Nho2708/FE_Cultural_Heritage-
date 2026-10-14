import type { ApiClient } from './client';

// Liên hệ của trường: biểu mẫu "Liên hệ để được tạo tài khoản cho trường" ở trang Dành cho nhà trường của web học tập.
// Công khai, không gắn token. Máy chủ gửi email cho quản trị hệ thống (không lưu CSDL, không gửi thư xác nhận về địa chỉ đã nhập)
// và giới hạn 5 lần mỗi 10 phút mỗi IP (429). `website` là ô bẫy ẩn: người thật để trống.

export const SCHOOL_INQUIRY_ENDPOINTS = {
  submit: '/public/school-inquiries',
} as const;

/** Trường của biểu mẫu, tên trùng khóa `errors` của máy chủ. */
export type SchoolInquiryField = 'schoolName' | 'province' | 'contactName' | 'position' | 'email' | 'phone' | 'message';

export interface SchoolInquiryInput {
  schoolName: string;
  province: string | null;
  contactName: string;
  position: string | null;
  email: string;
  phone: string | null;
  message: string;
  /** Ô bẫy ẩn; luôn rỗng với người thật. */
  website: string;
}

export function createSchoolInquiryApi(client: ApiClient) {
  return {
    /** Gửi liên hệ. 400 lỗi theo trường, 429 gửi quá nhiều lần, 503 chưa gửi được thư. Trả câu xác nhận của máy chủ. */
    submit: async (input: SchoolInquiryInput, { signal }: { signal?: AbortSignal } = {}) =>
      (await client.request<null>(SCHOOL_INQUIRY_ENDPOINTS.submit, { method: 'POST', auth: false, body: input, signal })).message,
  };
}

export type SchoolInquiryApi = ReturnType<typeof createSchoolInquiryApi>;
