import type { CSSProperties } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { expoOut, mo, ms } from './brand';
import {
  BIEU_TUONG,
  BIEU_TUONG_NHO,
  CHU_DIVIET,
  KHUNG_BIEU_TUONG,
  KHUNG_BIEU_TUONG_NHO,
  KHUNG_CHU_DIVIET,
  MAU_LOGO,
  type NetBieuTuong,
} from './logo-duong-net';

// Logo DiViet (mái đình che quyển sách mở) vẽ bằng SVG, cùng hình và cùng nhịp với logo chuyển động trên web và màn hình chờ của app:
//   hai trang sách mở ra từ gáy, mái hạ xuống rồi "đáp" nhẹ, bờ nóc hạ xuống sau cùng; đoạn logo thêm chữ "DiViet" hiện dưới hình
//   và hai chấm chữ i (màu mái) nảy lên ở cuối. Đoạn logo dài 2,4 giây, bờ nóc đáp đúng lúc tiếng mõ gỗ (1,25 giây, scripts/tao-nhac.py).

export interface MauLogo {
  mai: string;
  sach: string;
  chu: string;
}
/** Trên nền xanh than của video. */
export const NEN_TOI: MauLogo = { mai: MAU_LOGO.sonSang, sach: MAU_LOGO.kem, chu: MAU_LOGO.kem };
/** Trên nền sáng (màn hình chờ của app, thanh trên của web). */
export const NEN_SANG: MauLogo = { mai: MAU_LOGO.son, sach: MAU_LOGO.xanhThan, chu: MAU_LOGO.xanhThan };

/** Tỉ lệ rộng / cao của phần thấy được. */
export const TI_LE_BIEU_TUONG = KHUNG_BIEU_TUONG.rong / KHUNG_BIEU_TUONG.cao;
const [, , RONG_CHU, CAO_CHU] = KHUNG_CHU_DIVIET.split(' ').map(Number);
export const TI_LE_CHU = RONG_CHU / CAO_CHU;

/** Tiến độ 0..1 của từng phần khi hình đang dựng lên; bỏ trống là hình đứng yên. */
export interface TienDoBieuTuong {
  sach: number;
  mai: number;
  noc: number;
}

const kep = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Hạ xuống từ `cao` đơn vị phía trên, vượt quá chỗ một chút (`vuot`) ở 60% rồi về đúng chỗ. */
function haXuong(t: number, cao: number, vuot: number) {
  return t < 0.6 ? interpolate(t, [0, 0.6], [-cao, vuot], { ...kep, easing: expoOut }) : interpolate(t, [0.6, 1], [vuot, 0], { ...kep, easing: mo });
}

function bienDoi(net: NetBieuTuong, td: TienDoBieuTuong | undefined): { transform?: string; opacity?: number } {
  if (!td) return {};
  if (net.id === 'sach-trai' || net.id === 'sach-phai') {
    // Trang sách mọc ra từ gáy: co giãn theo chiều ngang quanh mép gáy (x 124 và 132), đáy trang làm mốc.
    const gay = net.id === 'sach-trai' ? 124 : 132;
    const k = 0.15 + 0.85 * expoOut(td.sach);
    return { transform: `translate(${gay} 206) scale(${k} 1) translate(${-gay} -206)`, opacity: Math.min(1, td.sach * 2.5) };
  }
  const t = net.id === 'mai' ? td.mai : td.noc;
  const y = net.id === 'mai' ? haXuong(t, 28, 2) : haXuong(t, 20, 1.5);
  return { transform: `translate(0 ${y})`, opacity: Math.min(1, t / 0.4) };
}

/** Biểu tượng; `rong` là chiều rộng px của phần thấy được. `nho` dùng bản cho cỡ nhỏ (không bờ nóc). */
export function BieuTuong({ rong, mau = NEN_TOI, nho = false, tienDo, style }: { rong: number; mau?: MauLogo; nho?: boolean; tienDo?: TienDoBieuTuong; style?: CSSProperties }) {
  const k = nho ? KHUNG_BIEU_TUONG_NHO : KHUNG_BIEU_TUONG;
  const nets = nho ? BIEU_TUONG_NHO : BIEU_TUONG;
  return (
    <svg viewBox={`${k.x} ${k.y} ${k.rong} ${k.cao}`} width={rong} height={(rong * k.cao) / k.rong} style={{ display: 'block', overflow: 'visible', ...style }}>
      {nets.map((net) => (
        <path key={net.id} d={net.d} fill={net.vai === 'mai' ? mau.mai : mau.sach} {...bienDoi(net, tienDo)} />
      ))}
    </svg>
  );
}

