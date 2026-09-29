import { createApiClient, createDiscoveryApi, createStudentApi, sessionEndNotice } from '@dsvhvn/dung-chung/api';
import { API_BASE_URL } from '../../config/env';
import { sessionStore } from '../auth/session';

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

/** Khám phá di sản công khai: không gắn token nên khách, học sinh và token hỏng đều xem như nhau. */
export const discoveryApi = createDiscoveryApi(apiClient);
