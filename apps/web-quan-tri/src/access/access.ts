import type { StaffRole } from '@dsvhvn/dung-chung/api';
import { matchPath } from 'react-router';
import { AREA_ROOT, SCREENS, pathOf, type Actor, type Screen } from './screens';

export type AccessDecision =
  /** Được mở. */
  | 'allow'
  /** Khách mở màn hình cần đăng nhập → chuyển tới Đăng nhập, nhớ trang đang mở. */
  | 'login'
  /** Đã đăng nhập mà mở Đăng nhập, Quên / đặt mật khẩu → chuyển về trang mặc định của vai trò. */
  | 'signed-in'
  /** Đã đăng nhập nhưng vai trò không có quyền → trang 403. */
  | 'forbidden';

export function actorOf(role: StaffRole | null | undefined): Actor {
  return role ?? 'Guest';
}

export function resolveAccess(target: Pick<Screen, 'actors'>, role: StaffRole | null | undefined): AccessDecision {
  const actor = actorOf(role);
  if (target.actors.includes(actor)) return 'allow';
  if (actor === 'Guest') return 'login';
  if (target.actors.length === 1 && target.actors[0] === 'Guest') return 'signed-in';
  return 'forbidden';
}

export function canOpen(target: Pick<Screen, 'actors'>, role: StaffRole | null | undefined): boolean {
  return resolveAccess(target, role) === 'allow';
}

/** Màn hình ứng với một pathname (bỏ query), hoặc undefined nếu không có. Đường dẫn tĩnh thắng đường dẫn có tham số. */
export function screenForPath(pathname: string): Screen | undefined {
  const matches = (p: string | null) => p !== null && matchPath({ path: p, end: true }, pathname) !== null;
  const all: readonly Screen[] = SCREENS;
  return (
    all.find((s) => [s.path, ...(s.aliases ?? [])].some((p) => p !== null && !p.includes(':') && matches(p))) ??
    all.find((s) => [s.path, ...(s.aliases ?? [])].some(matches))
  );
}

/**
 * Trang vào mặc định theo vai trò, dùng sau khi đăng nhập và cho nút "Về trang làm việc của tôi".
 * Giáo viên → Hồ sơ cá nhân cho tới khi màn hình Lớp học được dựng; quản trị trường → Tổng quan trường và quản trị
 * hệ thống → Tổng quan và doanh thu.
 */
export function roleHome(role: StaffRole): string {
  switch (role) {
    case 'TEACHER':
      return pathOf('profile');
    case 'ORG_ADMIN':
      return pathOf('schoolOverview');
    case 'ADMIN':
      return pathOf('adminOverview');
  }
}

/** Lối vào khu làm việc của vai trò. */
export function workArea(role: StaffRole): { to: string; label: string } {
  switch (role) {
    case 'TEACHER':
      return { to: AREA_ROOT.teacher, label: 'Vào khu giáo viên' };
    case 'ORG_ADMIN':
      return { to: AREA_ROOT.school, label: 'Vào khu quản trị trường' };
    case 'ADMIN':
      return { to: AREA_ROOT.admin, label: 'Vào khu quản trị' };
  }
}

/**
 * Nơi chuyển tới sau khi đăng nhập thành công. Nếu người dùng bị chặn giữa chừng (route guard gửi `from`) và vai trò
 * mở được trang đó thì quay lại trang đó; còn lại về trang mặc định của vai trò.
 */
export function postLoginTarget(role: StaffRole, from: string | null | undefined): string {
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    const pathname = from.split(/[?#]/)[0] ?? '';
    const target = screenForPath(pathname);
    if (target && canOpen(target, role)) return from;
    // Tiền tố khu vực không phải màn hình (/giao-vien chuyển tới Lớp học): cho qua nếu vai trò đúng khu.
    if (pathname === workArea(role).to) return from;
  }
  return roleHome(role);
}
