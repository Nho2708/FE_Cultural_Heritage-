import { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { MAU, PHONG_CHU } from '../../brand';
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

/** Lớp cả nước tải bằng scripts/tai-ban-do-viet-nam.py (Natural Earth, góc nhìn Việt Nam), cùng phép chiếu và gốc toạ độ với DuLieuBanDo. */
export interface DuLieuQuocGia {
  /** Đất liền và đảo lớn của Việt Nam. */
  vietNam: number[][];
  /** Tâm các đảo nhỏ của Việt Nam (gồm quần đảo Hoàng Sa, Trường Sa), vẽ thành chấm để còn thấy khi nhìn cả nước. */
  dao: Array<[number, number]>;
  lanCan: number[][];
}

const daNap = new Map<string, Promise<unknown>>();

/** Nạp một tệp dữ liệu bản đồ trong public/ban-do/ một lần cho mỗi tab dựng; Remotion chờ tới khi nạp xong mới chụp khung. */
function useDuLieu<T>(tep: string, lenhTao: string): T | null {
  const [duLieu, datDuLieu] = useState<T | null>(null);
  const [cho] = useState(() => delayRender(`Nạp ${tep}`));
  useEffect(() => {
    if (!daNap.has(tep)) {
      daNap.set(
        tep,
        fetch(staticFile(`ban-do/${tep}`)).then((r) => {
          if (!r.ok) throw new Error(`Thiếu public/ban-do/${tep}: chạy ${lenhTao}`);
          return r.json();
        }),
      );
    }
    daNap.get(tep)!.then((d) => {
      datDuLieu(d as T);
      continueRender(cho);
    });
  }, [cho, tep, lenhTao]);
  return duLieu;
}

export const useBanDo = () => useDuLieu<DuLieuBanDo>('hoi-an.json', 'python scripts/tai-ban-do.py');
export const useQuocGia = () => useDuLieu<DuLieuQuocGia>('viet-nam.json', 'python scripts/tai-ban-do-viet-nam.py');

const duongDan = (ds: number[][], dong: boolean) =>
  ds
    .map((d) => {
      let s = `M${d[0]} ${d[1]}`;
      for (let i = 2; i < d.length; i += 2) s += `L${d[i]} ${d[i + 1]}`;
      return dong ? `${s}Z` : s;
    })
    .join('');

// Màu bản đồ nền OpenStreetMap (kiểu chuẩn) mà app đang dùng.
const MAU_BD = { dat: '#F2EFE9', datLanCan: '#E2DED6', xanh: '#D8EBC4', nuoc: '#AAD3DF', nha: '#D9D0C9', vienNha: '#C4B6AB', duong: '#FFFFFF', vienDuong: '#D3C9BC', duongLon: '#F7FABF', vienDuongLon: '#C9C58A' } as const;
/** Viền vàng quanh lãnh thổ Việt Nam chỉ hiện khi nhìn từ xa: rõ hẳn khi một điểm ảnh từ VIEN_RO mét trở lên, mất khi dưới VIEN_MAT mét. */
const VIEN_RO = 400;
const VIEN_MAT = 60;

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
 * Có `quocGia` thì vẽ thêm lớp cả nước bên dưới (biển, đất liền, nước láng giềng, đảo); `moChiTiet` (0→1) làm lớp đường phố hiện dần khi phóng vào.
 */
export function BanDo({ duLieu, rong, cao, tam, phongTuongDoi, tiLeHien = 1, ghiNguon, quocGia, moChiTiet = 1 }: { duLieu: DuLieuBanDo; rong: number; cao: number; tam: TamNhin; phongTuongDoi: number; tiLeHien?: number; ghiNguon?: React.CSSProperties | false; quocGia?: DuLieuQuocGia | null; moChiTiet?: number }) {
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
  const q = useMemo(() => (quocGia ? { vn: duongDan(quocGia.vietNam, true), lanCan: duongDan(quocGia.lanCan, true) } : null), [quocGia]);
  const { x, y, m } = tam;
  const vien = Math.min(1, Math.max(0, Math.log(m / VIEN_MAT) / Math.log(VIEN_RO / VIEN_MAT)));
  const z = phongTuongDoi;
  const nho = (2.2 * z ** 0.75) / tiLeHien;
  const lon = (4 * z ** 0.6) / tiLeHien;
  const nha = Math.min(1, Math.max(0, (z - 2.4) / 1.6));
  const tron = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const;
  return (
    <div style={{ position: 'relative', width: rong, height: cao, overflow: 'hidden', backgroundColor: q ? MAU_BD.nuoc : MAU_BD.dat }}>
      <svg width={rong} height={cao} viewBox={`${x - (rong * m) / 2} ${y - (cao * m) / 2} ${rong * m} ${cao * m}`} style={{ position: 'absolute', inset: 0 }}>
        {q && quocGia ? (
          <>
            <path d={q.lanCan} fill={MAU_BD.datLanCan} />
            <path d={q.vn} fill={MAU_BD.dat} />
            {vien > 0 ? <path d={q.vn} fill="none" stroke={MAU.vang} strokeWidth={1.6 / tiLeHien} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={vien} /> : null}
            {vien > 0 ? quocGia.dao.map(([dx, dy], i) => <circle key={i} cx={dx} cy={dy} r={(2.6 * m) / tiLeHien} fill={MAU_BD.dat} stroke={MAU.vang} strokeWidth={1.2 / tiLeHien} vectorEffect="non-scaling-stroke" opacity={vien} />) : null}
          </>
        ) : null}
        <g opacity={moChiTiet}>
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
        </g>
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
