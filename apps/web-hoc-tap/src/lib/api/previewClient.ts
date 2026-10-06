import { createApiClient, createPreviewApi } from '@dsvhvn/dung-chung/api';
import { API_BASE_URL } from '../../config/env';

// Gọi API xem trước bản nháp di sản. Token quản trị hệ thống do web quản trị chuyển sang tab này (xem
// dung-chung/auth/previewToken) chỉ nằm trong bộ nhớ của tab xem trước: không ghi vào phiên đăng nhập của học sinh, không lưu
// ra máy. Máy chủ trả 404 chung cho mọi lý do không đọc được, nên không có thao tác kết thúc phiên ở đây.

let previewToken: string | null = null;

export const setPreviewToken = (token: string | null) => {
  previewToken = token;
};

export const previewApi = createPreviewApi(
  createApiClient({
    baseUrl: API_BASE_URL,
    getAccessToken: () => previewToken,
  }),
);
