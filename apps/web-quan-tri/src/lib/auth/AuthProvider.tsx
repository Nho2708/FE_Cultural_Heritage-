import type { AccessToken, StaffProfile } from '@dsvhvn/dung-chung/api';
import { sessionFromLogin } from '@dsvhvn/dung-chung/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { postLoginTarget } from '../../access/access';
import { pathOf } from '../../access/screens';
import { authApi, profileApi } from '../api/endpoints';
import { AuthContext, type AuthContextValue } from './context';
import { sessionStore } from './session';

// Hàm không phụ thuộc trạng thái React: giữ nguyên tham chiếu để dùng làm dependency của effect.
const STORE_ACTIONS = {
  updateUser: (user: StaffProfile) => sessionStore.updateUser(user),
  replaceToken: (token: AccessToken) => sessionStore.replaceToken(token.accessToken, Date.parse(token.expiresAt)),
  clearLanding: () => sessionStore.clearLanding(),
  clearNotice: () => sessionStore.clearNotice(),
};

/** setTimeout chỉ nhận tối đa 2^31 - 1 mili giây. */
const MAX_TIMER_MS = 2_147_483_647;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const snapshot = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getSnapshot);

  // Phiên lấy từ localStorage có thể cũ (đổi họ tên ở tab khác, trường vừa đổi tên): đọc lại hồ sơ một lần khi mở
  // ứng dụng. Token không còn dùng được (bị khóa, trường ngừng, đổi mật khẩu ở nơi khác) thì máy chủ trả 401 và tầng
  // API xóa phiên.
  useEffect(() => {
    if (!sessionStore.getSession()) return;
    profileApi
      .get()
      .then(({ data }) => sessionStore.updateUser(data))
      .catch(() => undefined);
  }, []);

  // Access token hết hạn sau 8 giờ: tới hạn thì kết thúc phiên để giao diện về trạng thái Khách ngay, không đợi tới
  // yêu cầu kế tiếp. Route guard đưa người dùng tới màn hình Đăng nhập và nhớ trang đang mở.
  const expiresAt = snapshot.session?.expiresAt;
  useEffect(() => {
    if (expiresAt === undefined) return;
    // Chờ quá hạn thêm 1 giây: đồng hồ hẹn giờ của trình duyệt có thể gọi sớm vài mili giây.
    const delay = Math.min(Math.max(expiresAt - Date.now() + 1000, 0), MAX_TIMER_MS);
    const timer = window.setTimeout(() => sessionStore.getSession(), delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  // Đổi người dùng (đăng xuất, đăng nhập tài khoản khác ở tab khác) thì bỏ dữ liệu đã tải của người trước.
  const userId = snapshot.session?.user.id;
  const previousUserId = useRef(userId);
  useEffect(() => {
    if (previousUserId.current === userId) return;
    previousUserId.current = userId;
    queryClient.clear();
  }, [userId, queryClient]);

  const login = useCallback(async (emailOrUsername: string, password: string, from?: string | null) => {
    const { data } = await authApi.login({ emailOrUsername: emailOrUsername.trim(), password });
    sessionStore.setSession(sessionFromLogin(data), postLoginTarget(data.user.role, from));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    // Không có refresh token để thu hồi: đăng xuất là xóa token trên máy này, rồi về màn hình Đăng nhập từ bất kỳ đâu.
    sessionStore.clear(null, pathOf('login'));
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: snapshot.session?.user ?? null,
      landing: snapshot.landing,
      notice: snapshot.notice,
      login,
      logout,
      ...STORE_ACTIONS,
    }),
    [snapshot, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
