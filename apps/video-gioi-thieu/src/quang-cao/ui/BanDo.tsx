import { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { PHONG_CHU } from '../../brand';
import { MAU_APP } from './mau-app';

/** Dữ liệu tải bằng scripts/tai-ban-do.py: toạ độ mét quanh điểm di sản, trục y hướng xuống, mỗi hình là dãy [x0, y0, x1, y1, ...]. */
export interface DuLieuBanDo {
  duongLon: number[][];
  duongNho: number[][];
  song: Array<{ rong: number; d: number[] }>;
  nuoc: number[][];
  xanh: number[][];
  nha: number[][];
  ghim: [number, number];
  nguoi: [number, number];
}

let hua: Promise<DuLieuBanDo> | null = null;

/** Nạp dữ liệu bản đồ một lần cho mỗi tab dựng; Remotion chờ tới khi nạp xong mới chụp khung. */
export function useBanDo(): DuLieuBanDo | null {
  const [duLieu, datDuLieu] = useState<DuLieuBanDo | null>(null);
  const [cho] = useState(() => delayRender('Nạp dữ liệu bản đồ'));
  useEffect(() => {
    hua ??= fetch(staticFile('ban-do/hoi-an.json')).then((r) => {
      if (!r.ok) throw new Error('Thiếu public/ban-do/hoi-an.json: chạy python scripts/tai-ban-do.py');
      return r.json();
    });
    hua.then((d) => {
      datDuLieu(d);
      continueRender(cho);
    });
  }, [cho]);
  return duLieu;
}

const duongDan = (ds: number[][], dong: boolean) =>
  ds
    .map((d) => {
      let s = `M${d[0]} ${d[1]}`;
      for (let i = 2; i < d.length; i += 2) s += `L${d[i]} ${d[i + 1]}`;
      return dong ? `${s}Z` : s;
    })
    .join('');

// Màu bản đồ nền OpenStreetMap (kiểu chuẩn) mà app đang dùng.
const MAU_BD = { dat: '#F2EFE9', xanh: '#D8EBC4', nuoc: '#AAD3DF', nha: '#D9D0C9', vienNha: '#C4B6AB', duong: '#FFFFFF', vienDuong: '#D3C9BC', duongLon: '#F7FABF', vienDuongLon: '#C9C58A' } as const;

export interface TamNhin {
  /** Tâm khung nhìn (mét). */
  x: number;
  y: number;
  /** Số mét trên một điểm ảnh. */
  m: number;
}

/**
 * Bản đồ dựng lại bằng SVG từ dữ liệu OpenStreetMap, theo màu bản đồ nền của app. Đường giữ bề rộng theo điểm ảnh và to dần
 * khi phóng (như bản đồ ô vuông đổi mức phóng); khối nhà hiện dần khi đủ gần. `phongTuongDoi` = mức phóng trên màn hình so với lúc
 * bắt đầu; `tiLeHien` = tỉ lệ mà khung chứa bản đồ đang bị phóng (điện thoại phóng lên che kín khung) để nét đường vẫn đúng bề rộng.
 */
export function BanDo({ duLieu, rong, cao, tam, phongTuongDoi, tiLeHien = 1, ghiNguon }: { duLieu: DuLieuBanDo; rong: number; cao: number; tam: TamNhin; phongTuongDoi: number; tiLeHien?: number; ghiNguon?: React.CSSProperties | false }) {
  const p = useMemo(
    () => ({
      nuoc: duongDan(duLieu.nuoc, true),
      xanh: duongDan(duLieu.xanh, true),
      nha: duongDan(duLieu.nha, true),
      duongNho: duongDan(duLieu.duongNho, false),
      duongLon: duongDan(duLieu.duongLon, false),
      song: duLieu.song.map((s) => ({ rong: s.rong, d: duongDan([s.d], false) })),
    }),
    [duLieu],
  );
  const { x, y, m } = tam;
  const z = phongTuongDoi;
  const nho = (2.2 * z ** 0.75) / tiLeHien;
  const lon = (4 * z ** 0.6) / tiLeHien;
  const nha = Math.min(1, Math.max(0, (z - 2.4) / 1.6));
  const tron = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const;
  return (
    <div style={{ position: 'relative', width: rong, height: cao, overflow: 'hidden', backgroundColor: MAU_BD.dat }}>
      <svg width={rong} height={cao} viewBox={`${x - (rong * m) / 2} ${y - (cao * m) / 2} ${rong * m} ${cao * m}`} style={{ position: 'absolute', inset: 0 }}>
        <path d={p.xanh} fill={MAU_BD.xanh} />
        <path d={p.nuoc} fill={MAU_BD.nuoc} />
        {p.song.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={MAU_BD.nuoc} strokeWidth={s.rong} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <path d={p.nha} fill={MAU_BD.nha} stroke={MAU_BD.vienNha} strokeWidth={0.6} vectorEffect="non-scaling-stroke" opacity={nha} />
        <path d={p.duongNho} {...tron} stroke={MAU_BD.vienDuong} strokeWidth={nho + 2} />
        <path d={p.duongLon} {...tron} stroke={MAU_BD.vienDuongLon} strokeWidth={lon + 2.4} />
        <path d={p.duongNho} {...tron} stroke={MAU_BD.duong} strokeWidth={nho} />
        <path d={p.duongLon} {...tron} stroke={MAU_BD.duongLon} strokeWidth={lon} />
      </svg>
      {ghiNguon === false ? null : <GhiNguonBanDo co={Math.max(15, rong / 54) / tiLeHien} style={ghiNguon} />}
    </div>
  );
}

/** Dòng ghi nguồn ở góc bản đồ, như bản đồ trong app (điều kiện giấy phép dữ liệu OpenStreetMap). */
export function GhiNguonBanDo({ co, style }: { co: number; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'absolute', right: 0, bottom: 0, padding: `${co * 0.2}px ${co * 0.45}px`, backgroundColor: 'rgba(255,255,255,0.8)', fontFamily: PHONG_CHU, fontSize: co, color: MAU_APP.chuPhu, whiteSpace: 'nowrap', ...style }}>
      © OpenStreetMap contributors
    </div>
  );
}