/** Chữ "DiViet" của logo; `cao` là chiều cao khung chữ px. `cham` 0..1: hai chấm chữ i nảy lên (bỏ trống là đã hiện). */
export function ChuDiViet({ cao, mau = NEN_TOI, cham = 1, style }: { cao: number; mau?: MauLogo; cham?: number; style?: CSSProperties }) {
  const nay = cham >= 1 ? 1 : cham < 0.6 ? interpolate(cham, [0, 0.6], [0, 1.25], { ...kep, easing: expoOut }) : interpolate(cham, [0.6, 1], [1.25, 1], kep);
  return (
    <svg viewBox={KHUNG_CHU_DIVIET} width={cao * TI_LE_CHU} height={cao} style={{ display: 'block', overflow: 'visible', ...style }}>
      {CHU_DIVIET.map((net, i) =>
        net.vai === 'cham' ? (
          <path key={i} d={net.d} fill={mau.mai} style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scale(${nay})` }} />
        ) : (
          <path key={i} d={net.d} fill={mau.chu} />
        ),
      )}
    </svg>
  );
}

/** Mốc dựng biểu tượng (khung hình tính từ đầu cảnh). */
export interface MocBieuTuong {
  sach: readonly [number, number];
  mai: readonly [number, number];
  noc: readonly [number, number];
}

/** Mốc của đoạn logo (30 khung mỗi giây): sách 0–500 ms, mái 350–950 ms, bờ nóc 700–1250 ms, chữ 1300–1800 ms, chấm chữ i 1700–2050 ms. */
export const MOC_DOAN_LOGO = {
  sach: [0, ms(500)],
  mai: [ms(350), ms(950)],
  noc: [ms(700), ms(1250)],
  chu: [ms(1300), ms(1800)],
  cham: [ms(1700), ms(2050)],
} as const;
export const THOI_LUONG_LOGO = ms(2400);

export const tienDoTheoMoc = (f: number, m: MocBieuTuong): TienDoBieuTuong => ({
  sach: interpolate(f, m.sach, [0, 1], kep),
  mai: interpolate(f, m.mai, [0, 1], kep),
  noc: interpolate(f, m.noc, [0, 1], kep),
});

/**
 * Đoạn logo: biểu tượng dựng lên, chữ "DiViet" hiện bên dưới. `canh` là chiều rộng biểu tượng; khối cao canh / 1,4 + chữ.
 * GOC_PHONG_LOGO là điểm giữa gáy sách (theo phần trăm khối) để cảnh mở đầu phóng xuyên vào quyển sách.
 */
export function LogoChuyenDong({ canh, batDau = 0, mau = NEN_TOI }: { canh: number; batDau?: number; mau?: MauLogo }) {
  const f = useCurrentFrame() - batDau;
  const m = MOC_DOAN_LOGO;
  const chu = interpolate(f, m.chu, [0, 1], { ...kep, easing: expoOut });
  const caoChu = canh * CAO_CHU_THEO_CANH;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <BieuTuong rong={canh} mau={mau} tienDo={tienDoTheoMoc(f, m)} />
      <div style={{ marginTop: canh * KHOANG_CHU_THEO_CANH, opacity: chu, transform: `translateY(${(1 - chu) * caoChu * 0.3}px)` }}>
        <ChuDiViet cao={caoChu} mau={mau} cham={interpolate(f, m.cham, [0, 1], kep)} />
      </div>
    </div>
  );
}
const CAO_CHU_THEO_CANH = 0.3;
const KHOANG_CHU_THEO_CANH = 0.06;
const CAO_KHOI = 1 / TI_LE_BIEU_TUONG + KHOANG_CHU_THEO_CANH + CAO_CHU_THEO_CANH;
/** Gáy sách nằm ở 82% chiều cao biểu tượng. */
export const GOC_PHONG_LOGO = `50% ${((0.82 / TI_LE_BIEU_TUONG / CAO_KHOI) * 100).toFixed(1)}%`;

/** Logo đứng yên (thẻ kết): biểu tượng và chữ. */
export function LogoDung({ canh, mau = NEN_TOI, style }: { canh: number; mau?: MauLogo; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      <BieuTuong rong={canh} mau={mau} />
      <ChuDiViet cao={canh * CAO_CHU_THEO_CANH} mau={mau} style={{ marginTop: canh * KHOANG_CHU_THEO_CANH }} />
    </div>
  );
}
