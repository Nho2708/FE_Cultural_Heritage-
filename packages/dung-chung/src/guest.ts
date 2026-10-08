// Mã thiết bị ẩn danh của khách tham quan và chữ khoảng cách "Gần bạn", dùng chung cho web học tập và app.

/** UUID phiên bản 4 (chữ thường hoặc hoa), đúng quy tắc của máy chủ. */
const DEVICE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDeviceKey(value: unknown): value is string {
  return typeof value === 'string' && DEVICE_KEY.test(value);
}

/**
 * Sinh mã thiết bị mới (UUID phiên bản 4) bằng bộ sinh ngẫu nhiên mật mã; không có thì ném lỗi thay vì dùng Math.random.
 * Mặc định dùng bộ sinh của môi trường; app truyền `fillRandom` của expo-crypto vì trình duyệt chỉ có `crypto.randomUUID` trên https hoặc localhost,
 * còn bản web mở trên điện thoại qua IP mạng nội bộ thì không có.
 */
export function createDeviceKey(fillRandom?: (bytes: Uint8Array<ArrayBuffer>) => unknown): string {
  const c = globalThis.crypto;
  if (!fillRandom && typeof c?.randomUUID === 'function') return c.randomUUID();
  const fill = fillRandom ?? (typeof c?.getRandomValues === 'function' ? (bytes: Uint8Array<ArrayBuffer>) => c.getRandomValues(bytes) : undefined);
  if (!fill) throw new Error('Môi trường không có bộ sinh số ngẫu nhiên an toàn để tạo mã thiết bị.');
  const bytes = new Uint8Array(16);
  fill(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

/** Khoảng cách của "Gần bạn": dưới 1000 m hiện mét, từ 1000 m hiện km làm tròn một chữ số, số theo cách viết của `locale`. */
export function formatDistance(meters: number, locale: string): string {
  if (meters < 1000) return `${Math.round(meters).toLocaleString(locale)} m`;
  return `${(Math.round(meters / 100) / 10).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km`;
}
