import type { ApiClient } from './client';
import type { AccessToken, LoginResult, StudentProfile } from './types';

// Endpoint của học sinh, dùng chung cho web học tập và app mobile (cùng API, cùng kết quả).
// Backend chưa có các endpoint này (chức năng đăng nhập học sinh làm cùng chức năng lớp và học sinh): đường dẫn và tên
// trường dưới đây là đề xuất theo kế hoạch kiến trúc, chốt khi backend làm và ghi vào Swagger. Đổi ở đây là đủ, màn
// hình không gọi đường dẫn trực tiếp.

export const STUDENT_ENDPOINTS = {
  login: '/auth/student-login',
  profile: '/student/me',
  password: '/student/me/password',
} as const;

export interface StudentLoginBody {
  /** Mã học sinh đã chuẩn hóa (bỏ khoảng trắng và dấu gạch, viết hoa). */
  studentCode: string;
  password: string;
}

export interface StudentChangePasswordBody {
  /** Bỏ trống ở chế độ bắt buộc (lần đầu đăng nhập hoặc sau khi giáo viên đặt lại): token vừa có từ mật khẩu tạm. */
  currentPassword: string | null;
  newPassword: string;
}

export function createStudentApi(client: ApiClient) {
  return {
    /** Đăng nhập bằng mã học sinh + mật khẩu; tài khoản người lớn nhận cùng câu sai thông tin như sai mật khẩu. */
    login: (body: StudentLoginBody) =>
      client.request<LoginResult<StudentProfile>>(STUDENT_ENDPOINTS.login, { method: 'POST', body, auth: false }),

    /** Hồ sơ của em: họ tên, mã học sinh, lớp, khối, cấp học, trường. */
    profile: () => client.request<StudentProfile>(STUDENT_ENDPOINTS.profile),

    /** Đổi mật khẩu: máy chủ tắt cờ buộc đổi và trả access token mới trong cùng phản hồi. */
    changePassword: (body: StudentChangePasswordBody) =>
      client.request<AccessToken>(STUDENT_ENDPOINTS.password, { method: 'PUT', body }),
  };
}

export type StudentApi = ReturnType<typeof createStudentApi>;
