import { Icon } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { useAuth } from '../lib/auth/context';
import { NOTIFICATIONS_REFRESH_MS, notificationsQueryFn, notificationsQueryKey } from './notificationData';

// Nút Thông báo trên thanh điều hướng của học sinh: chấm đỏ ghi số thông báo chưa đọc, bấm mở trang Thông báo. Em còn phải đổi mật khẩu thì chưa hiện.

export function NotificationBell() {
  const { user } = useAuth();
  const ready = user !== null && !user.mustChangePassword;
  const query = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: notificationsQueryFn,
    enabled: ready,
    refetchInterval: NOTIFICATIONS_REFRESH_MS,
  });
  if (!ready) return null;
  const unread = query.data?.unreadCount ?? 0;
  return (
    <Link
      to={pathOf('notifications')}
      aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
      className="relative ml-1 flex size-12 shrink-0 items-center justify-center rounded-full text-(--dsv-topbar-icon) transition-colors duration-(--dsv-duration-control) ease-header hover:bg-(--dsv-topbar-hover-bg)"
    >
      <Icon name="bell" size={22} />
      {unread > 0 && (
        <span aria-hidden="true" className="absolute top-1.5 right-1 min-w-5 rounded-full bg-primary px-1 text-center type-label text-on-primary tabular-nums">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
