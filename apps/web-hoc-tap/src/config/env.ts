// Biến môi trường của web học tập. Bản build production bắt buộc khai báo; khi phát triển thì trỏ về máy mình.

const DEV_DEFAULTS = {
  api: 'http://localhost:5080/api/v1',
  adminWeb: 'http://localhost:5173',
};

const isDevOrTest = import.meta.env.DEV || import.meta.env.MODE === 'test';

function read(name: 'VITE_API_BASE_URL' | 'VITE_ADMIN_WEB_URL', devDefault: string): string {
  const raw = import.meta.env[name]?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (isDevOrTest) return devDefault;
  throw new Error(`Thiếu biến môi trường ${name} (xem .env.example).`);
}

export const API_BASE_URL = read('VITE_API_BASE_URL', DEV_DEFAULTS.api);

/**
 * Địa chỉ tải tệp cài đặt Android của app học tập. Tùy chọn: chưa có tệp thì để trống, trang chủ ghi rõ bản cài đặt
 * chưa có thay vì hiện nút không dẫn đi đâu.
 */
export const ANDROID_APP_URL: string | null = import.meta.env.VITE_ANDROID_APP_URL?.trim() || null;

/** Web quản trị: nơi thầy cô đăng nhập. */
export const ADMIN_WEB_URL = read('VITE_ADMIN_WEB_URL', DEV_DEFAULTS.adminWeb);
