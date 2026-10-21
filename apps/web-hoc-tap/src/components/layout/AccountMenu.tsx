import { MESSAGES, initials } from '@dsvhvn/dung-chung';
import { studentCodeOf } from '@dsvhvn/dung-chung/api';
import { ConfirmDialog, Icon, usePopover, useToast } from '@dsvhvn/dung-chung/ui';
import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { pathOf } from '../../access/screens';
import { useAuth } from '../../lib/auth/context';

// Menu tài khoản của học sinh: họ tên, mã học sinh, lớp; "Đổi mật khẩu"; "Đăng xuất" hỏi lại bằng hộp xác nhận chung
// rồi về trang chủ. Đăng xuất chỉ xóa access token trên trình duyệt.

const MENU_ITEM =
  'flex h-12 w-full items-center gap-4 px-4 text-left type-control text-(--dsv-drawer-item-fg) hover:bg-(--dsv-drawer-item-hover-bg)';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const { open, rootRef, buttonRef, toggle, close } = usePopover();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuId = useId();
  const navigate = useNavigate();
  const toast = useToast();

  if (!user) return null;
  const code = studentCodeOf(user);

  const signOut = () => {
    logout();
    setConfirmOpen(false);
    toast.success(MESSAGES.success('Đăng xuất'));
    navigate('/', { replace: true });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Tài khoản: ${user.fullName ?? code}`}
        onClick={toggle}
        className="flex size-12 items-center justify-center rounded-full transition-colors duration-(--dsv-duration-control) ease-header hover:bg-(--dsv-topbar-hover-bg)"
      >
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-primary-container type-control text-on-primary-container"
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
          <p className="truncate type-mono-label text-on-surface-variant">{code}</p>
          {user.class && <p className="mt-1 type-label text-on-surface-muted">Lớp {user.class.name}</p>}
        </div>
        <ul className="py-1">
          <li>
            <Link to={pathOf('profile')} onClick={close} className={MENU_ITEM}>
              <Icon name="user" size={20} />
              {user.schoolLevel === 1 ? 'Thẻ học sinh của em' : 'Hồ sơ của em'}
            </Link>
          </li>
          <li>
            <Link to={pathOf('changePassword')} onClick={close} className={MENU_ITEM}>
              <Icon name="key" size={20} />
              Đổi mật khẩu
            </Link>
          </li>
          <li className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              onClick={() => {
                close();
                setConfirmOpen(true);
              }}
              className={MENU_ITEM}
            >
              <Icon name="log-out" size={20} />
              Đăng xuất
            </button>
          </li>
        </ul>
      </div>

      <ConfirmDialog open={confirmOpen} title="Đăng xuất" confirmLabel="Đăng xuất" onConfirm={signOut} onClose={() => setConfirmOpen(false)}>
        {MESSAGES.confirm('đăng xuất tài khoản', code)}
      </ConfirmDialog>
    </div>
  );
}
