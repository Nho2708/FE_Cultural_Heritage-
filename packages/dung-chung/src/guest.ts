// Mã thiết bị ẩn danh của khách tham quan và chữ khoảng cách "Gần bạn", dùng chung cho web học tập và app.

/** UUID phiên bản 4 (chữ thường hoặc hoa), đúng quy tắc của máy chủ. */
const DEVICE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDeviceKey(value: unknown): value is string {
  return typeof value === 'string' && DEVICE_KEY.test(value);
}

/** Sinh mã thiết bị mới (UUID phiên bản 4) bằng bộ sinh ngẫu nhiên mật mã của môi trường; không có thì ném lỗi thay vì dùng Math.random. */
export function createDeviceKey(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  if (typeof c?.getRandomValues !== 'function') throw new Error('Môi trường không có bộ sinh số ngẫu nhiên an toàn để tạo mã thiết bị.');
  const bytes = c.getRandomValues(new Uint8Array(16));
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
