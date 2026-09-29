import { MESSAGES } from '@dsvhvn/dung-chung';
import { Button, ButtonLink } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

/** Khung chung của trang 404 và trang lỗi hệ thống: luôn có hành động kế tiếp. */
function StatusPage({ kicker, title, children, actions }: { kicker: string; title: string; children?: ReactNode; actions: ReactNode }) {
  return (
    <section className="dsv-content flex min-h-[60dvh] flex-col items-start justify-center gap-4 py-16">
      <title>{`${title} · Học di sản`}</title>
      <p className="type-label-kicker text-on-surface-muted">{kicker}</p>
      <h1 className="max-w-[760px] type-h1 text-on-surface">{title}</h1>
      {children && <div className="max-w-[760px] type-body-m text-on-surface-variant">{children}</div>}
      <div className="mt-4 flex flex-wrap gap-3">{actions}</div>
    </section>
  );
}

/**
 * 404: đường dẫn không khớp màn hình nào. Danh mục thông báo chưa có câu riêng cho trang 404 nên giữ câu trung tính,
 * chờ bổ sung vào danh mục.
 */
export function NotFoundPage() {
  return (
    <StatusPage
      kicker="LỖI 404"
      title="Không tìm thấy trang"
      actions={
        <ButtonLink to="/" size="lg">
          Về trang chủ
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
              Về trang chủ
            </a>
          </>
        }
      />
    </main>
  );
}
