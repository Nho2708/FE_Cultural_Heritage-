import type { CSSProperties } from 'react';
import { Img, staticFile } from 'remotion';
import { MAU, PHONG_TIEU_DE } from '../brand';
import { DO_TRUOT_CHU } from './nhip';

/** Ảnh di tích phủ kín vùng chứa, phóng quanh tiêu điểm (tỉ lệ 0–1 của ảnh). Ảnh tải bằng scripts/tai-anh-di-tich.py. */
export function AnhDiTich({ id, tiLe = 1, tieuDiem = [0.5, 0.5], dichX = 0, style }: { id: string; tiLe?: number; tieuDiem?: [number, number]; dichX?: number; style?: CSSProperties }) {
  const [x, y] = tieuDiem;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
      <Img
        src={staticFile(`anh-di-tich/${id}.jpg`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${x * 100}% ${y * 100}%`,
          transform: `translateX(${dichX}px) scale(${tiLe})`,
          transformOrigin: `${x * 100}% ${y * 100}%`,
        }}
      />
    </div>
  );
}

/** Một câu tiêu đề trên một dòng (không xuống dòng), trượt lên khi xuất hiện. `t` là tiến độ xuất hiện 0→1. */
export function CauTieuDe({ chu, t, co = 64, mau = MAU.kem, style }: { chu: string; t: number; co?: number; mau?: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: PHONG_TIEU_DE,
        fontWeight: 700,
        fontSize: co,
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        color: mau,
        opacity: t,
        transform: `translateY(${(1 - t) * DO_TRUOT_CHU}px)`,
        textShadow: '0 2px 18px rgba(20,21,28,0.55)',
        ...style,
      }}
    >
      {chu}
    </div>
  );
}

/** Ghim vị trí màu vàng (cùng hình ghim trong video cũ, tô vàng thương hiệu). */
export function GhimVang({ canh = 44, style }: { canh?: number; style?: CSSProperties }) {
  return (
    <svg width={canh} height={canh * 1.25} viewBox="-30 -80 60 84" style={style}>
      <path d="M0,0 C-22,-26 -26,-38 -26,-50 A26,26 0 1 1 26,-50 C26,-38 22,-26 0,0 Z" fill={MAU.vang} />
      <circle cx={0} cy={-50} r={10} fill={MAU.navy} />
    </svg>
  );
}
