import { Navigate } from 'react-router';
import { roleHome } from '../access/access';
import { pathOf } from '../access/screens';
import { BasicFrame } from '../components/layout/Layouts';
import { useAuth } from '../lib/auth/context';
import { NotFoundPage } from '../pages/errors/ErrorPages';
import { OwnAreaRoute } from './areas';

/** `/`: khách vào màn hình Đăng nhập, người đã đăng nhập vào trang mặc định của vai trò. */
export function HomeRedirect() {
  const { user, landing } = useAuth();
  return <Navigate to={landing ?? (user ? roleHome(user.role) : pathOf('login'))} replace />;
}

/** 404 ngoài khu làm việc: người đã đăng nhập vẫn có thanh bên của mình, khách có khung đơn giản. */
export function OutsideNotFound() {
  const { user } = useAuth();
  if (user)
    return (
      <OwnAreaRoute>
        <NotFoundPage />
      </OwnAreaRoute>
    );
  return (
    <BasicFrame>
      <NotFoundPage />
    </BasicFrame>
  );
}
