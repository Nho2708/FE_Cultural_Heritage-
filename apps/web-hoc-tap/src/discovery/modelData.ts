import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { localeOf } from '../i18n/format';

// Trình xem 3D: cảnh báo dung lượng trước khi tải trên mạng di động và chữ dung lượng theo ngôn ngữ đang chọn.

/** Mô hình từ mức này trở lên thì hỏi trước khi tải nếu đang dùng mạng di động hoặc tiết kiệm dữ liệu. */
export const HEAVY_MODEL_BYTES = 5 * 1024 * 1024;

/** Phần của Network Information API mà trình xem đọc (không có ở mọi trình duyệt). */
export interface NetworkInformation {
  saveData?: boolean;
  type?: string;
  effectiveType?: string;
}

/** Tình trạng mạng của trình duyệt, không có thì undefined. */
export function currentConnection(): NetworkInformation | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

/**
 * Có nên hỏi người dùng trước khi tải mô hình: mô hình nặng (từ 5 MB) mà đang dùng mạng di động, chế độ tiết kiệm dữ liệu hoặc mạng chậm
 * (2G, 3G). Không biết tình trạng mạng (trình duyệt không hỗ trợ) thì tải luôn, vì nhiều máy tính để bàn không báo gì.
 */
export function shouldWarnBeforeLoad(sizeBytes: number, connection: NetworkInformation | undefined): boolean {
  if (sizeBytes < HEAVY_MODEL_BYTES || !connection) return false;
  return (
    connection.saveData === true ||
    connection.type === 'cellular' ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.effectiveType === '3g'
  );
}

/** Dung lượng dễ đọc theo ngôn ngữ: "4,2 MB" (Việt), "4.2 MB" (Anh, Hàn, Trung, Nhật); dưới 1 MB tính bằng KB. */
export function formatModelSize(bytes: number, language: LanguageCode): string {
  const locale = localeOf(language);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}
