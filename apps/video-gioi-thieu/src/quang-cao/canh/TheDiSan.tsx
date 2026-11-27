import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { MAU, PHONG_CHU, PHONG_TIEU_DE } from '../../brand';
import type { ChuQuangCao } from '../chuoi';
import { AnhDiTich } from '../thanh-phan';
import { BieuTuongKhoi, BieuTuongTaiNghe, BieuTuongTrang } from '../ui/BieuTuong';
import { BieuTuong, NEN_SANG } from '../../Logo';
import { MAU_APP } from '../ui/mau-app';

// Thẻ di sản "Gần bạn" mở thành trang chi tiết, dùng chung cho cảnh bản đồ trong máy và cảnh trang chi tiết: thẻ bắt đầu mở ở cuối cảnh trước,
// cắt sang khung cận giữa lúc đang mở, nên cả hai cảnh vẽ cùng một thẻ theo cùng tiến độ.
// Trang chi tiết dựng lại theo trang thật của web học tập ở khổ điện thoại (393 điểm): đo vị trí, cỡ chữ từng phần trên trang /di-san/do-thi-co-hoi-an.

/** Màn hình tính theo điểm giao diện (393 × 852); nhân k (px video trên một điểm) để ra px video. */
export const MAN = { rong: 393, cao: 852 } as const;
/** Thẻ "Gần bạn" ở đáy màn hình bản đồ: lề hai bên, khoảng cách tới đáy, cao ảnh, cao dòng chip, bo góc. */
export const THE = { le: 16, day: 24, caoAnh: 170, caoDong: 56, bo: 16 } as const;
/** Thanh trạng thái của điện thoại (giờ, pin, phần khoét camera) ở trên cùng; trang web nằm dưới thanh này. */
const LE_TREN = 50;
/** Thanh trên của web và ảnh đầu trang chi tiết (toạ độ trên trang web, chưa cộng thanh trạng thái). */
const DAU_TRANG = { cao: 56 } as const;
const ANH_DAU = { dinh: 56, cao: 566 } as const;
/** Ảnh đại diện của di sản trong app (thẻ và ảnh đầu trang). */
const ANH_THE = 'anh-dau-hoi-an';
/** Nút "Nghe" trên trang thật: x, y, rộng, cao (điểm). */
const NUT_NGHE = { x: 174.1, y: 410, rong: 119.7, cao: 48 } as const;
export const TAM_NUT_NGHE = { x: NUT_NGHE.x + NUT_NGHE.rong / 2, y: LE_TREN + NUT_NGHE.y + NUT_NGHE.cao / 2 };
const MAU_CHU_TRANG = '#2A231C';

const kep = (x: number) => Math.min(1, Math.max(0, x));

/** Mũi tên chỉ đường của chip khoảng cách trong app. */
function MuiTen({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" fill="none" stroke={mau} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

/** Thanh trên của web học tập: nút trình đơn, biểu tượng (bản nhỏ), nút đổi giao diện sáng tối, nút đăng nhập của học sinh. */
function ThanhTren({ k, dangNhap }: { k: number; dangNhap: string }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: MAN.rong * k, height: DAU_TRANG.cao * k, backgroundColor: '#fff', boxShadow: `0 ${k}px 0 rgba(42,35,28,0.08)` }}>
      <svg width={24 * k} height={24 * k} viewBox="0 0 24 24" fill="none" stroke="rgba(42,35,28,0.54)" strokeWidth={2} strokeLinecap="round" style={{ position: 'absolute', left: 16 * k, top: 16 * k }}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
      <div style={{ position: 'absolute', left: 64 * k, top: 14 * k }}>
        <BieuTuong rong={38 * k} nho mau={NEN_SANG} />
      </div>
      <div style={{ position: 'absolute', left: 155.3 * k, top: 6 * k, width: 44 * k, height: 44 * k, boxSizing: 'border-box', borderRadius: 8 * k, border: `${k}px solid #8A7866`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={22 * k} height={22 * k} viewBox="0 0 24 24" fill="none" stroke={MAU_CHU_TRANG} strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="12" r="4" fill={MAU_CHU_TRANG} />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </div>
      <div style={{ position: 'absolute', left: 207.3 * k, top: 10 * k, width: 173.7 * k, height: 36 * k, borderRadius: 4 * k, backgroundColor: MAU_APP.son, color: '#fff', fontFamily: PHONG_CHU, fontSize: 16 * k, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
        {dangNhap}
      </div>
    </div>
  );
}

/**
 * Thẻ di sản ở đáy màn hình bản đồ mở dần thành trang chi tiết (tMo 0 = thẻ, 1 = trang): ảnh thẻ nở thành ảnh đầu trang,
 * thanh trên của web trượt xuống, tên và chip khoảng cách của thẻ mờ đi. `doiY` (px) để thẻ trượt lên, `nhan` (0→1) khi bị chạm.
 * `children` là nội dung trang, đặt tuyệt đối theo toạ độ trang.
 */
export function TheMoThanhTrang({ k, tMo, doiY = 0, nhan = 0, tenDiTich, khoangCach, dangNhap, children }: { k: number; tMo: number; doiY?: number; nhan?: number; tenDiTich: string; khoangCach: string; dangNhap: string; children?: ReactNode }) {
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
      {tMo > 0 ? (
        <div style={{ position: 'absolute', left: 0, top: (LE_TREN * tMo - DAU_TRANG.cao * (1 - tMo)) * k, opacity: tMo }}>
          <ThanhTren k={k} dangNhap={dangNhap} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: 0, right: 0, top: (LE_TREN + ANH_DAU.dinh) * tMo * k, height: giua(THE.caoAnh, ANH_DAU.cao) * k, backgroundColor: '#332B22' }}>
        <AnhDiTich id={ANH_THE} tieuDiem={[0.5, 0.5]} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 60%)', opacity: 1 - tMo }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 400 * k, background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.6))', opacity: tMo }} />
        <div style={{ position: 'absolute', left: 14 * k, bottom: 12 * k, fontWeight: 600, fontSize: 21 * k, color: '#fff', whiteSpace: 'nowrap', opacity: 1 - kep(tMo * 1.6) }}>{tenDiTich}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: giua(THE.caoAnh, LE_TREN + ANH_DAU.dinh + ANH_DAU.cao) * k, height: THE.caoDong * k, display: 'flex', alignItems: 'center', padding: `0 ${14 * k}px`, opacity: 1 - kep(tMo * 2) }}>
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

