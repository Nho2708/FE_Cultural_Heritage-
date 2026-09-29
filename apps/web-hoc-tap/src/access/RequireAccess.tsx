import { useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../lib/auth/context';
import { changePasswordPath, resolveAccess } from './access';
import { pathOf, type Screen } from './screens';

// Route guard của web học tập. Chặn ở đây chỉ để điều hướng đúng; backend vẫn kiểm vai trò học sinh, lớp và lượt làm
// của chính em ở mọi endpoint, và token đang bị buộc đổi mật khẩu chỉ gọi được API đổi mật khẩu.

/** Chuyển trang ngay sau đăng nhập / đăng xuất, giữ `to` của lần render đầu (layout gốc xóa `landing` khi đã chuyển). */
function AuthRedirect({ to }: { to: string }) {
  const [target] = useState(to);
  return <Navigate to={target} replace />;
}

export function RequireAccess({ screen, children }: { screen: Screen; children?: ReactNode }) {
  const { user, landing } = useAuth();
  const location = useLocation();
  const here = `${location.pathname}${location.search}`;

  switch (resolveAccess(screen, user)) {
    case 'allow':
      return children ?? <Outlet />;
    case 'login':
      // Vừa đăng xuất ngay trên trang của khu học: về trang chủ như mọi lần đăng xuất, không đưa tới đăng nhập.
      if (landing) return <AuthRedirect to={landing} />;
      return <Navigate to={pathOf('login')} replace state={{ from: here }} />;
    case 'signed-in':
      return <AuthRedirect to={landing ?? pathOf('learnHome')} />;
    case 'change-password':
      return <AuthRedirect to={landing ?? changePasswordPath(here)} />;
  }
}
