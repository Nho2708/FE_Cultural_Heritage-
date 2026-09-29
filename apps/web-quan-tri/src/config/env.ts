// Biến môi trường của web quản trị. Bản build production bắt buộc khai báo; khi phát triển thì trỏ về máy mình.

const DEV_DEFAULTS = {
  api: 'http://localhost:5080/api/v1',
  learningWeb: 'http://localhost:5174',
};

const isDevOrTest = import.meta.env.DEV || import.meta.env.MODE === 'test';

function read(name: 'VITE_API_BASE_URL' | 'VITE_LEARNING_WEB_URL', devDefault: string): string {
  const raw = import.meta.env[name]?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (isDevOrTest) return devDefault;
  throw new Error(`Thiếu biến môi trường ${name} (xem .env.example).`);
}

export const API_BASE_URL = read('VITE_API_BASE_URL', DEV_DEFAULTS.api);

/** Web học tập: trang khám phá di sản công khai và nơi học sinh đăng nhập. */
export const LEARNING_WEB_URL = read('VITE_LEARNING_WEB_URL', DEV_DEFAULTS.learningWeb);
