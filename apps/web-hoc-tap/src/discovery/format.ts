import { safeUrl as safeUrlOf, displayImageUrl as displayImageUrlOf } from '@dsvhvn/dung-chung/heritage-text';
import { API_BASE_URL } from '../config/env';

// Chữ hiển thị của trang khám phá nằm ở gói dùng chung (app mobile dùng lại); hai hàm xử lý địa chỉ ảnh được gắn sẵn địa chỉ máy chủ API của web.
export * from '@dsvhvn/dung-chung/heritage-text';

/** Địa chỉ chỉ nhận http/https; đường dẫn `/files/...` ghép với máy chủ API. */
export const safeUrl = (url: string | null | undefined): string | null => safeUrlOf(url, API_BASE_URL);

/** Ảnh Wikimedia Commons thu nhỏ vừa đủ độ rộng cần hiển thị. */
export const displayImageUrl = (url: string | null | undefined, width: number): string | null => displayImageUrlOf(url, width, API_BASE_URL);
