import { useState, type CSSProperties } from 'react';
import textLayerSrc from '../assets/brand/huy-hieu-lop-chu-400.png';
import gateLayerSrc from '../assets/brand/huy-hieu-lop-cong-400.png';
import { cn } from '../cn';
import { BRAND_NAME, BrandLogo } from './BrandLogo';
import { usePrefersReducedMotion } from './motion';

// Huy hiệu "Vietnam Heritage" chuyển động khi vào trang (đoạn "Logo vào" của kế hoạch chuyển động giới thiệu), dựng từ
// ảnh logo đã tách lớp vì logo chưa có bản vector:
//   0–400 ms     vòng vàng tự vẽ theo chiều kim đồng hồ từ đỉnh (nét SVG), vành xanh than hiện mờ dần;
//   200–700 ms   đĩa kem phóng từ 92% lên 100% và hiện dần;
//   500–1300 ms  cổng lầu mọc lên từ bậc thềm theo năm dải ngang, mỗi dải lệch 120 ms, mái trên "đáp" nhẹ;
//   1500–2100 ms chữ "Vietnam Heritage" hiện dần theo cung từ trái sang phải;
//   tới 2400 ms  giữ yên. Chạy một lần, không lặp.
// Chuyển động chỉ bắt đầu khi hai ảnh lớp đã tải (hoặc tải lỗi), để cổng và chữ không hiện muộn giữa chừng.
// Người dùng bật giảm chuyển động thì hiện ảnh huy hiệu tĩnh. Kiểu và khung thời gian ở styles/chuyen-dong.css.

/** Năm dải ngang của cổng lầu, từ dưới lên: [mép trên, mép dưới] theo phần trăm cạnh huy hiệu. */
const TIERS: ReadonlyArray<readonly [number, number]> = [
  [67, 100], // bậc thềm và thân dưới
  [58.5, 67], // mái dưới
  [51, 58.5], // thân giữa và lan can
  [43, 51], // mái giữa
  [0, 43], // mái trên
];

/** Các dải chồng lên nhau 0,6% để mép cắt không để lộ đường kẻ mảnh. */
const OVERLAP = 0.6;

export interface AnimatedLogoProps {
  /** Cạnh huy hiệu theo px. Bỏ trống để đặt cạnh bằng lớp CSS (đổi cỡ theo bề rộng màn hình). */
  size?: number;
  /** Có tên thương hiệu bằng chữ ngay cạnh thì để true: huy hiệu không đọc lên lần nữa. */
  decorative?: boolean;
  className?: string;
}

export function AnimatedLogo({ size, decorative = false, className }: AnimatedLogoProps) {
  const reduced = usePrefersReducedMotion();
  const [loaded, setLoaded] = useState(0);
  const markLoaded = () => setLoaded((count) => count + 1);
  if (reduced) return <BrandLogo variant="badge" size={size ?? 160} decorative={decorative} className={className} />;

  const label = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': BRAND_NAME };
  return (
    <span {...label} data-logo-motion={loaded >= 2 ? 'ready' : 'loading'} className={cn('dsv-logo-motion', className)} style={size === undefined ? undefined : { width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="dsv-logo-motion__ring">
        <circle cx="50" cy="50" r="48.4" className="dsv-logo-motion__navy" />
        <circle cx="50" cy="50" r="48.9" pathLength={1} transform="rotate(-90 50 50)" className="dsv-logo-motion__gold" />
      </svg>
      <span aria-hidden="true" className="dsv-logo-motion__disc" />
      {TIERS.map(([top, bottom], index) => (
        <img
          key={top}
          src={gateLayerSrc}
          alt=""
          aria-hidden="true"
          decoding="async"
          onLoad={index === 0 ? markLoaded : undefined}
          onError={index === 0 ? markLoaded : undefined}
          className={cn('dsv-logo-motion__tier', index === TIERS.length - 1 && 'dsv-logo-motion__tier--roof')}
          style={{ '--tier': index, clipPath: `inset(${Math.max(0, top - OVERLAP)}% 0 ${100 - bottom}% 0)` } as CSSProperties}
        />
      ))}
      <img
        src={textLayerSrc}
        alt=""
        aria-hidden="true"
        decoding="async"
        onLoad={markLoaded}
        onError={markLoaded}
        className="dsv-logo-motion__text"
      />
    </span>
  );
}
