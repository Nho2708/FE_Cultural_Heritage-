import { MESSAGES } from '@dsvhvn/dung-chung';
import type { StudentProfile } from '@dsvhvn/dung-chung/api';
import { browserStorage, isProfileLike, SessionStore } from '@dsvhvn/dung-chung/auth';

// Phiên đăng nhập của học sinh trên web học tập: lưu ở sessionStorage (mất khi đóng tab) vì học sinh hay dùng chung
// máy của trường; tải lại trang trong cùng tab vẫn giữ đăng nhập.

export const SESSION_STORAGE_KEY = 'dsvhvn.hoc-tap.phien';

function isStudentProfile(value: unknown): value is StudentProfile {
  return isProfileLike(value) && value.role === 'STUDENT';
}

export const sessionStore = new SessionStore<StudentProfile>({
  storage: browserStorage('session'),
  key: SESSION_STORAGE_KEY,
  isUser: isStudentProfile,
  expiredNotice: MESSAGES.sessionExpired,
});
