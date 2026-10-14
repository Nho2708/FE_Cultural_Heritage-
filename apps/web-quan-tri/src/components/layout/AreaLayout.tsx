import { cn } from '@dsvhvn/dung-chung';
import { BrandLogo, Icon, LoadingState, ThemeToggle } from '@dsvhvn/dung-chung/ui';
import { Suspense, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { screenForPath } from '../../access/access';
import { AccountMenu } from './AccountMenu';
import { LearningWebLink, SkipLink } from './Layouts';
import type { NavItem } from './navigation';

// Khung chung của /giao-vien, /truong, /quan-tri: thanh bên trái cố định 240px + breadcrumb + menu tài khoản + nút đổi theme.
// Chân thanh bên có "Mở trang khám phá di sản" (web học tập, tab mới). Dưới 841px thanh bên chuyển thành hàng cuộn ngang.
// `banner` là thanh báo trên cùng của khu, ví dụ khi trường không có gói hiệu lực.

interface AreaLayoutProps {
  /** Tên khu: nhãn dưới logo, breadcrumb, tên vùng điều hướng. */
  title: string;
  /** Dòng phụ dưới tên khu, ví dụ tên trường của giáo viên và quản trị trường. */
  context?: string | null;
  items: NavItem[];
  /** Đường dẫn gốc của khu vực, dùng để NavLink gốc chỉ sáng khi đúng trang đó. */
  root: string;
  theme?: 'light' | 'system' | 'dark';
  banner?: ReactNode;
  /** Nội dung đặt sẵn (ví dụ trang 403 ở cổng khu); không có thì dùng Outlet của route con. */
  children?: ReactNode;
}

export function AreaLayout({ title, context, items, root, theme, banner, children }: AreaLayoutProps) {
  const { pathname } = useLocation();
  const current = screenForPath(pathname);

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-11 shrink-0 items-center gap-3 rounded-sm px-3 type-control transition-colors duration-(--dsv-duration-fast)',
      isActive
        ? 'bg-(--dsv-drawer-item-active-bg) text-on-primary-container'
        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
    );

  return (
    <div
      data-theme={theme}
      className="min-h-dvh bg-background text-on-background dsvmd:grid dsvmd:grid-cols-[var(--dsv-sidebar-admin-width)_1fr]"
    >
      <SkipLink />
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-surface-container-low px-3 py-4 dsvmd:flex">
        <Link to="/" className="flex items-start gap-3 rounded-sm px-3 py-1">
          <BrandLogo variant="emblem" size={32} decorative className="mt-0.5" />
          <span className="flex min-w-0 flex-col">
            <span className="type-h3 text-on-surface">Vietnam Heritage</span>
            <span className="type-label text-on-surface-muted">{title}</span>
            {context && <span className="mt-1 type-body-s text-on-surface-variant">{context}</span>}
          </span>
        </Link>
        <nav aria-label={title} className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === root} className={itemClass}>
              {item.icon && <Icon name={item.icon} size={20} />}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <LearningWebLink className="mt-auto flex h-11 items-center gap-3 rounded-sm px-3 type-control text-on-surface-variant hover:bg-surface-container hover:text-on-surface">
          <Icon name="map-pin" size={20} />
          Mở trang khám phá di sản
        </LearningWebLink>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-(--dsv-topbar-height) items-center gap-3 border-b border-border bg-surface px-4 dsvmd:px-6">
          <Link to="/" className="flex items-center gap-2 type-h3 text-on-surface dsvmd:hidden">
            <BrandLogo variant="emblem" size={32} decorative />
            Vietnam Heritage
          </Link>
          <nav aria-label="Vị trí hiện tại" className="min-w-0 flex-1">
            <ol className="flex items-center gap-2 truncate type-body-s text-on-surface-variant">
              <li className="hidden dsvsm:block">{title}</li>
              {current && (
                <>
                  <li aria-hidden="true" className="hidden dsvsm:block">
                    /
                  </li>
                  <li aria-current="page" className="truncate text-on-surface">
                    {current.name}
                  </li>
                </>
              )}
            </ol>
          </nav>
          <ThemeToggle />
          <AccountMenu />
        </header>
        <nav aria-label={`${title} (thu gọn)`} className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 dsvmd:hidden">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === root} className={itemClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main id="noi-dung" tabIndex={-1} className="flex-1 outline-none">
          {banner}
          <Suspense fallback={<LoadingState rows={3} />}>{children ?? <Outlet />}</Suspense>
        </main>
      </div>
    </div>
  );
}
