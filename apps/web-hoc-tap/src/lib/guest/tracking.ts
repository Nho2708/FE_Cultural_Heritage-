import { GUEST_HEADERS } from '@dsvhvn/dung-chung/api';
import { sessionStore } from '../auth/session';
import { getDeviceKey } from './deviceKey';

// Khi nào yêu cầu công khai mang mã thiết bị (để máy chủ ghi lịch sử xem của khách):
// - học sinh đã đăng nhập thì không (học sinh không bị ghi lịch sử và không dùng chức năng của khách; máy chủ cũng nhận ra phiên học sinh từ token,
//   nhưng các API khám phá công khai không gửi token nên ở đây phải tự không gửi mã);
// - trang nhúng cho app (bản đồ, trình xem 3D trong WebView) thì không: app có mã thiết bị riêng và tự ghi lịch sử, mã sinh trong WebView chỉ làm
//   thêm các thiết bị ma.

/** Đường dẫn của các trang nhúng cho app, không đi kèm mã thiết bị. */
const EMBED_PREFIX = '/nhung/';

export function isEmbedPath(pathname: string = typeof window === 'undefined' ? '' : window.location.pathname): boolean {
  return pathname.startsWith(EMBED_PREFIX);
}

/** Có đang là khách tham quan (chưa đăng nhập, không ở trang nhúng) để ghi lịch sử và dùng chức năng của khách. */
export function isGuestTracking(): boolean {
  return sessionStore.getSession() === null && !isEmbedPath();
}

/** Tiêu đề gắn vào yêu cầu công khai: mã thiết bị và nền tảng WEB của khách; rỗng khi không phải khách. */
export function guestHeaders(): Record<string, string> {
  if (!isGuestTracking()) return {};
  return { [GUEST_HEADERS.deviceKey]: getDeviceKey(), [GUEST_HEADERS.platform]: 'WEB' };
}
