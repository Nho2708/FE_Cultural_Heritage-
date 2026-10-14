import { BrandLogo, Icon } from '@dsvhvn/dung-chung/ui';
import { cn } from '@dsvhvn/dung-chung';
import { useEffect, type ReactNode } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { LEARNING_WEB_URL } from '../../config/env';
import { useAuth } from '../../lib/auth/context';

/** Tên hiển thị của web quản trị (tên tạm, nhóm có thể đổi). */
export const APP_NAME = 'Trang quản trị';

/** Gốc của mọi route: khôi phục vị trí cuộn, xóa đích chuyển trang sau đăng nhập / đăng xuất khi đã chuyển xong. */
export function RootLayout() {
  const { key } = useLocation();
  const { clearLanding } = useAuth();
  useEffect(() => {
    if (key) clearLanding();
  }, [key, clearLanding]);
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

/** Liên kết "Bỏ qua tới nội dung chính" — phần tử nhận focus đầu tiên. */
export function SkipLink() {
  return (
    <a
      href="#noi-dung"
      className="fixed top-2 left-2 z-(--dsv-z-toast) -translate-y-24 rounded-sm bg-primary px-4 py-3 type-control text-on-primary focus-visible:translate-y-0"
    >
      Bỏ qua tới nội dung chính
    </a>
  );
}

/** Chữ nhận diện: "Vietnam Heritage" kèm tên ứng dụng. */
export function Wordmark({ to = '/', subtitle = APP_NAME, className }: { to?: string; subtitle?: string; className?: string }) {
  return (
    <Link to={to} className={cn('flex min-w-0 items-center gap-2 rounded-xs px-2 py-1', className)}>
      <BrandLogo variant="emblem" size={32} decorative />
      <span className="flex min-w-0 flex-col justify-center">
        <span className="type-h3 leading-5 text-on-surface">Vietnam Heritage</span>
        <span className="truncate type-label text-on-surface-muted">{subtitle}</span>
      </span>
    </Link>
  );
}

/**
 * Liên kết sang web học tập (tab mới): mặc định là trang khám phá di sản công khai; `path` (bắt đầu bằng /) để mở một
 * trang khác của web học tập, ví dụ trang Dành cho nhà trường.
 */
export function LearningWebLink({
  className,
  path = '',
  children = 'Mở trang khám phá di sản',
}: {
  className?: string;
  path?: string;
  children?: ReactNode;
}) {
  return (
    <a href={`${LEARNING_WEB_URL}${path}`} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (mở trong tab mới)</span>
    </a>
  );
}

/**
 * Khung đơn giản cho màn hình ngoài khu làm việc (Đăng nhập, Quên / đặt mật khẩu, trang 404 khi chưa đăng nhập):
 * thanh trên cao 56px có chữ nhận diện và lối sang trang khám phá di sản.
 */
export function BasicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-on-background">
      <SkipLink />
      <header className="flex h-(--dsv-topbar-height) items-center gap-3 border-b border-border bg-surface px-2 dsvmd:px-4">
        <Wordmark className="mr-auto" />
        <LearningWebLink className="flex h-11 items-center gap-2 rounded-sm px-3 type-control text-on-surface-variant hover:bg-surface-container hover:text-on-surface">
          <Icon name="map-pin" size={20} />
          <span className="hidden dsvsm:inline">Mở trang khám phá di sản</span>
          <span className="dsvsm:hidden">Khám phá di sản</span>
        </LearningWebLink>
      </header>
      <main id="noi-dung" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </div>
  );
}

/** Layout route của Đăng nhập, Quên / đặt mật khẩu. */
export function AuthFrameLayout() {
  return (
    <BasicFrame>
      <Outlet />
    </BasicFrame>
  );
}
