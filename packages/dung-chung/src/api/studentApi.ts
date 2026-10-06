import { createAttemptsApi } from './attempts';
import type { ApiClient, ApiResult } from './client';
import type { StudentLesson } from './lessons';
import type { AccessToken, LoginResult, OrganizationRef, SchoolLevel, StudentClassDetail, StudentProfile } from './types';

// Endpoint của học sinh, dùng chung cho web học tập và app mobile (cùng API, cùng kết quả). Máy chủ trả hồ sơ học sinh
// dạng riêng (mã học sinh, lớp lồng bên trong); lớp gọi API đổi sang `StudentProfile` để mọi màn hình dùng một dạng hồ sơ
// với người dùng khác (id, họ tên, tên đăng nhập, cờ buộc đổi mật khẩu).

export const STUDENT_ENDPOINTS = {
  login: '/student/auth/login',
  profile: '/student/me',
  password: '/student/me/password',
  class: '/student/class',
  lesson: (code: string) => `/student/lessons/${encodeURIComponent(code)}`,
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
  /** Mật khẩu mới nhập lần hai. */
  confirmNewPassword: string;
}

/** Lớp trong hồ sơ do máy chủ trả. */
interface StudentClassWire {
  id: number;
  name: string | null;
  grade: number;
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  schoolYear: string | null;
  teacherName: string | null;
  organization: OrganizationRef | null;
}

/** Hồ sơ học sinh do máy chủ trả (`/student/me`, kèm trong kết quả đăng nhập và đổi mật khẩu). */
export interface StudentProfileWire {
  userId: number;
  studentId: number;
  studentCode: string | null;
  fullName: string | null;
  mustChangePassword: boolean;
  schoolLevel: SchoolLevel;
  class: StudentClassWire;
  lastLoginAt: string | null;
  createdAt: string | null;
}

interface StudentSessionWire extends AccessToken {
  student: StudentProfileWire;
}

/** Hồ sơ máy chủ trả → hồ sơ dùng chung của giao diện. Học sinh không có email, số điện thoại, ảnh đại diện. */
export function toStudentProfile(wire: StudentProfileWire): StudentProfile {
  return {
    id: wire.userId,
    studentId: wire.studentId,
    username: wire.studentCode,
    studentCode: wire.studentCode,
    email: null,
    fullName: wire.fullName,
    phone: null,
    avatarUrl: null,
    role: 'STUDENT',
    roleName: 'Học sinh',
    status: 'ACTIVE',
    mustChangePassword: wire.mustChangePassword,
    organization: wire.class.organization,
    lastLoginAt: wire.lastLoginAt,
    createdAt: wire.createdAt,
    schoolLevel: wire.schoolLevel,
    class: {
      id: wire.class.id,
      name: wire.class.name ?? '',
      grade: wire.class.grade,
      schoolYear: wire.class.schoolYear,
    },
    teacherName: wire.class.teacherName,
  };
}

function toLoginResult(result: ApiResult<StudentSessionWire>): ApiResult<LoginResult<StudentProfile>> {
  const { student, ...token } = result.data;
  return { data: { ...token, user: toStudentProfile(student) }, message: result.message };
}

export function createStudentApi(client: ApiClient) {
  return {
    /** Đăng nhập bằng mã học sinh + mật khẩu; tài khoản người lớn nhận cùng câu sai thông tin như sai mật khẩu. */
    login: async (body: StudentLoginBody) =>
      toLoginResult(
        await client.request<StudentSessionWire>(STUDENT_ENDPOINTS.login, { method: 'POST', body, auth: false }),
      ),

    /** Hồ sơ của em: họ tên, mã học sinh, lớp, khối, cấp học, trường. Gọi được cả khi đang bị buộc đổi mật khẩu. */
    profile: async (): Promise<ApiResult<StudentProfile>> => {
      const result = await client.request<StudentProfileWire>(STUDENT_ENDPOINTS.profile);
      return { data: toStudentProfile(result.data), message: result.message };
    },

    /** Đổi mật khẩu: máy chủ tắt cờ buộc đổi và trả access token mới (token cũ hết dùng) kèm hồ sơ. */
    changePassword: async (body: StudentChangePasswordBody) =>
      toLoginResult(await client.request<StudentSessionWire>(STUDENT_ENDPOINTS.password, { method: 'PUT', body })),

    /** Lớp của em. Máy chủ từ chối (403) khi em còn phải đổi mật khẩu. */
    classroom: () => client.request<StudentClassDetail>(STUDENT_ENDPOINTS.class),

    /**
     * Mở bài học bằng mã bài học (đã chuẩn hóa). Mã sai, bài chưa xuất bản hoặc không thuộc lớp của em đều trả cùng một câu 404
     * và tính vào giới hạn nhập sai (429 khi vượt).
     */
    lessonByCode: (code: string) => client.request<StudentLesson>(STUDENT_ENDPOINTS.lesson(code)),

    /** Làm bài kiểm tra, kết quả, lịch sử, tiến độ và trang học của em. */
    ...createAttemptsApi(client),
  };
}

export type StudentApi = ReturnType<typeof createStudentApi>;
