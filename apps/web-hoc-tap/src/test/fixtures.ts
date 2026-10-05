import type { SchoolLevel, StudentClassDetail, StudentProfile } from '@dsvhvn/dung-chung/api';
import { STUDENT_ENDPOINTS, studentCodeOf } from '@dsvhvn/dung-chung/api';
import type { StudentProfileWire } from '@dsvhvn/dung-chung/api';
import { schoolLevelOfGrade } from '@dsvhvn/dung-chung/theme';
import type { Session } from '@dsvhvn/dung-chung/auth';
import { envelope as baseEnvelope, mockApi as baseMockApi, type FetchCall } from '@dsvhvn/dung-chung/testing';
import { sessionStore } from '../lib/auth/session';

export { envelope, type FetchCall } from '@dsvhvn/dung-chung/testing';

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
    class: { id: 5, name: `${grade}A1`, grade, schoolYear: '2026-2027' },
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

function levelOf(student: StudentProfile): SchoolLevel {
  return student.schoolLevel ?? schoolLevelOfGrade(student.class?.grade) ?? 2;
}

/** Lớp của em như máy chủ trả (`GET /student/class`). */
export function classroomOf(student: StudentProfile): StudentClassDetail {
  const level = levelOf(student);
  return {
    id: student.class?.id ?? 5,
    name: student.class?.name ?? '',
    grade: student.class?.grade ?? 7,
    schoolLevel: level,
    schoolLevelName: `Cấp ${level}`,
    schoolYear: student.class?.schoolYear ?? '2026-2027',
    teacherName: student.teacherName,
    organization: student.organization,
  };
}

/** Hồ sơ như máy chủ trả (`GET /student/me`, kèm trong kết quả đăng nhập và đổi mật khẩu). */
export function wireOf(student: StudentProfile): StudentProfileWire {
  return {
    userId: student.id,
    studentId: student.studentId ?? 7,
    studentCode: studentCodeOf(student),
    fullName: student.fullName,
    mustChangePassword: student.mustChangePassword,
    schoolLevel: levelOf(student),
    class: classroomOf(student),
    lastLoginAt: student.lastLoginAt,
    createdAt: student.createdAt,
  };
}

/** Phản hồi đăng nhập hoặc đổi mật khẩu: token và hồ sơ như máy chủ trả. */
export function sessionWireOf(student: StudentProfile, accessToken = 'token-hoc-sinh') {
  return {
    tokenType: 'Bearer',
    accessToken,
    expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    student: wireOf(student),
  };
}

/** Máy chủ của một học sinh: hồ sơ của em và lớp của em. */
export function studentServer(student: StudentProfile) {
  return (call: FetchCall) => {
    if (call.path === STUDENT_ENDPOINTS.profile) return baseEnvelope(200, { data: wireOf(student) });
    if (call.path === STUDENT_ENDPOINTS.class) return baseEnvelope(200, { data: classroomOf(student) });
    return undefined;
  };
}

/** API giả; lớp của em mặc định lấy từ hồ sơ đang đăng nhập nếu test không khai báo riêng. */
export function mockApi(...routes: Array<(call: FetchCall) => Response | Promise<Response> | undefined>) {
  return baseMockApi(...routes, (call) => {
    const user = sessionStore.getSession()?.user;
    return user && call.path === STUDENT_ENDPOINTS.class ? baseEnvelope(200, { data: classroomOf(user) }) : undefined;
  });
}
