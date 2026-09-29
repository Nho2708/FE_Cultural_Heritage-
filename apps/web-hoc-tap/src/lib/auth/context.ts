import type { AccessToken, StudentProfile } from '@dsvhvn/dung-chung/api';
import { createContext, useContext } from 'react';

export interface AuthContextValue {
  /** Học sinh đang đăng nhập, null khi là Khách. */
  user: StudentProfile | null;
  landing: string | null;
  notice: string | null;
  /** Đăng nhập bằng mã học sinh + mật khẩu. `from` là trang bị chặn trước khi phải đăng nhập (nếu có). */
  login: (studentCode: string, password: string, from?: string | null) => Promise<StudentProfile>;
  /** Đăng xuất: chỉ xóa access token trên trình duyệt, rồi về trang chủ. */
  logout: () => void;
  /** Đổi mật khẩu xong: máy chủ trả token mới, cờ buộc đổi mật khẩu tắt. */
  passwordChanged: (token: AccessToken) => void;
  clearLanding: () => void;
  clearNotice: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth phải nằm trong <AuthProvider>.');
  return value;
}
