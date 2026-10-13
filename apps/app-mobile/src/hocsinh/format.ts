// Chữ hiển thị của khu học: thời gian còn lại, huy hiệu, sao. Hàm thuần để kiểm bằng test đơn vị.

/** "12 phút 05 giây" hoặc "45 giây" từ số giây còn lại; âm hoặc không phải số thì coi là 0. */
export function remainingText(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds ?? NaN) ? (seconds as number) : 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest} giây`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} giờ ${String(minutes % 60).padStart(2, '0')} phút`;
  }
  return `${minutes} phút ${String(rest).padStart(2, '0')} giây`;
}

/** Đồng hồ làm bài "mm:ss" (hoặc "h:mm:ss" từ một giờ). */
export function clockText(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

/** Hàng sao: số sao đầy rồi sao rỗng cho đủ `max`. */
export function starsText(stars: number | null | undefined, max = 3): string {
  const filled = Math.min(max, Math.max(0, Math.round(stars ?? 0)));
  return '★'.repeat(filled) + '☆'.repeat(max - filled);
}

/** Các đoạn của thanh tiến trình bước ở cấp 1: các bước đã qua `done`, bước đang học `current`, các bước sau `todo`. Bước ngoài khoảng thì kẹp vào khoảng. */
export function stepSegments(step: number, total: number): Array<'done' | 'current' | 'todo'> {
  const count = Math.max(0, Math.floor(total));
  const current = Math.min(Math.max(Math.floor(step), 0), Math.max(count - 1, 0));
  return Array.from({ length: count }, (_, index) => (index < current ? 'done' : index === current ? 'current' : 'todo'));
}

/** Phần trăm làm tròn, rỗng khi không có số. */
export function percentText(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '';
}
