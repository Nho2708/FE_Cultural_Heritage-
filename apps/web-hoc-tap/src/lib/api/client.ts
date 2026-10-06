import { createAdsApi, createApiClient, createDiscoveryApi, createGuestApi, createStudentApi, sessionEndNotice } from '@dsvhvn/dung-chung/api';
import { API_BASE_URL } from '../../config/env';
import { sessionStore } from '../auth/session';
import { guestHeaders } from '../guest/tracking';

// Lớp gọi API của web học tập: tầng gọi API và endpoint của học sinh trong gói dùng chung (app mobile dùng lại),
// gắn với phiên đăng nhập của ứng dụng này. Máy chủ trả 401 cho token của phiên hiện tại (bị vô hiệu, lớp đã xóa,
// mật khẩu vừa được đặt lại hoặc đổi ở thiết bị khác, hết hạn) thì kết thúc phiên; màn hình đăng nhập hiện lý do.

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => sessionStore.getSession()?.accessToken ?? null,
  onUnauthorized: (response) => {
    if (sessionStore.getSession()?.accessToken === response.token) sessionStore.clear(sessionEndNotice(response));
  },
});

export const studentApi = createStudentApi(apiClient);

/**
 * Máy khách của các API công khai: không gắn token nên khách, học sinh và token hỏng đều xem như nhau (riêng tóm tắt di sản gắn token của học sinh để máy chủ
 * mở thẳng cổng quảng cáo cho học sinh). Khi người xem là khách tham quan thì mỗi
 * yêu cầu mang mã thiết bị ẩn danh (tiêu đề X-Device-Key) để máy chủ ghi lịch sử tìm, xem, đọc tóm tắt, xem 3D; học sinh và trang nhúng không mang mã.
 */
const publicClient = createApiClient({
  baseUrl: API_BASE_URL,
  // Chỉ các yêu cầu khai `auth: 'optional'` (tóm tắt di sản) mang token của học sinh; mọi yêu cầu công khai khác khai `auth: false` nên không bao giờ mang token.
  getAccessToken: () => sessionStore.getSession()?.accessToken ?? null,
  onUnauthorized: (response) => {
    if (sessionStore.getSession()?.accessToken === response.token) sessionStore.clear(sessionEndNotice(response));
  },
  extraHeaders: guestHeaders,
});

/** Khám phá di sản công khai (có ghi lịch sử của khách). */
export const discoveryApi = createDiscoveryApi(publicClient);

/** Máy khách không tự gắn mã thiết bị: nơi nào cần mã thì truyền tường minh (chức năng của khách), nơi nào không nên mang mã thì dùng nó (tải ngầm, "Gần bạn"). */
const plainClient = createApiClient({ baseUrl: API_BASE_URL, getAccessToken: () => null });

/**
 * Chức năng riêng của khách: cài đặt thiết bị, lịch sử, gợi ý, "Gần bạn". Mã thiết bị đi tường minh ở từng hàm; riêng "Gần bạn" không mang mã nào, vì
 * máy chủ không cần ghép vị trí với thiết bị.
 */
export const guestApi = createGuestApi(plainClient);

/**
 * Cùng API khám phá nhưng không bao giờ mang mã thiết bị: dùng cho việc tải ngầm khách không chủ động làm (ảnh bìa trang chủ lấy chi tiết của di sản đầu
 * danh sách), để lịch sử "đã xem" chỉ có những di sản khách thật sự mở.
 */
export const quietDiscoveryApi = createDiscoveryApi(plainClient);

/**
 * Quảng cáo Google có thưởng của khách: cấu hình, trạng thái mở khóa, bắt đầu và báo đã nhận thưởng ở web. Mã thiết bị đi tường minh ở từng hàm; học sinh không bao giờ gọi
 * (cổng chỉ hiện cho khách và máy chủ mở thẳng cho phiên học sinh).
 */
export const adsApi = createAdsApi(plainClient);
