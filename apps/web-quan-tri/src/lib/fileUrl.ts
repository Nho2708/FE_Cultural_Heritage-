import { resolveFileUrl } from '@dsvhvn/dung-chung';
import { API_BASE_URL } from '../config/env';

/**
 * Địa chỉ mở được từ trình duyệt của một tệp ảnh. Ảnh tải lên kho tệp có đường dẫn tương đối `/files/...` (khi máy chủ không
 * cấu hình địa chỉ công khai), nên phải ghép với máy chủ API; ảnh thêm bằng đường dẫn http, https giữ nguyên.
 */
export function fileUrl(url: string | null | undefined): string | null {
  return resolveFileUrl(url, API_BASE_URL);
}
