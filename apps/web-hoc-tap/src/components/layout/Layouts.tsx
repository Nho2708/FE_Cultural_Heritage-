import { useEffect, type ReactNode } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useAuth } from '../../lib/auth/context';
import { TopBar } from './TopBar';

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

/** Khung có thanh điều hướng trên; nội dung đẩy xuống dưới thanh cố định 56px. */
export function TopBarFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-on-background">
      <SkipLink />
      <TopBar />
      <main id="noi-dung" tabIndex={-1} className="pt-(--dsv-topbar-height) outline-none">
        {children}
      </main>
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
  const Frame = user?.mustChangePassword ? BareFrame : TopBarFrame;
  return (
    <Frame>
      <Outlet />
    </Frame>
  );
}

export function FullScreenLayout() {
  return (
    <BareFrame>
      <Outlet />
    </BareFrame>
  );
}
