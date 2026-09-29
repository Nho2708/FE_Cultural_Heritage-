import type { AccessToken, StaffProfile } from '@dsvhvn/dung-chung/api';
import { createContext, useContext } from 'react';

export interface AuthContextValue {
  /** Người đang đăng nhập (giáo viên, quản trị trường, quản trị hệ thống), null khi là Khách. */
  user: StaffProfile | null;
  landing: string | null;
  notice: string | null;
  /** Một ô email hoặc tên đăng nhập. `from` là trang bị chặn trước khi phải đăng nhập (nếu có). */
  login: (emailOrUsername: string, password: string, from?: string | null) => Promise<StaffProfile>;
  /** Đăng xuất: chỉ xóa access token trên trình duyệt, rồi về màn hình Đăng nhập. */
  logout: () => void;
  updateUser: (user: StaffProfile) => void;
  /** Đổi mật khẩu trả access token mới cho phiên hiện tại. */
  replaceToken: (token: AccessToken) => void;
  clearLanding: () => void;
  clearNotice: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth phải nằm trong <AuthProvider>.');
  return value;
}
