import emblemSrc from '../assets/brand/bieu-tuong-64.png';
import badgeSrc from '../assets/brand/huy-hieu-256.png';
import { cn } from '../cn';

// Biểu trưng "Vietnam Heritage". Hai dạng: "emblem" là cổng đình trên nền kem, không chữ, dùng cho thanh trên và chỗ nhỏ;
// "badge" là huy hiệu tròn có chữ vòng cung, dùng ở màn hình Đăng nhập và chỗ đủ rộng để đọc chữ. Tên thương hiệu không dịch.
// `decorative` để chỗ đã có tên thương hiệu viết bằng chữ ngay cạnh: ảnh khi đó không đọc lên lần nữa.

export const BRAND_NAME = 'Vietnam Heritage';

export interface BrandLogoProps {
  variant?: 'emblem' | 'badge';
  /** Cạnh ảnh theo px, ghi rõ vào thẻ ảnh để trang không dịch chuyển khi ảnh tải xong. */
  size?: number;
  decorative?: boolean;
  className?: string;
}

export function BrandLogo({ variant = 'emblem', size = 32, decorative = false, className }: BrandLogoProps) {
  return (
    <img
      src={variant === 'badge' ? badgeSrc : emblemSrc}
      width={size}
      height={size}
      alt={decorative ? '' : BRAND_NAME}
      decoding="async"
      className={cn('shrink-0 rounded-full object-contain', className)}
    />
  );
}
