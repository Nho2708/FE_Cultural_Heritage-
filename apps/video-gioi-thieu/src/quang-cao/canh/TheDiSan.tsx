import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { PHONG_CHU } from '../../brand';
import { AnhDiTich } from '../thanh-phan';
import { BieuTuongGhim, BieuTuongKhoi, BieuTuongTaiNghe, BieuTuongTrang } from '../ui/BieuTuong';
import { MAU_APP } from '../ui/mau-app';

// Thẻ di sản "Gần bạn" dùng chung cho cảnh bản đồ trong máy và cảnh trang chi tiết: thẻ bắt đầu mở thành trang ở cuối cảnh trước,
// cắt sang khung cận giữa lúc đang mở, nên cả hai cảnh vẽ cùng một thẻ theo cùng tiến độ.

/** Màn hình app tính theo điểm giao diện (393 × 852); nhân k (px video trên một điểm) để ra px video. */
export const MAN = { rong: 393, cao: 852 } as const;
/** Thẻ "Gần bạn" ở đáy màn hình bản đồ: lề hai bên, khoảng cách tới đáy, cao ảnh, cao dòng chip, bo góc. */
export const THE = { le: 16, day: 24, caoAnh: 170, caoDong: 56, bo: 16 } as const;
/** Ảnh đầu trang chi tiết sau khi thẻ mở hẳn. */
const CAO_ANH_TRANG = 300;
const kep = (x: number) => Math.min(1, Math.max(0, x));

