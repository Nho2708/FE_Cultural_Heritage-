/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gốc API gồm tiền tố phiên bản, ví dụ http://localhost:5080/api/v1. */
  readonly VITE_API_BASE_URL?: string;
  /** Địa chỉ web học tập, ví dụ http://localhost:5174. */
  readonly VITE_LEARNING_WEB_URL?: string;
  /** `false` để ẩn ghi chú môi trường thử VNPay ở màn hình Chọn gói và thanh toán; mặc định hiện. */
  readonly VITE_VNPAY_SANDBOX_NOTE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
