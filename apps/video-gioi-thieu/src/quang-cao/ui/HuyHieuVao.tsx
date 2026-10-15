import type { CSSProperties } from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { MAU } from '../../brand';
import { CHONG, TANG } from '../../Logo';
import { MOC, tienDo } from '../nhip';

/**
 * Huy hiệu dựng lên trong thẻ kết, cùng các lớp với logo chuyển động của web (vòng vàng, đĩa kem, năm tầng cổng, chữ theo cung)
 * nhưng nén lại theo mốc MOC.theKet. `f` tính từ đầu thẻ kết.
 */
export function HuyHieuVao({ f, canh }: { f: number; canh: number }) {
  const m = MOC.theKet;
  const vong = tienDo(f, m.vong);
  const dia = tienDo(f, m.dia);
  const quet = 390 * tienDo(f, m.chuCung);
  const lop: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
  return (
    <div style={{ position: 'relative', width: canh, height: canh }}>
      <svg viewBox="0 0 100 100" style={lop}>
        <circle cx="50" cy="50" r="48.4" fill={MAU.navy} opacity={vong} />
        <circle cx="50" cy="50" r="48.9" fill="none" stroke={MAU.vang} strokeWidth={2} pathLength={1} strokeDasharray={vong >= 1 ? undefined : `${vong} 1`} transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: 'absolute', inset: '6.7%', borderRadius: '50%', backgroundColor: MAU.kem, opacity: dia, transform: `scale(${0.92 + 0.08 * dia})` }} />
      {TANG.map(([tren, duoi], i) => {
        const vao = m.tangCong.batDau + i * m.tangCong.lech;
        const t = tienDo(f, [vao, vao + m.tangCong.dai]);
        return (
          <Img
            key={tren}
            src={staticFile('logo/lop-cong.png')}
            style={{ ...lop, opacity: interpolate(t, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }), transform: `translateY(${(1 - t) * 8}%)`, clipPath: `inset(${Math.max(0, tren - CHONG)}% 0 ${100 - duoi}% 0)` }}
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
