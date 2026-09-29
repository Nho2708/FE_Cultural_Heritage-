import type { Account, StaffProfile, StaffRole } from '@dsvhvn/dung-chung/api';
import type { Session } from '@dsvhvn/dung-chung/auth';

export { envelope, mockApi, type FetchCall } from '@dsvhvn/dung-chung/testing';

const NAMES: Record<StaffRole, string> = {
  ADMIN: 'Lê Quản Trị',
  ORG_ADMIN: 'Phạm Thị Hiệu Trưởng',
  TEACHER: 'Trần Văn Bình',
};

const USERNAMES: Record<StaffRole, string> = { ADMIN: 'admin.nho', ORG_ADMIN: 'qt.thcs.a', TEACHER: 'gv.binh' };

const ROLE_NAMES: Record<StaffRole, string> = {
  ADMIN: 'Quản trị hệ thống',
  ORG_ADMIN: 'Quản trị trường',
  TEACHER: 'Giáo viên',
};

export function userOf(role: StaffRole, id = 1): StaffProfile {
  return {
    id,
    username: USERNAMES[role],
    email: `${USERNAMES[role]}@dsvhvn.test`,
    fullName: NAMES[role],
    phone: null,
    avatarUrl: null,
    role,
    roleName: ROLE_NAMES[role],
    status: 'ACTIVE',
    mustChangePassword: false,
    organization: role === 'ADMIN' ? null : { id: 10, name: 'Trường THCS Nguyễn Du' },
    lastLoginAt: '2026-09-26T01:00:00Z',
    createdAt: '2026-09-25T15:04:34.9Z',
  };
}

export function sessionOf(role: StaffRole, overrides: Partial<Session<StaffProfile>> = {}): Session<StaffProfile> {
  return {
    accessToken: `access-${role}`,
    expiresAt: Date.now() + 8 * 60 * 60_000,
    user: userOf(role),
    ...overrides,
  };
}

export function accountOf(id: number, overrides: Partial<Account> = {}): Account {
  return {
    id,
    username: `gv.${id}`,
    email: `gv.${id}@thcs-nguyendu.edu.vn`,
    fullName: `Giáo viên số ${id}`,
    phone: null,
    role: 'TEACHER',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-09-25T15:04:34.9Z',
    ...overrides,
  };
}
