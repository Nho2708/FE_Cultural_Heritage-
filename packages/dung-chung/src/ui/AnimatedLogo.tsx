import { cn } from '../cn';
import { BRAND_NAME, BrandLogo } from './BrandLogo';
import { BRAND_MARK_FULL } from './brandMark';
import { usePrefersReducedMotion } from './motion';

// Biểu tượng "DiViet" chuyển động khi vào trang (đoạn "Logo vào" của kế hoạch chuyển động giới thiệu), dựng từ bốn phần
// của biểu tượng vector. Chạy một lần khi hiện ra, khoảng 1,1 giây rồi giữ yên:
//   0–450 ms     hai trang sách mở ra từ gáy sách (phóng ngang từ 15% lên 100%), hiện dần trong 200 ms đầu;
//   250–850 ms   mái đình từ trên rơi xuống, vượt nhẹ rồi về chỗ;
//   550–1050 ms  nóc rơi xuống cùng kiểu, trễ hơn mái.
// Người dùng bật giảm chuyển động thì hiện biểu tượng tĩnh. Kiểu và khung thời gian ở styles/chuyen-dong.css.

export interface AnimatedLogoProps {
  /** Chiều cao theo px. Bỏ trống để đặt chiều rộng bằng lớp CSS (đổi cỡ theo bề rộng màn hình), chiều cao theo tỉ lệ hình. */
  size?: number;
  /** Có tên thương hiệu bằng chữ ngay cạnh thì để true: biểu tượng không đọc lên lần nữa. */
  decorative?: boolean;
  /** Luôn dùng bộ màu cho nền tối (khối nền xanh than cố định), bất kể giao diện đang chọn. */
  onDark?: boolean;
  className?: string;
}

export function AnimatedLogo({ size, decorative = false, onDark = false, className }: AnimatedLogoProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <BrandLogo variant="badge" size={size ?? 112} decorative={decorative} onDark={onDark} className={className} />;

  const label = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': BRAND_NAME };
  return (
    <svg
      {...label}
      focusable="false"
      viewBox={BRAND_MARK_FULL.viewBox}
      width={size === undefined ? undefined : Math.round(size * BRAND_MARK_FULL.aspect * 100) / 100}
      height={size}
      data-logo-motion="play"
      style={{ aspectRatio: BRAND_MARK_FULL.aspect }}
      className={cn('dsv-brand-mark dsv-logo-motion shrink-0', onDark && 'dsv-brand-mark--on-dark', className)}
    >
      {BRAND_MARK_FULL.parts.map((part) => (
        <path key={part.id} d={part.d} className={cn(`dsv-brand-mark__${part.role}`, `dsv-logo-motion__${part.id}`)} />
      ))}
    </svg>
  );
}
