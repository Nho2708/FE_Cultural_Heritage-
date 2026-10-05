import { normalizeCode } from '@dsvhvn/dung-chung';
import type { LoginResult, StudentProfile } from '@dsvhvn/dung-chung/api';
import { sessionFromLogin } from '@dsvhvn/dung-chung/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { postLoginTarget } from '../../access/access';
import { studentApi } from '../api/client';
import { AuthContext, type AuthContextValue } from './context';
import { sessionStore } from './session';

const STORE_ACTIONS = {
  clearLanding: () => sessionStore.clearLanding(),
  clearNotice: () => sessionStore.clearNotice(),
};

/** setTimeout chỉ nhận tối đa 2^31 - 1 mili giây. */
const MAX_TIMER_MS = 2_147_483_647;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const snapshot = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getSnapshot);

  // Đọc lại hồ sơ một lần khi mở ứng dụng: giáo viên sửa khối lớp thì lần tải trang tiếp theo đổi bộ giao diện theo cấp
  // mới. Tài khoản đang bị buộc đổi mật khẩu chỉ gọi được API đổi mật khẩu nên không đọc lại.
  useEffect(() => {
    const session = sessionStore.getSession();
    if (!session || session.user.mustChangePassword) return;
    studentApi
      .profile()
      .then(({ data }) => sessionStore.updateUser(data))
      .catch(() => undefined);
  }, []);

  // Access token hết hạn sau 8 giờ: tới hạn thì kết thúc phiên ngay, không đợi tới yêu cầu kế tiếp.
  const expiresAt = snapshot.session?.expiresAt;
  useEffect(() => {
    if (expiresAt === undefined) return;
    const delay = Math.min(Math.max(expiresAt - Date.now() + 1000, 0), MAX_TIMER_MS);
    const timer = window.setTimeout(() => sessionStore.getSession(), delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  // Đổi người dùng thì bỏ dữ liệu đã tải của người trước.
  const userId = snapshot.session?.user.id;
  const previousUserId = useRef(userId);
  useEffect(() => {
    if (previousUserId.current === userId) return;
    previousUserId.current = userId;
    queryClient.clear();
  }, [userId, queryClient]);

  const login = useCallback(async (studentCode: string, password: string, from?: string | null) => {
    const { data } = await studentApi.login({ studentCode: normalizeCode(studentCode), password });
    sessionStore.setSession(sessionFromLogin(data), postLoginTarget(data.user, from));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    // Không có refresh token để thu hồi: đăng xuất là xóa token trên máy này, rồi về trang chủ.
    sessionStore.clear(null, '/');
    queryClient.clear();
  }, [queryClient]);

  const passwordChanged = useCallback((result: LoginResult<StudentProfile>) => {
    if (!sessionStore.getSnapshot().session) return;
    sessionStore.setSession({ ...sessionFromLogin(result), user: { ...result.user, mustChangePassword: false } }, null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: snapshot.session?.user ?? null,
      landing: snapshot.landing,
      notice: snapshot.notice,
      login,
      logout,
      passwordChanged,
      ...STORE_ACTIONS,
    }),
    [snapshot, login, logout, passwordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
