import type { StudentProfile } from '@dsvhvn/dung-chung/api';
import { matchPath } from 'react-router';
import { SCREENS, pathOf, type Screen } from './screens';

export type AccessDecision =
  /** Được mở. */
  | 'allow'
  /** Khách mở màn hình của khu học → chuyển tới Học sinh đăng nhập, nhớ trang đang mở. */
  | 'login'
  /** Học sinh đã đăng nhập mở màn hình chỉ cho Khách (Học sinh đăng nhập) → về trang học. */
  | 'signed-in'
  /** Tài khoản đang bị buộc đổi mật khẩu: mọi màn hình khác chuyển về Đổi mật khẩu. */
  | 'change-password';

type Learner = Pick<StudentProfile, 'mustChangePassword'> | null | undefined;

export function resolveAccess(target: Pick<Screen, 'key' | 'actors'>, user: Learner): AccessDecision {
  // Lần đầu đăng nhập hoặc vừa được giáo viên đặt lại mật khẩu: không vào được trang nào khác cho tới khi đổi xong.
  if (user?.mustChangePassword && target.key !== 'changePassword') return 'change-password';
  const actor = user ? 'STUDENT' : 'Guest';
  if (target.actors.includes(actor)) return 'allow';
  return actor === 'Guest' ? 'login' : 'signed-in';
}

/** Màn hình ứng với một pathname, hoặc undefined. Đường dẫn tĩnh thắng đường dẫn có tham số. */
export function screenForPath(pathname: string): Screen | undefined {
  const matches = (p: string | null) => p !== null && matchPath({ path: p, end: true }, pathname) !== null;
  const all: readonly Screen[] = SCREENS;
  return (
    all.find((s) => [s.path, ...(s.aliases ?? [])].some((p) => p !== null && !p.includes(':') && matches(p))) ??
    all.find((s) => [s.path, ...(s.aliases ?? [])].some(matches))
  );
}

/** Trang mở bằng đường dẫn chứa mã bài học — sau khi đăng nhập, bài học tự mở. */
export function isLessonPath(from: string | null | undefined): boolean {
  const pathname = from?.split(/[?#]/)[0] ?? '';
  return screenForPath(pathname)?.key === 'lesson';
}

/**
 * Nơi chuyển tới sau khi đăng nhập: đang bị buộc đổi mật khẩu thì Đổi mật khẩu (trang bị chặn trước đó mở tiếp sau khi
 * đổi xong); còn lại là trang bị chặn trước đó nếu học sinh mở được, không thì trang học của em.
 */
export function postLoginTarget(user: NonNullable<Learner>, from: string | null | undefined): string {
  if (user.mustChangePassword) return changePasswordPath(from);
  return safeReturnPath(from) ?? pathOf('learnHome');
}

/** Tham số trên URL của Đổi mật khẩu giữ trang sẽ mở sau khi đổi xong. */
export const RETURN_PARAM = 'sau';

/** Đường dẫn tới Đổi mật khẩu, kèm trang mở tiếp sau khi đổi xong nếu có. */
export function changePasswordPath(next: string | null | undefined): string {
  const safe = safeReturnPath(next);
  return safe ? `${pathOf('changePassword')}?${RETURN_PARAM}=${encodeURIComponent(safe)}` : pathOf('changePassword');
}

/** Đường dẫn nội bộ an toàn mà học sinh đã đăng nhập mở được, hoặc null. */
export function safeReturnPath(from: string | null | undefined): string | null {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return null;
  const target = screenForPath(from.split(/[?#]/)[0] ?? '');
  return target && target.actors.includes('STUDENT') && target.key !== 'changePassword' ? from : null;
}
