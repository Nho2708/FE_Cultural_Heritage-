import { MESSAGES } from './messages';

// Tệp ảnh tải lên kho tệp của nền tảng: quy tắc kiểm phía giao diện (cùng giới hạn với backend; backend vẫn kiểm theo nội
// dung tệp và là nơi quyết định) và cách đổi đường dẫn trong kho thành địa chỉ mở được từ trình duyệt.

export const IMAGE_UPLOAD = {
  /** Ảnh tải lên tối đa 5 MB. */
  maxBytes: 5 * 1024 * 1024,
  extensions: ['jpg', 'jpeg', 'png', 'webp'],
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  /** Giá trị cho thuộc tính `accept` của ô chọn tệp. */
  accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
} as const;

export interface PickedFile {
  name: string;
  size: number;
  type: string;
}

const extensionOf = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

/** Dung lượng dễ đọc: "850 KB", "4,2 MB" (dấu phẩy thập phân của tiếng Việt). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Lỗi của tệp ảnh đã chọn (null là hợp lệ): rỗng, sai định dạng theo đuôi hoặc loại tệp, quá 5 MB. */
export function validateImageFile(file: PickedFile | null): string | null {
  if (!file) return MESSAGES.required('tệp ảnh');
  if (file.size === 0) return MESSAGES.invalid('Tệp ảnh', 'tệp rỗng');
  const goodExtension = (IMAGE_UPLOAD.extensions as readonly string[]).includes(extensionOf(file.name));
  const goodType = file.type === '' || (IMAGE_UPLOAD.mimeTypes as readonly string[]).includes(file.type);
  if (!goodExtension || !goodType) return MESSAGES.invalid('Tệp ảnh', 'chỉ nhận định dạng JPG, PNG hoặc WEBP');
  if (file.size > IMAGE_UPLOAD.maxBytes) {
    return MESSAGES.invalid('Tệp ảnh', `tối đa 5 MB, tệp này ${formatFileSize(file.size)}`);
  }
  return null;
}

/**
 * Trình duyệt có giải mã được ảnh ở địa chỉ này không. Tệp đổi đuôi thành .jpg nhưng không phải ảnh qua được kiểm tên và loại
 * tệp, chỉ lộ ra khi vẽ: hỏi trước khi hiện xem trước để không hiện khung ảnh hỏng. Backend vẫn kiểm bằng nội dung tệp.
 */
export function canDecodeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

/**
 * Đường dẫn tệp trong kho dạng `/files/...` là đường dẫn tương đối so với máy chủ API, nên phải ghép với địa chỉ gốc của API
 * (bỏ phần `/api/v1`). Đường dẫn đủ địa chỉ (cấu hình `Storage:PublicBaseUrl` hoặc ảnh ngoài) giữ nguyên.
 */
export function resolveFileUrl(url: string | null | undefined, apiBaseUrl: string): string | null {
  if (!url) return null;
  if (!url.startsWith('/files/')) return url;
  try {
    return new URL(url, apiBaseUrl).href;
  } catch {
    return url;
  }
}
