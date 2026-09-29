import { browserStorage, isProfileLike, SessionStore } from '@dsvhvn/dung-chung/auth';
import type { StaffProfile, StaffRole } from '@dsvhvn/dung-chung/api';
import { MESSAGES } from '@dsvhvn/dung-chung';

// Phiên đăng nhập của web quản trị: lưu ở localStorage để giữ đăng nhập khi tải lại trang và đồng bộ nhiều tab.

export const SESSION_STORAGE_KEY = 'dsvhvn.quan-tri.phien';

/** Khóa phiên của các bản trước khi tách hai ứng dụng: dọn đi để không nằm lại trên máy người dùng. */
const LEGACY_KEYS = ['dsvhvn.session.v1', 'dsvhvn.session.v2'];

const STAFF_ROLES: readonly string[] = ['ADMIN', 'ORG_ADMIN', 'TEACHER'] satisfies StaffRole[];

function isStaffProfile(value: unknown): value is StaffProfile {
  return isProfileLike(value) && STAFF_ROLES.includes(value.role);
}

export const sessionStore = new SessionStore<StaffProfile>({
  storage: browserStorage('local'),
  key: SESSION_STORAGE_KEY,
  isUser: isStaffProfile,
  expiredNotice: MESSAGES.sessionExpired,
});

if (typeof window !== 'undefined') {
  const storage = browserStorage('local');
  for (const key of LEGACY_KEYS) {
    try {
      storage?.removeItem(key);
    } catch {
      // bỏ qua
    }
  }
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_STORAGE_KEY || event.key === null) sessionStore.reload();
  });
}
