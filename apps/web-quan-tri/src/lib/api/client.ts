import { createApiClient, sessionEndNotice } from '@dsvhvn/dung-chung/api';
import { API_BASE_URL } from '../../config/env';
import { sessionStore } from '../auth/session';

// Lớp gọi API của web quản trị: tầng gọi API dùng chung gắn với phiên đăng nhập của ứng dụng này.
// Máy chủ trả 401 cho token của phiên hiện tại (bị khóa, trường ngừng, mật khẩu đổi ở nơi khác, hết hạn) thì kết thúc
// phiên; màn hình Đăng nhập hiện lý do. 401 của một token cũ không xóa phiên mới vừa đăng nhập ở tab khác.

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => sessionStore.getSession()?.accessToken ?? null,
  onUnauthorized: (response) => {
    if (sessionStore.getSession()?.accessToken === response.token) sessionStore.clear(sessionEndNotice(response));
  },
});

export const apiRequest = apiClient.request;
