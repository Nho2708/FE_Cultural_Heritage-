import { cn } from '../cn';
import { BRAND_MARK_FULL, BRAND_MARK_SMALL } from './brandMark';

// Biểu trưng "DiViet": mái đình che quyển sách mở, vẽ bằng SVG nên sắc ở mọi cỡ. Hai dạng đều chỉ là hình, không có chữ:
// "emblem" là bản nhỏ (không nóc) cho thanh trên và chỗ nhỏ; "badge" là bản đầy đủ cho màn hình Đăng nhập và chỗ đủ rộng.
// Màu mái và sách đổi theo giao diện sáng / tối (xem styles/nen.css); `onDark` ép bộ màu nền tối cho chỗ luôn có nền tối.
// Tên thương hiệu không dịch; nơi cần hiện tên thì viết bằng chữ cạnh hình.
// `decorative` để chỗ đã có tên thương hiệu viết ngay cạnh: hình khi đó không đọc lên lần nữa.

export const BRAND_NAME = 'DiViet';

export interface BrandLogoProps {
  variant?: 'emblem' | 'badge';
  /** Chiều cao hình theo px; chiều rộng suy ra từ tỉ lệ của hình, ghi rõ vào thẻ để trang không dịch chuyển. */
  size?: number;
  decorative?: boolean;
  /** Luôn dùng bộ màu cho nền tối (khối nền xanh than cố định), bất kể giao diện đang chọn. */
  onDark?: boolean;
  className?: string;
}

export function BrandLogo({ variant = 'emblem', size = 32, decorative = false, onDark = false, className }: BrandLogoProps) {
  const shape = variant === 'badge' ? BRAND_MARK_FULL : BRAND_MARK_SMALL;
  const label = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': BRAND_NAME };
  return (
    <svg
      {...label}
      focusable="false"
      viewBox={shape.viewBox}
      width={Math.round(size * shape.aspect * 100) / 100}
      height={size}
      className={cn('dsv-brand-mark shrink-0', onDark && 'dsv-brand-mark--on-dark', className)}
    >
      {shape.parts.map((part) => (
        <path key={part.id} d={part.d} className={`dsv-brand-mark__${part.role}`} />
      ))}
    </svg>
  );
}
