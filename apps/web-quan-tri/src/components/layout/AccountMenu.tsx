import { MESSAGES, ROLE_LABEL, initials } from '@dsvhvn/dung-chung';
import { ConfirmDialog, Icon, usePopover, useToast } from '@dsvhvn/dung-chung/ui';
import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { workArea } from '../../access/access';
import { pathOf } from '../../access/screens';
import { useAuth } from '../../lib/auth/context';
import { accountNav, type NavItem } from './navigation';

// Nút Avatar (chữ viết tắt) mở menu tài khoản: tên, tên đăng nhập, vai trò, trường; "Hồ sơ", lối vào khu làm việc của
// vai trò; "Đăng xuất" hỏi lại bằng hộp xác nhận chung rồi về màn hình Đăng nhập (từ mọi màn hình). Đăng xuất chỉ
// xóa access token trên trình duyệt.

export function AccountMenu() {
  const { user, logout } = useAuth();
  const { open, rootRef, buttonRef, toggle, close } = usePopover();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuId = useId();
  const navigate = useNavigate();
  const toast = useToast();

  if (!user) return null;

  const items: NavItem[] = [...accountNav(user.role), { ...workArea(user.role), icon: 'home' }];

  const signOut = () => {
    logout();
    setConfirmOpen(false);
    toast.success(MESSAGES.success('Đăng xuất'));
    navigate(pathOf('login'), { replace: true });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Tài khoản: ${user.fullName ?? user.username ?? ''}`}
        onClick={toggle}
        className="flex size-12 items-center justify-center rounded-full transition-colors duration-(--dsv-duration-control) ease-header hover:bg-(--dsv-topbar-hover-bg)"
      >
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-surface-container-high type-control text-on-surface-variant"
        >
          {initials(user.fullName)}
        </span>
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="absolute top-full right-0 z-(--dsv-z-drawer) mt-1 w-72 overflow-hidden rounded-md border border-border bg-surface py-2 text-on-surface shadow-1"
      >
        <div className="border-b border-border px-4 pt-2 pb-3">
          <p className="truncate type-h4">{user.fullName}</p>
          <p className="truncate type-body-s text-on-surface-variant">{user.username}</p>
          <p className="mt-1 type-label text-on-surface-muted">
            {ROLE_LABEL[user.role]}
            {user.organization && ` · ${user.organization.name}`}
          </p>
        </div>
        <ul className="py-1">
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={close}
                className="flex h-12 items-center gap-4 px-4 type-control text-(--dsv-drawer-item-fg) hover:bg-(--dsv-drawer-item-hover-bg)"
              >
                {item.icon && <Icon name={item.icon} size={20} />}
                {item.label}
              </Link>
            </li>
          ))}
          <li className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              onClick={() => {
                close();
                setConfirmOpen(true);
              }}
              className="flex h-12 w-full items-center gap-4 px-4 text-left type-control text-(--dsv-drawer-item-fg) hover:bg-(--dsv-drawer-item-hover-bg)"
            >
              <Icon name="log-out" size={20} />
              Đăng xuất
            </button>
          </li>
        </ul>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Đăng xuất"
        confirmLabel="Đăng xuất"
        onConfirm={signOut}
        onClose={() => setConfirmOpen(false)}
      >
        {MESSAGES.confirm('đăng xuất tài khoản', user.username ?? user.fullName ?? '')}
      </ConfirmDialog>
    </div>
  );
}