/** Mũi tên chỉ đường của chip khoảng cách trong app. */
function MuiTen({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" fill="none" stroke={mau} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

/**
 * Thẻ di sản ở đáy màn hình bản đồ mở dần thành trang chi tiết (tMo 0 = thẻ, 1 = trang): ảnh thẻ nở thành ảnh đầu trang,
 * tên và chip khoảng cách mờ đi, nền chuyển sang màu nền của app. `doiY` (px) để thẻ trượt lên, `nhan` (0→1) khi bị chạm.
 * `children` là nội dung trang, đặt tuyệt đối theo toạ độ trang.
 */
export function TheMoThanhTrang({ k, tMo, doiY = 0, nhan = 0, tenDiTich, khoangCach, children }: { k: number; tMo: number; doiY?: number; nhan?: number; tenDiTich: string; khoangCach: string; children?: ReactNode }) {
  const giua = (a: number, b: number) => a + (b - a) * tMo;
  const caoThe = THE.caoAnh + THE.caoDong;
  return (
    <div
      style={{
        position: 'absolute',
        left: giua(THE.le, 0) * k,
        top: giua(MAN.cao - THE.day - caoThe, 0) * k,
        width: giua(MAN.rong - THE.le * 2, MAN.rong) * k,
        height: giua(caoThe, MAN.cao) * k,
        borderRadius: THE.bo * (1 - tMo) * k,
        overflow: 'hidden',
        backgroundColor: MAU_APP.be,
        fontFamily: PHONG_CHU,
        boxShadow: `0 12px 36px rgba(42,35,28,${0.28 * (1 - tMo)})`,
        transform: `translateY(${doiY}px) scale(${1 - 0.03 * nhan})`,
      }}
    >
      <AbsoluteFill style={{ backgroundColor: MAU_APP.nen, opacity: tMo }} />
      <div style={{ position: 'relative', height: giua(THE.caoAnh, CAO_ANH_TRANG) * k }}>
        <AnhDiTich id="pho-nha-vang" tieuDiem={[0.5, 0.45]} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 60%)', opacity: 1 - tMo }} />
        <div style={{ position: 'absolute', left: 14 * k, bottom: 12 * k, fontWeight: 600, fontSize: 21 * k, color: '#fff', whiteSpace: 'nowrap', opacity: 1 - kep(tMo * 1.6) }}>{tenDiTich}</div>
      </div>
      <div style={{ height: THE.caoDong * k, display: 'flex', alignItems: 'center', padding: `0 ${14 * k}px`, opacity: 1 - kep(tMo * 2) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 * k, padding: `${3 * k}px ${8 * k}px`, borderRadius: 6 * k, backgroundColor: MAU_APP.vangNhat, color: '#43382E', fontSize: 15 * k, fontWeight: 500 }}>
          <MuiTen canh={14 * k} mau="#43382E" />
          {khoangCach}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Vòng chạm của ngón tay tại (x, y) px, nở ra và mờ dần theo t (0→1). */
export function VongCham({ x, y, canh, t, mau = 'rgba(255,255,255,0.55)', vien = 'rgba(255,255,255,0.9)' }: { x: number; y: number; canh: number; t: number; mau?: string; vien?: string }) {
  if (t <= 0 || t >= 1) return null;
  return <div style={{ position: 'absolute', left: x - canh / 2, top: y - canh / 2, width: canh, height: canh, borderRadius: '50%', backgroundColor: mau, border: `${canh * 0.03}px solid ${vien}`, transform: `scale(${0.6 + 0.4 * t})`, opacity: 1 - t }} />;
}

/** Nội dung trang tính từ mép dưới ảnh đầu trang (điểm giao diện). */
const Y = (y: number) => CAO_ANH_TRANG + y;
/** Hàng nút của trang chi tiết, chỉ có biểu tượng (đọc tóm tắt, nghe, xem 3D, bản đồ); nút thứ hai là nút nghe. */
const HANG_NUT = { dinh: Y(150), cao: 44, rong: 72, cach: 10 } as const;
export const TAM_NUT_NGHE = { x: THE.le + HANG_NUT.rong * 1.5 + HANG_NUT.cach, y: HANG_NUT.dinh + HANG_NUT.cao / 2 };
/**
 * Nội dung trang chi tiết dưới ảnh đầu trang. Chữ của trang vẽ thành vạch (không thêm chữ trên hình); hàng nút chỉ có biểu tượng.
 * Nút nghe nhịp hai lần (tNhip chạy đều 0→1) rồi được chạm (tCham): nút nhún xuống, đổi nền, gợn tròn lan ra.
 */
export function NoiDungTrang({ k, t, tNhip, tCham }: { k: number; t: number; tNhip: number; tCham: number }) {
  const vach = (dinh: number, rong: number, cao = 9, mau: string = MAU_APP.vien) => (
    <div key={`${dinh}-${rong}`} style={{ position: 'absolute', left: THE.le * k, top: dinh * k, width: rong * k, height: cao * k, borderRadius: (cao / 2) * k, backgroundColor: mau }} />
  );
  const nut = [BieuTuongTrang, BieuTuongTaiNghe, BieuTuongKhoi, BieuTuongGhim];
  const pha = (tNhip * 2) % 1;
  const nhan = Math.sin(Math.PI * tCham);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: t, transform: `translateY(${(1 - t) * 24 * k}px)` }}>
      {vach(Y(18), 214, 11, MAU_APP.vienDam)}
      <div style={{ position: 'absolute', left: THE.le * k, top: Y(44) * k, display: 'flex', gap: 8 * k }}>
        {[84, 104].map((w, i) => (
          <div key={w} style={{ width: w * k, height: 24 * k, borderRadius: 12 * k, backgroundColor: i === 0 ? '#EFE7DC' : MAU_APP.vangNhat, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: (w - 30) * k, height: 7 * k, borderRadius: 4 * k, backgroundColor: i === 0 ? MAU_APP.vienDam : '#E6CF8E' }} />
          </div>
        ))}
      </div>
      {vach(Y(86), 361)}
      {vach(Y(104), 348)}
      {vach(Y(122), 262)}
      {nut.map((BieuTuong, i) => {
        const chinh = i === 0;
        const nghe = i === 1;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: (THE.le + i * (HANG_NUT.rong + HANG_NUT.cach)) * k,
              top: HANG_NUT.dinh * k,
              width: HANG_NUT.rong * k,
              height: HANG_NUT.cao * k,
              borderRadius: 10 * k,
              boxSizing: 'border-box',
              backgroundColor: chinh ? MAU_APP.son : nghe && tCham > 0.15 ? MAU_APP.sonNhat : MAU_APP.be,
              border: chinh ? 'none' : `${1.5 * k}px solid ${MAU_APP.son}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: nghe ? `scale(${1 - 0.08 * nhan})` : undefined,
            }}
          >
            {nghe && tNhip > 0 && tNhip < 1 ? (
              <div style={{ position: 'absolute', inset: -1.5 * k, borderRadius: 12 * k, border: `${3 * k}px solid ${MAU_APP.son}`, transform: `scale(${1 + 0.5 * pha})`, opacity: 0.75 * (1 - pha) }} />
            ) : null}
            <BieuTuong canh={22 * k} mau={chinh ? '#fff' : MAU_APP.son} />
          </div>
        );
      })}
      <VongCham x={TAM_NUT_NGHE.x * k} y={TAM_NUT_NGHE.y * k} canh={90 * k} t={tCham} mau="rgba(164,35,31,0.16)" vien="rgba(164,35,31,0.5)" />
      {vach(Y(226), 168, 14, MAU_APP.vienDam)}
      {[361, 352, 361, 300, 361, 334, 210].map((w, i) => vach(Y(254) + i * 18, w))}
      {vach(Y(396), 140, 14, MAU_APP.vienDam)}
      {[361, 340, 356, 290].map((w, i) => vach(Y(424) + i * 18, w))}
    </div>
  );
}
