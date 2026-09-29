import { useEffect, type ReactNode } from 'react';
import { Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router';
import { isRouteHandle } from '../../app/routeHandle';
import { useAuth } from '../../lib/auth/context';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { SiteFooter } from './SiteFooter';
import { TopBar } from './TopBar';

/**
 * Gốc của mọi route: khôi phục vị trí cuộn, xóa đích chuyển trang sau đăng nhập / đăng xuất khi đã chuyển xong, chọn bộ
 * giao diện theo khu đang mở (ThemeProvider phải nằm trong router).
 */
export function RootLayout() {
  const { key } = useLocation();
  const { clearLanding } = useAuth();
  useEffect(() => {
    if (key) clearLanding();
  }, [key, clearLanding]);
  return (
    <ThemeProvider>
      <ScrollRestoration />
      <Outlet />
    </ThemeProvider>
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

/** Khung có thanh điều hướng trên; nội dung đẩy xuống dưới thanh cố định 56px. Chân trang trừ trang bản đồ. */
export function TopBarFrame({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-on-background">
      <SkipLink />
      <TopBar />
      <main id="noi-dung" tabIndex={-1} className="flex-1 pt-(--dsv-topbar-height) outline-none">
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}

/** Khung không có thanh điều hướng: làm bài kiểm tra (toàn màn hình), đổi mật khẩu bắt buộc. */
export function BareFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-on-background">
      <SkipLink />
      <main id="noi-dung" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </div>
  );
}

/**
 * Layout route của mọi trang có thanh điều hướng. Tài khoản đang bị buộc đổi mật khẩu thì ẩn thanh điều hướng (chỉ còn
 * màn hình Đổi mật khẩu, không có lối đi trang khác).
 */
export function MainLayout() {
  const { user } = useAuth();
  const hideFooter = useMatches().some((match) => isRouteHandle(match.handle) && match.handle.hideFooter === true);
  if (user?.mustChangePassword) {
    return (
      <BareFrame>
        <Outlet />
      </BareFrame>
    );
  }
  return (
    <TopBarFrame footer={!hideFooter}>
      <Outlet />
    </TopBarFrame>
  );
}

export function FullScreenLayout() {
  return (
    <BareFrame>
      <Outlet />
    </BareFrame>
  );
}
