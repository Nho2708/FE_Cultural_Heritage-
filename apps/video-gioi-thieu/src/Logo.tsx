import type { CSSProperties } from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { MAU, expoOut, mo, ms } from './brand';

// Huy hiệu "Vietnam Heritage" chuyển động theo khung hình, cùng nhịp với huy hiệu trên web (đoạn "Logo vào", 2,4 giây):
//   0–400 ms     vòng vàng tự vẽ theo chiều kim đồng hồ từ đỉnh, vành xanh than hiện dần;
//   200–700 ms   đĩa kem phóng từ 92% lên 100%;
//   500–1300 ms  cổng lầu mọc lên theo năm dải ngang, mỗi dải lệch 120 ms, mái trên "đáp" nhẹ;
//   1500–2100 ms chữ "Vietnam Heritage" hiện theo cung từ trái sang phải;
//   tới 2400 ms  giữ yên.
// Lớp cổng và lớp chữ là ảnh tách từ logo gốc (public/logo), cùng khung với huy hiệu.

/** Năm dải ngang của cổng lầu, từ dưới lên: [mép trên, mép dưới] theo phần trăm cạnh huy hiệu. */
const TANG: ReadonlyArray<readonly [number, number]> = [
  [65.5, 100],
  [57.1, 65.5],
  [49.6, 57.1],
  [41.6, 49.6],
  [0, 41.6],
];
const CHONG = 0.6;

export const THOI_LUONG_LOGO = ms(2400);

export function LogoChuyenDong({ canh, batDau = 0 }: { canh: number; batDau?: number }) {
  const f = useCurrentFrame() - batDau;
  const vong = interpolate(f, [0, ms(400)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: mo });
  const navy = interpolate(f, [0, ms(300)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: mo });
  const dia = interpolate(f, [ms(200), ms(700)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: expoOut });
  const quet = interpolate(f, [ms(1500), ms(2100)], [0, 390], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: mo });
  const lop: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

  return (
    <div style={{ position: 'relative', width: canh, height: canh }}>
      <svg viewBox="0 0 100 100" style={lop}>
        <circle cx="50" cy="50" r="48.4" fill={MAU.navy} opacity={navy} />
        <circle
          cx="50"
          cy="50"
          r="48.9"
          fill="none"
          stroke={MAU.vang}
          strokeWidth={2}
          pathLength={1}
          strokeDasharray={vong >= 1 ? undefined : `${vong} 1`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: '6.7%',
          borderRadius: '50%',
          backgroundColor: MAU.kem,
          opacity: dia,
          transform: `scale(${0.92 + 0.08 * dia})`,
        }}
      />
      {TANG.map(([tren, duoi], i) => {
        const laMai = i === TANG.length - 1;
        const vao = ms(500) + i * ms(120);
        const dai = laMai ? ms(420) : ms(320);
        const t = interpolate(f, [vao, vao + dai], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const hien = expoOut(Math.min(1, t * 1.4));
        // Mái trên vượt lên dưới 1% rồi về chỗ.
        const y = laMai ? (t < 0.7 ? interpolate(t, [0, 0.7], [8, -0.8], { easing: expoOut }) : interpolate(t, [0.7, 1], [-0.8, 0])) : 8 * (1 - expoOut(t));
        return (
          <Img
            key={tren}
            src={staticFile('logo/lop-cong.png')}
            style={{
              ...lop,
              opacity: hien,
              transform: `translateY(${y}%)`,
              clipPath: `inset(${Math.max(0, tren - CHONG)}% 0 ${100 - duoi}% 0)`,
            }}
          />
        );
      })}
      <Img
        src={staticFile('logo/lop-chu.png')}
        style={{
          ...lop,
          opacity: quet > 0 ? 1 : 0,
          WebkitMaskImage: `conic-gradient(from 240deg, #000 ${quet}deg, transparent ${quet + 30}deg)`,
          maskImage: `conic-gradient(from 240deg, #000 ${quet}deg, transparent ${quet + 30}deg)`,
        }}
      />
    </div>
  );
}

/** Huy hiệu tĩnh (thẻ kết, góc màn hình). */
export function HuyHieu({ canh, style }: { canh: number; style?: CSSProperties }) {
  return <Img src={staticFile('logo/huy-hieu.png')} style={{ width: canh, height: canh, ...style }} />;
}
