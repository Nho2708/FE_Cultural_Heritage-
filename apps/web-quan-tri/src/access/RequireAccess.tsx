import { useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../lib/auth/context';
import { ForbiddenPage } from '../pages/errors/ErrorPages';
import { resolveAccess, roleHome } from './access';
import { pathOf, type Actor, type Screen } from './screens';

// Route guard theo ma trận phân quyền của web quản trị. Chặn ở đây chỉ để điều hướng đúng; backend vẫn kiểm vai trò
// ở mọi endpoint.

/**
 * Chuyển trang ngay sau đăng nhập / đăng xuất, giữ `to` của lần render đầu. Không tự xóa `landing`: RootLayout xóa khi
 * trang mới đã hiện. Xóa sớm hơn thì cây route cũ (router đổi trang trong transition, chậm hơn cập nhật phiên) render
 * lại với `landing` rỗng và bị đưa nhầm tới trang khác.
 */
function AuthRedirect({ to }: { to: string }) {
  const [target] = useState(to);
  return <Navigate to={target} replace />;
}

interface RequireAccessProps {
  /** Màn hình cần kiểm (dùng cột vai trò của ma trận). */
  screen?: Screen;
  /** Hoặc danh sách vai trò trực tiếp — dùng cho cổng của cả khu vực, ví dụ /giao-vien. */
  actors?: readonly Actor[];
  /** Thay trang 403 mặc định, ví dụ cổng khu vực cần bọc 403 trong khung riêng. */
  forbidden?: ReactNode;
  children?: ReactNode;
}

export function RequireAccess({ screen, actors, forbidden, children }: RequireAccessProps) {
  const { user, landing } = useAuth();
  const location = useLocation();
  const target: Pick<Screen, 'actors'> = screen ?? { actors: actors ?? [] };

  switch (resolveAccess(target, user?.role)) {
    case 'allow':
      return children ?? <Outlet />;
    case 'login':
      // Vừa đăng xuất ngay trên màn hình cần đăng nhập: về đúng trang đăng xuất chọn (màn hình Đăng nhập, không nhớ trang cũ).
      if (landing) return <AuthRedirect to={landing} />;
      // Khách bị chặn tại cổng đăng nhập; màn hình Đăng nhập quay lại đúng trang này sau khi đăng nhập.
      return <Navigate to={pathOf('login')} replace state={{ from: `${location.pathname}${location.search}` }} />;
    case 'signed-in':
      // Đăng nhập, Quên / đặt mật khẩu chỉ cho người chưa đăng nhập — về trang vừa chọn khi đăng nhập, hoặc trang mặc định.
      return <AuthRedirect to={landing ?? (user ? roleHome(user.role) : pathOf('login'))} />;
    case 'forbidden':
      return forbidden ?? <ForbiddenPage />;
  }
}