/**
 * Nội dung trang chi tiết trên web, đúng vị trí và cỡ chữ của trang thật: đường dẫn, tên di sản (chữ có chân), bốn nhãn,
 * ba nút (Tóm tắt, Nghe, Xem 3D) viền trắng trên ảnh, dòng ghi nguồn ảnh, rồi mục giới thiệu trên nền trắng.
 * Nút nghe nhịp hai lần (tNhip chạy đều 0→1) rồi được chạm (tCham): nút nhún xuống, nền sáng lên, gợn tròn lan ra.
 */
export function NoiDungTrang({ k, t, tNhip, tCham, tenDiTich, chu }: { k: number; t: number; tNhip: number; tCham: number; tenDiTich: string; chu: ChuQuangCao['giaoDien']['trangChiTiet'] }) {
  const pha = (tNhip * 2) % 1;
  const nhan = Math.sin(Math.PI * tCham);
  const o = (x: number, y: number) => ({ position: 'absolute' as const, left: x * k, top: (LE_TREN + y) * k });
  const nhanVi = [
    [16, 318, 88.2],
    [112.2, 318, 212],
    [16, 360, 163.2],
    [187.2, 360, 120.8],
  ];
  const nut: Array<[number, number, number, (p: { canh: number; mau: string }) => ReactNode]> = [
    [16, 410, 146.1, BieuTuongTrang],
    [NUT_NGHE.x, NUT_NGHE.y, NUT_NGHE.rong, BieuTuongTaiNghe],
    [16, 470, 155.3, BieuTuongKhoi],
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: t, transform: `translateY(${(1 - t) * 24 * k}px)`, fontFamily: PHONG_CHU }}>
      <div style={{ ...o(16, 152), height: 22 * k, display: 'flex', alignItems: 'center', gap: 8 * k, fontSize: 14 * k, color: '#fff', whiteSpace: 'nowrap' }}>
        <span>{chu.duongDan}</span>
        <svg width={14 * k} height={14 * k} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
        <span>{tenDiTich}</span>
      </div>
      <div style={{ ...o(16, 190), width: 361 * k, fontFamily: PHONG_TIEU_DE, fontWeight: 400, fontSize: 44 * k, lineHeight: `${56 * k}px`, color: '#fff' }}>{tenDiTich}</div>
      {chu.the.slice(0, nhanVi.length).map((ten, i) => (
        <div key={ten} style={{ ...o(nhanVi[i][0], nhanVi[i][1]), width: nhanVi[i][2] * k, height: 34 * k, borderRadius: 999, backgroundColor: '#fff', color: MAU_CHU_TRANG, fontSize: 14 * k, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
          {ten}
        </div>
      ))}
      {nut.map(([x, y, rong, BieuTuong], i) => {
        const nghe = i === 1;
        return (
          <div
            key={i}
            style={{
              ...o(x, y),
              width: rong * k,
              height: 48 * k,
              boxSizing: 'border-box',
              borderRadius: 8 * k,
              border: `${1.5 * k}px solid #fff`,
              backgroundColor: nghe && tCham > 0.15 ? 'rgba(255,255,255,0.28)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8 * k,
              color: '#fff',
              fontSize: 16 * k,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transform: nghe ? `scale(${1 - 0.08 * nhan})` : undefined,
            }}
          >
            {nghe && tNhip > 0 && tNhip < 1 ? <div style={{ position: 'absolute', inset: -1.5 * k, borderRadius: 10 * k, border: `${3 * k}px solid ${MAU.vang}`, transform: `scale(${1 + 0.4 * pha})`, opacity: 0.9 * (1 - pha) }} /> : null}
            <BieuTuong canh={22 * k} mau="#fff" />
            {chu.nut[i]}
          </div>
        );
      })}
      <VongCham x={TAM_NUT_NGHE.x * k} y={TAM_NUT_NGHE.y * k} canh={90 * k} t={tCham} />
      <div style={{ ...o(16, 534), width: 361 * k, fontSize: 12 * k, lineHeight: `${16 * k}px`, color: 'rgba(255,255,255,0.8)' }}>{chu.nguonAnh}</div>
      <AbsoluteFill style={{ top: (LE_TREN + ANH_DAU.dinh + ANH_DAU.cao) * k, backgroundColor: '#fff' }} />
      <div style={{ ...o(16, 678), fontSize: 24 * k, lineHeight: `${32 * k}px`, color: MAU_CHU_TRANG }}>{chu.gioiThieu}</div>
      <div style={{ ...o(16, 726), width: 361 * k, fontSize: 18 * k, lineHeight: `${28 * k}px`, color: MAU_CHU_TRANG }}>{chu.doanGioiThieu}</div>
    </div>
  );
}
