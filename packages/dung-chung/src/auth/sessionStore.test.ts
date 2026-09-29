import { describe, expect, it } from 'vitest';
import { memoryStorage } from '../testing/api';
import { SessionStore, isProfileLike, sessionFromLogin, type Session } from './sessionStore';

// Phiên chỉ có access token 8 giờ: không refresh token, hết hạn là về trạng thái Khách.

interface TestUser {
  id: number;
  role: string;
  mustChangePassword: boolean;
}

const KEY = 'dsvhvn.test.phien';
const user = (role = 'TEACHER'): TestUser => ({ id: 1, role, mustChangePassword: false });
const session = (overrides: Partial<Session<TestUser>> = {}): Session<TestUser> => ({
  accessToken: 'access',
  expiresAt: Date.now() + 3_600_000,
  user: user(),
  ...overrides,
});

function store(storage: Storage | null, now?: () => number, expiredNotice?: string) {
  return new SessionStore<TestUser>({ storage, key: KEY, isUser: isProfileLike, now, expiredNotice });
}

describe('phiên đăng nhập', () => {
  it('đọc kết quả đăng nhập: access token, hạn dùng, hồ sơ; không lưu refresh token', () => {
    const result = sessionFromLogin({ tokenType: 'Bearer', accessToken: 'abc', expiresAt: '2026-09-26T09:00:00Z', user: user() });
    expect(result).toEqual({ accessToken: 'abc', expiresAt: Date.parse('2026-09-26T09:00:00Z'), user: user() });
    expect(Object.keys(result)).not.toContain('refreshToken');
  });

  it('giữ phiên qua lần tải lại trang, bỏ phiên đã quá hạn', () => {
    let now = 1_000;
    const storage = memoryStorage();
    store(storage, () => now).setSession(session({ expiresAt: 5_000 }));

    expect(store(storage, () => now).getSession()?.user.role).toBe('TEACHER');

    now = 5_000;
    expect(store(storage, () => now).getSession()).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('phiên đang mở tự hết khi quá hạn, kèm câu báo cho màn hình đăng nhập nếu ứng dụng khai báo', () => {
    let now = 0;
    const tab = store(memoryStorage(), () => now, 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
    tab.setSession(session({ expiresAt: 100 }));
    now = 100;
    expect(tab.getSession()).toBeNull();
    expect(tab.getSnapshot()).toMatchObject({ session: null, notice: 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.' });
  });

  it('đổi mật khẩu thay access token, giữ hồ sơ', () => {
    const tab = store(memoryStorage());
    tab.setSession(session());
    tab.replaceToken('moi', Date.now() + 1000);
    expect(tab.getSession()).toMatchObject({ accessToken: 'moi', user: { role: 'TEACHER' } });
  });

  it('kết thúc phiên kèm câu báo cho màn hình đăng nhập và trang chuyển tới', () => {
    const tab = store(memoryStorage());
    tab.setSession(session());
    tab.clear('Tài khoản không đăng nhập được. Tài khoản đã bị khóa.', '/dang-nhap');
    expect(tab.getSnapshot()).toEqual({
      session: null,
      notice: 'Tài khoản không đăng nhập được. Tài khoản đã bị khóa.',
      landing: '/dang-nhap',
    });
  });

  it('bỏ qua dữ liệu hỏng hoặc khuôn cũ (thiếu cờ buộc đổi mật khẩu)', () => {
    const storage = memoryStorage();
    storage.setItem(KEY, '{"accessToken":1}');
    expect(store(storage).getSession()).toBeNull();
    storage.setItem(KEY, 'khong-phai-json');
    expect(store(storage).getSession()).toBeNull();
    storage.setItem(KEY, JSON.stringify({ accessToken: 'a', expiresAt: Date.now() + 1000, user: { id: 1, role: 'TEACHER' } }));
    expect(store(storage).getSession()).toBeNull();
  });

  it('đồng bộ giữa các tab: tab khác đăng nhập hoặc đăng xuất thì đọc lại', () => {
    const storage = memoryStorage();
    const tabA = store(storage);
    const tabB = store(storage);
    tabA.setSession(session({ user: user('ORG_ADMIN') }));
    expect(tabB.reload()?.user.role).toBe('ORG_ADMIN');
    tabA.clear();
    expect(tabB.reload()).toBeNull();
    expect(tabB.getSnapshot().session).toBeNull();
  });

  it('trình duyệt chặn lưu trữ: phiên vẫn dùng được trong tab hiện tại', () => {
    const tab = store(null);
    tab.setSession(session());
    expect(tab.getSession()?.accessToken).toBe('access');
  });
});
