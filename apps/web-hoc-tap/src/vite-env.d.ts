/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gốc API gồm tiền tố phiên bản, ví dụ http://localhost:5080/api/v1. */
  readonly VITE_API_BASE_URL?: string;
  /** Địa chỉ web quản trị, ví dụ http://localhost:5173. */
  readonly VITE_ADMIN_WEB_URL?: string;
  /** Địa chỉ tải tệp cài đặt Android; bỏ trống khi chưa có tệp. */
  readonly VITE_ANDROID_APP_URL?: string;
  /** Thư mục gốc chứa video giới thiệu; bỏ trống khi chưa có video. */
  readonly VITE_INTRO_VIDEO_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
