import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { MAU } from '../brand';

/**
 * Nền thương hiệu: xanh than đậm, quầng vàng góc trên phải, quầng đỏ son góc dưới trái (giữ đúng nền video cũ).
 * Vòng tròn mảnh như vành huy hiệu không vẽ sẵn ở nền: cảnh nào cần thì đặt VongManh đúng chỗ để không cắt ngang chữ.
 * Thêm lớp hạt mịn khoảng 1,5% để chuyển màu không bị phân dải sau khi nén 8 bit.
 */
export function NenThuongHieu({ children }: { children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ backgroundColor: MAU.navy, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 82% 18%, rgba(193,141,72,0.16), transparent 55%), radial-gradient(circle at 8% 96%, rgba(217,87,58,0.12), transparent 50%)`,
        }}
      />
      {children}
      <HatMin />
    </AbsoluteFill>
  );
}

/** Hạt mịn tĩnh phủ toàn khung (dither), không đổi theo khung hình để bộ nén không tốn bit. */
export function HatMin({ doDam = 0.06 }: { doDam?: number }) {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity: doDam }}>
      <svg width="100%" height="100%">
        <filter id="hat-min">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hat-min)" />
      </svg>
    </AbsoluteFill>
  );
}

/** Vòng tròn mảnh màu vàng như vành huy hiệu, tâm (x, y), bán kính r (px). */
export function VongManh({ x, y, r, doDam = 0.16 }: { x: number; y: number; r: number; doDam?: number }) {
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `2px solid rgba(193,141,72,${doDam})` }} />;
}
