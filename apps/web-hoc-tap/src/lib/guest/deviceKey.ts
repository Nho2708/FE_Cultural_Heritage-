import { createDeviceKey, isDeviceKey } from '@dsvhvn/dung-chung';

// Mã thiết bị ẩn danh của khách tham quan trên trình duyệt này: UUID phiên bản 4 sinh một lần, lưu ở localStorage (không hết hạn, mất khi khách xóa
// dữ liệu trang). Mã không chứa thông tin nào về người dùng; máy chủ chỉ dùng nó để gom lịch sử xem và gợi ý. Trình duyệt chặn lưu trữ thì mã chỉ sống
// trong bộ nhớ của tab này.

export const DEVICE_KEY_STORAGE_KEY = 'dsvhvn.hoc-tap.ma-thiet-bi';

let memoryKey: string | null = null;

/** Mã thiết bị của trình duyệt này; chưa có hoặc bị sửa sai định dạng thì sinh mã mới và lưu lại. */
export function getDeviceKey(): string {
  try {
    const stored = window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
    if (isDeviceKey(stored)) return stored.toLowerCase();
    const created = createDeviceKey();
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, created);
    return created;
  } catch {
    memoryKey ??= createDeviceKey();
    return memoryKey;
  }
}
