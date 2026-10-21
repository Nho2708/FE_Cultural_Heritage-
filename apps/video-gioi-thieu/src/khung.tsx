import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import anhCoSan from './anh-co-san.json';
import { MAU, expoOut, mo } from './brand';

const CO_SAN = new Set<string>(anhCoSan as string[]);

/** Ảnh màn hình đầu tiên có thật trong danh sách (ảnh chụp thiếu thì dùng ảnh thay). */
export function chonAnh(...ungVien: string[]): string | null {
  return ungVien.find((duongDan) => CO_SAN.has(duongDan)) ?? null;
}

const kep = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Nền xanh than với quầng vàng nhạt và vòng tròn mảnh màu vàng. */
export function Nen({ children }: { children?: ReactNode }) {
  const { width, height } = useVideoConfig();
  const r = Math.max(width, height) * 0.62;
  return (
    <AbsoluteFill style={{ backgroundColor: MAU.navy, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 78% 30%, rgba(193,141,72,0.16), transparent 55%), radial-gradient(circle at 10% 100%, rgba(217,87,58,0.10), transparent 45%)` }} />
      <div
        style={{
          position: 'absolute',
          width: r * 2,
          height: r * 2,
          left: width * 0.78 - r,
          top: height * 0.3 - r,
          borderRadius: '50%',
          border: `2px solid rgba(193,141,72,0.18)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
}

/** Một cảnh: hiện dần khi vào, mờ dần khi ra (để hai cảnh liền nhau chồng mờ lên nhau). */
export function Canh({ dai, children, ra = 8 }: { dai: number; children: ReactNode; ra?: number }) {
  const f = useCurrentFrame();
  const vao = interpolate(f, [0, 12], [0, 1], { ...kep, easing: mo });
  const het = interpolate(f, [dai - ra, dai], [1, 0], { ...kep, easing: mo });
  return <AbsoluteFill style={{ opacity: Math.min(vao, het) }}>{children}</AbsoluteFill>;
}

/** Hiện lên từ dưới (expo-out), dùng cho chữ và khung. */
export function useVao(tre = 0, quang = 40, dai = 22) {
  const f = useCurrentFrame();
  const t = interpolate(f, [tre, tre + dai], [0, 1], { ...kep, easing: expoOut });
  return { opacity: t, transform: `translateY(${(1 - t) * quang}px)` } satisfies CSSProperties;
}

export interface KhoiChuProps {
  tieuDe: string;
  phu?: string;
  ghiChu?: string;
  phong: { tieuDe: string; chu: string };
  rong: number;
  coTieuDe?: number;
  coPhu?: number;
  canGiua?: boolean;
  tre?: number;
}

/** Tiêu đề, gạch chân vàng kẻ từ trái sang phải, câu phụ. */
export function KhoiChu({ tieuDe, phu, ghiChu, phong, rong, coTieuDe = 76, coPhu = 38, canGiua = false, tre = 4 }: KhoiChuProps) {
  const f = useCurrentFrame();
  const a = useVao(tre);
  const b = useVao(tre + 10, 30);
  const c = useVao(tre + 18, 20);
  const gach = interpolate(f, [tre + 6, tre + 30], [0, 1], { ...kep, easing: expoOut });
  return (
    <div style={{ width: rong, textAlign: canGiua ? 'center' : 'left' }}>
      <div style={{ ...a, fontFamily: phong.tieuDe, fontWeight: 700, fontSize: coTieuDe, lineHeight: 1.25, color: MAU.kem }}>{tieuDe}</div>
      <div
        style={{
          height: 5,
          width: Math.min(rong * 0.42, 260),
          margin: canGiua ? `${coTieuDe * 0.32}px auto` : `${coTieuDe * 0.32}px 0`,
          backgroundColor: MAU.vang,
          borderRadius: 3,
          transform: `scaleX(${gach})`,
          transformOrigin: canGiua ? 'center' : 'left center',
        }}
      />
      {phu ? <div style={{ ...b, fontFamily: phong.chu, fontWeight: 500, fontSize: coPhu, lineHeight: 1.5, color: 'rgba(255,255,255,0.92)' }}>{phu}</div> : null}
      {ghiChu ? <div style={{ ...c, marginTop: coPhu * 0.8, fontFamily: phong.chu, fontWeight: 400, fontSize: coPhu * 0.62, lineHeight: 1.5, color: 'rgba(223,207,182,0.75)' }}>{ghiChu}</div> : null}
    </div>
  );
}

export interface ManHinh {
  /** Đường dẫn trong public, ví dụ man-hinh/du-khach/vi/02-trang-chu.png. */
  anh: string | null;
  /** Khung hình (tính trong cảnh) bắt đầu hiện. */
  tu: number;
  /** Cuộn: [khung bắt đầu, khung kết thúc, từ y, tới y], y tính theo px của trang (CSS px, chưa nhân mật độ điểm ảnh). */
  cuon?: [number, number, number, number];
  /** Phóng to dần: [khung bắt đầu, khung kết thúc, tỉ lệ cuối, gốc phóng CSS]. */
  phong?: [number, number, number, string];
}

const RONG_TRANG_DT = 393;
const CAO_TRANG_DT = 852;

/** Khung điện thoại phẳng màu xanh than, bên trong là ảnh màn hình thật (rộng 393 px trang). */
export function DienThoai({ cao, man, style, children }: { cao: number; man: ManHinh[]; style?: CSSProperties; children?: ReactNode }) {
  const f = useCurrentFrame();
  const rong = (cao * RONG_TRANG_DT) / CAO_TRANG_DT;
  const tiLe = rong / RONG_TRANG_DT;
  const vien = Math.round(cao * 0.018);
  return (
    <div
      style={{
        width: rong + vien * 2,
        height: cao + vien * 2,
        padding: vien,
        borderRadius: cao * 0.075,
        backgroundColor: MAU.navyDam,
        boxShadow: `0 ${cao * 0.05}px ${cao * 0.1}px rgba(0,0,0,0.45), inset 0 0 0 2px #4A4D60`,
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: rong, height: cao, borderRadius: cao * 0.058, overflow: 'hidden', backgroundColor: '#F7F3EC' }}>
        {man.map((m, i) => {
          const sau = man[i + 1];
          const hien = i === 0 ? 1 : interpolate(f, [m.tu, m.tu + 10], [0, 1], { ...kep, easing: mo });
          const an = sau ? interpolate(f, [sau.tu + 10, sau.tu + 11], [1, 0], kep) : 1;
          if (f < m.tu - 1 || an === 0) return null;
          const y = m.cuon ? interpolate(f, [m.cuon[0], m.cuon[1]], [m.cuon[2], m.cuon[3]], { ...kep, easing: Easing.inOut(Easing.cubic) }) : 0;
          const s = m.phong ? interpolate(f, [m.phong[0], m.phong[1]], [1, m.phong[2]], { ...kep, easing: Easing.inOut(Easing.cubic) }) : 1;
          return (
            <div key={`${m.anh}-${m.tu}`} style={{ position: 'absolute', inset: 0, opacity: hien, transform: `scale(${s})`, transformOrigin: m.phong?.[3] ?? 'center' }}>
              {m.anh ? (
                <Img src={staticFile(m.anh)} style={{ position: 'absolute', left: 0, top: -y * tiLe, width: rong }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: MAU.kem }} />
              )}
            </div>
          );
        })}
        {children}
        <div style={{ position: 'absolute', top: cao * 0.012, left: '50%', width: rong * 0.22, height: cao * 0.026, marginLeft: -rong * 0.11, borderRadius: 99, backgroundColor: '#111' }} />
      </div>
    </div>
  );
}

export interface ManMayTinh {
  anh: string | null;
  tu: number;
  /** Vùng cần phóng tới (px ảnh 1920×1200): [x, y, rộng, cao], cùng [khung bắt đầu, khung kết thúc]. */
  vung?: [number, number, number, number];
  nhip?: [number, number];
}

const RONG_ANH_MT = 1920;
const CAO_ANH_MT = 1200;

/** Khung trình duyệt phẳng: thanh trên có ba chấm và tên trang, bên trong là ảnh màn hình thật 1920×1200. */
export function TrinhDuyet({ rong, man, ten, style }: { rong: number; man: ManMayTinh[]; ten: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  const cao = (rong * CAO_ANH_MT) / RONG_ANH_MT;
  const k = rong / RONG_ANH_MT;
  const thanh = Math.round(rong * 0.036);
  return (
    <div style={{ width: rong, borderRadius: rong * 0.014, overflow: 'hidden', backgroundColor: MAU.navyDam, boxShadow: `0 ${rong * 0.03}px ${rong * 0.07}px rgba(0,0,0,0.45)`, ...style }}>
      <div style={{ height: thanh, display: 'flex', alignItems: 'center', gap: thanh * 0.22, padding: `0 ${thanh * 0.45}px` }}>
        {[MAU.son, MAU.vang, MAU.kem].map((mau) => (
          <div key={mau} style={{ width: thanh * 0.26, height: thanh * 0.26, borderRadius: '50%', backgroundColor: mau, opacity: 0.85 }} />
        ))}
        <div
          style={{
            marginLeft: thanh * 0.4,
            flex: 1,
            maxWidth: rong * 0.45,
            height: thanh * 0.58,
            borderRadius: 99,
            backgroundColor: MAU.navyNhat,
            color: 'rgba(223,207,182,0.85)',
            fontSize: thanh * 0.3,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: thanh * 0.4,
          }}
        >
          {ten}
        </div>
      </div>
      <div style={{ position: 'relative', width: rong, height: cao, overflow: 'hidden', backgroundColor: '#F7F3EC' }}>
        {man.map((m, i) => {
          const sau = man[i + 1];
          const hien = i === 0 ? 1 : interpolate(f, [m.tu, m.tu + 10], [0, 1], { ...kep, easing: mo });
          const an = sau ? interpolate(f, [sau.tu + 10, sau.tu + 11], [1, 0], kep) : 1;
          if (f < m.tu - 1 || an === 0) return null;
          let bienDoi = 'none';
          if (m.vung && m.nhip) {
            const [x, y, w, h] = m.vung;
            const p = interpolate(f, [m.nhip[0], m.nhip[1]], [0, 1], { ...kep, easing: Easing.inOut(Easing.cubic) });
            const S = Math.min(1.9, Math.max(1, Math.min(RONG_ANH_MT / w, CAO_ANH_MT / h) * 0.85));
            const s = 1 + (S - 1) * p;
            const cx = (x + w / 2) * k;
            const cy = (y + h / 2) * k;
            const tx = Math.min(0, Math.max(rong - rong * s, (rong / 2 - cx * S) * p));
            const ty = Math.min(0, Math.max(cao - cao * s, (cao / 2 - cy * S) * p));
            bienDoi = `translate(${tx}px, ${ty}px) scale(${s})`;
          }
          return (
            <div key={`${m.anh}-${m.tu}`} style={{ position: 'absolute', inset: 0, opacity: hien, transform: bienDoi, transformOrigin: '0 0' }}>
              {m.anh ? <Img src={staticFile(m.anh)} style={{ width: rong, height: cao }} /> : <div style={{ position: 'absolute', inset: 0, backgroundColor: MAU.kem }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Dải mái cong xanh than quét ngang khung hình từ trái sang phải ("lật mái"), dài 500 ms. */
export function LatMai({ tu }: { tu: number }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = interpolate(f, [tu, tu + 15], [0, 1], { ...kep, easing: Easing.inOut(Easing.cubic) });
  if (t <= 0 || t >= 1) return null;
  const x = -width * 1.3 + t * width * 2.6;
  return (
    <svg width={width * 1.3} height={height} viewBox="0 0 130 100" preserveAspectRatio="none" style={{ position: 'absolute', left: x, top: 0 }}>
      <path d="M0,0 L100,0 Q118,0 124,-4 Q122,10 116,18 L116,100 L 0,100 Z" fill={MAU.navyDam} />
      <path d="M100,0 Q118,0 124,-4 Q122,10 116,18 L116,100" fill="none" stroke={MAU.vang} strokeWidth={0.6} />
    </svg>
  );
}
