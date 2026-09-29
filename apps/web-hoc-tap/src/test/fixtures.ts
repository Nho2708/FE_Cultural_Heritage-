import type { SchoolLevel, StudentProfile } from '@dsvhvn/dung-chung/api';
import type { Session } from '@dsvhvn/dung-chung/auth';

export { envelope, mockApi, type FetchCall } from '@dsvhvn/dung-chung/testing';

/** Học sinh mẫu; `grade` là khối của lớp (cấp học suy từ khối nếu máy chủ không trả `schoolLevel`). */
export function studentOf(
  grade = 7,
  overrides: Partial<StudentProfile> & { schoolLevel?: SchoolLevel | null } = {},
): StudentProfile {
  return {
    id: 101,
    username: 'HS8K2QX7',
    email: null,
    fullName: 'Nguyễn Minh An',
    phone: null,
    avatarUrl: null,
    role: 'STUDENT',
    roleName: 'Học sinh',
    status: 'ACTIVE',
    mustChangePassword: false,
    organization: { id: 10, name: 'Trường THCS Nguyễn Du' },
    lastLoginAt: null,
    createdAt: '2026-09-28T01:00:00Z',
    studentCode: 'HS8K2QX7',
    schoolLevel: null,
    class: { id: 5, name: `${grade}A1`, grade },
    teacherName: 'Trần Văn Bình',
    ...overrides,
  };
}

export function sessionOf(student: StudentProfile = studentOf(), overrides: Partial<Session<StudentProfile>> = {}): Session<StudentProfile> {
  return {
    accessToken: 'access-hoc-sinh',
    expiresAt: Date.now() + 8 * 60 * 60_000,
    user: student,
    ...overrides,
  };
}