/** Đổi toạ độ mét sang điểm ảnh trong khung bản đồ. */
export function veDiem(diem: [number, number], tam: TamNhin, rong: number, cao: number): [number, number] {
  return [(diem[0] - tam.x) / tam.m + rong / 2, (diem[1] - tam.y) / tam.m + cao / 2];
}

const DUONG_GHIM = 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z';

/** Ghim di sản của app: chấm tròn màu chính, viền trắng, biểu tượng ghim trắng; ghim đang chọn đậm hơn. */
export function GhimDiSan({ x, y, canh, chon, tiLe = 1, mo = 1 }: { x: number; y: number; canh: number; chon: boolean; tiLe?: number; mo?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x - canh / 2,
        top: y - canh / 2,
        width: canh,
        height: canh,
        borderRadius: '50%',
        backgroundColor: chon ? '#861A18' : MAU_APP.son,
        border: `${Math.max(2, canh * 0.06)}px solid #fff`,
        boxShadow: '0 2px 8px rgba(42,35,28,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${tiLe})`,
        opacity: mo,
      }}
    >
      <svg viewBox="0 0 24 24" width={canh * 0.5} height={canh * 0.5} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={DUONG_GHIM} />
      </svg>
    </div>
  );
}

/** Chấm vị trí người xem như app (xanh dương, viền trắng) với vòng sóng lan ra theo chu kỳ. `f` tính từ lúc chấm hiện. */
export function ChamNguoiXem({ x, y, r, f, chuKy, mo = 1 }: { x: number; y: number; r: number; f: number; chuKy: number; mo?: number }) {
  const t = f >= 0 ? (f % chuKy) / chuKy : 0;
  return (
    <>
      {f >= 0 ? <div style={{ position: 'absolute', left: x - r * (1 + 3 * t), top: y - r * (1 + 3 * t), width: r * 2 * (1 + 3 * t), height: r * 2 * (1 + 3 * t), borderRadius: '50%', backgroundColor: 'rgba(26,86,219,0.25)', opacity: (1 - t) * mo }} /> : null}
      <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', backgroundColor: '#1a56db', border: `${r * 0.33}px solid #fff`, boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transform: `scale(${mo})` }} />
    </>
  );
}
