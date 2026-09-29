import { MESSAGES } from '@dsvhvn/dung-chung';
import { Button, ButtonLink } from '@dsvhvn/dung-chung/ui';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { roleHome } from '../../access/access';
import { pathOf } from '../../access/screens';
import { useAuth } from '../../lib/auth/context';
import { StatusPage } from './StatusPage';

/** 403: đã đăng nhập nhưng vai trò không mở được màn hình. Hiện tại chỗ, giữ nguyên URL. */
export function ForbiddenPage() {
  const { user } = useAuth();
  const home = user ? roleHome(user.role) : pathOf('login');
  return (
    <StatusPage
      kicker="LỖI 403"
      title={MESSAGES.forbidden}
      actions={
        <ButtonLink to={home} size="lg">
          {user ? 'Về trang làm việc của tôi' : 'Đăng nhập'}
        </ButtonLink>
      }
    />
  );
}

/**
 * 404: đường dẫn không khớp màn hình nào. Danh mục thông báo chưa có câu riêng cho trang 404 (API dùng khuôn "Không thể
 * {thao tác}. Không tìm thấy {đối tượng}.") nên trang này giữ câu trung tính, chờ bổ sung vào danh mục.
 */
export function NotFoundPage() {
  return (
    <StatusPage
      kicker="LỖI 404"
      title="Không tìm thấy trang"
      actions={
        <ButtonLink to="/" size="lg">
          Về trang chính
        </ButtonLink>
      }
    >
      Đường dẫn không tồn tại hoặc đã được thay đổi.
    </StatusPage>
  );
}

/** Lỗi ngoài dự kiến khi dựng giao diện (kiểu "Trang lỗi"). */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <main id="noi-dung" className="min-h-dvh bg-background">
      <StatusPage
        kicker="LỖI HỆ THỐNG"
        title={MESSAGES.systemError}
        actions={
          <>
            <Button size="lg" onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
            <a href="/" className="inline-flex h-12 items-center px-6 type-control text-link underline underline-offset-4">
              Về trang chính
            </a>
          </>
        }
      />
    </main>
  );
}
