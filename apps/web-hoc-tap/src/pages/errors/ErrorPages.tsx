import { Button, ButtonLink } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { useT } from '../../i18n/context';

/** Khung chung của trang 404 và trang lỗi hệ thống: luôn có hành động kế tiếp. */
function StatusPage({ kicker, title, children, actions }: { kicker: string; title: string; children?: ReactNode; actions: ReactNode }) {
  const t = useT();
  return (
    <section className="dsv-content flex min-h-[60dvh] flex-col items-start justify-center gap-4 py-16">
      <title>{t.documentTitle(title)}</title>
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
  const t = useT();
  return (
    <StatusPage
      kicker={t.errors.page404Kicker}
      title={t.errors.page404Title}
      actions={
        <ButtonLink to="/" size="lg">
          {t.errors.home}
        </ButtonLink>
      }
    >
      {t.errors.page404Text}
    </StatusPage>
  );
}

/** Lỗi ngoài dự kiến khi dựng giao diện (kiểu "Trang lỗi"). */
export function RouteErrorPage() {
  const error = useRouteError();
  const t = useT();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <main id="noi-dung" className="min-h-dvh bg-background">
      <StatusPage
        kicker={t.errors.systemKicker}
        title={t.common.systemError}
        actions={
          <>
            <Button size="lg" onClick={() => window.location.reload()}>
              {t.errors.reload}
            </Button>
            <a href="/" className="inline-flex h-12 items-center px-6 type-control text-link underline underline-offset-4">
              {t.errors.home}
            </a>
          </>
        }
      />
    </main>
  );
}
