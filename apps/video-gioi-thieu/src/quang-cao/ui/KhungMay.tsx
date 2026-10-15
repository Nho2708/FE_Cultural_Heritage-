import type { CSSProperties, ReactNode } from 'react';
import { MAU } from '../../brand';

/** Tỉ lệ màn hình điện thoại theo khung chụp của app (393 × 852 điểm). */
export const TI_LE_MAN = 852 / 393;

/** Kích thước một chiếc điện thoại theo bề rộng màn hình (px video): viền, bo góc, tổng rộng và cao. */
export function coMay(rongMan: number) {
  const vien = Math.round(rongMan * 0.035);
  const caoMan = rongMan * TI_LE_MAN;
  return { vien, caoMan, rong: rongMan + vien * 2, cao: caoMan + vien * 2, boNgoai: rongMan * 0.14, boTrong: rongMan * 0.115 };
}

/**
 * Khung điện thoại phẳng màu xanh than (cùng kiểu khung trong video cũ), màn hình rộng `rongMan` px.
 * Nội dung màn hình đặt tuyệt đối trong vùng rongMan × rongMan·TI_LE_MAN.
 */
export function KhungMay({ rongMan, children, style }: { rongMan: number; children?: ReactNode; style?: CSSProperties }) {
  const c = coMay(rongMan);
  return (
    <div
      style={{
        position: 'absolute',
        width: c.rong,
        height: c.cao,
        padding: c.vien,
        boxSizing: 'border-box',
        borderRadius: c.boNgoai,
        backgroundColor: MAU.navyDam,
        boxShadow: `0 ${rongMan * 0.08}px ${rongMan * 0.16}px rgba(0,0,0,0.5), inset 0 0 0 3px #4A4D60`,
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: rongMan, height: c.caoMan, borderRadius: c.boTrong, overflow: 'hidden', backgroundColor: '#F7F3EC' }}>
        {children}
        <div style={{ position: 'absolute', top: rongMan * 0.03, left: '50%', width: rongMan * 0.28, height: rongMan * 0.075, marginLeft: -rongMan * 0.14, borderRadius: 999, backgroundColor: '#0E0F14' }} />
      </div>
    </div>
  );
}
