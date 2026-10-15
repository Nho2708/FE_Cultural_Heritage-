import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DI, MO_HINH, MOC, tienDo } from '../nhip';
import { CauTieuDe } from '../thanh-phan';
import { BieuTuongVeLai } from '../ui/BieuTuong';
import { KhungMay, coMay } from '../ui/KhungMay';
import { MAU_APP } from '../ui/mau-app';
import { NgonTay } from '../ui/NgonTay';
import { KhungMoHinh, khoangCachVuaKhung, type MoHinh } from '../ui/MoHinh3D';
import { MAY_MO_APP } from './ban-do-chung';
import { MAN } from './TheDiSan';

/** Quầng sáng vàng sau lưng mô hình, như đèn rọi lên phông (nền thương hiệu xanh than). */
function QuangSang({ y }: { y: number }) {
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse 62% 30% at 50% ${(y / 1920) * 100}%, rgba(193,141,72,0.24), rgba(193,141,72,0) 70%)` }} />;
}

/** Cảnh mô hình đứng một mình: khung vẽ 3D chỉ phủ phần trên, để mô hình nằm cao hơn câu chữ ở dưới. */
const CAO_KHUNG_XOAY = 1600;

/**
 * Mô hình đứng một mình trên nền thương hiệu: xoay đều, camera tiến lại gần, câu chữ ở dưới.
 * Góc xoay chạy tuyến tính và nối liền sang cảnh góc cao.
 */
export function MoHinhXoay({ chu, moHinh }: { chu: string; moHinh: MoHinh }) {
  const f = useCurrentFrame();
  const m = MOC.moHinhXoay;
  const kc = m.khoangCach[0] + (m.khoangCach[1] - m.khoangCach[0]) * tienDo(f, m.tien, DI);
  return (
    <AbsoluteFill>
      <QuangSang y={760} />
      <KhungMoHinh moHinh={moHinh} rong={1080} cao={CAO_KHUNG_XOAY} xoay={MO_HINH.gocDau + MO_HINH.tocDo * f} ngang={m.ngang} khoangCach={khoangCachVuaKhung(moHinh, 1080, CAO_KHUNG_XOAY) * kc} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1360, display: 'flex', justifyContent: 'center' }}>
        <CauTieuDe chu={chu} t={tienDo(f, m.chu)} co={62} />
      </div>
    </AbsoluteFill>
  );
}

/** Cùng mô hình, khung chặt hơn: xoay tiếp không ngắt từ cảnh trước, camera ngẩng lên cao cho thấy mái ngói. Không có chữ. */
export function MoHinhGocCao({ moHinh, khungCanhTruoc }: { moHinh: MoHinh; khungCanhTruoc: number }) {
  const f = useCurrentFrame();
  const m = MOC.moHinhGocCao;
  const ngang = m.ngang[0] + (m.ngang[1] - m.ngang[0]) * tienDo(f, m.ngangLen, DI);
  return (
    <AbsoluteFill>
      <QuangSang y={900} />
      <KhungMoHinh moHinh={moHinh} rong={1080} cao={1920} xoay={MO_HINH.gocDau + MO_HINH.tocDo * (khungCanhTruoc + f)} ngang={ngang} khoangCach={khoangCachVuaKhung(moHinh, 1080, 1920) * m.khoangCach} nhinCao={m.nhinCao} />
    </AbsoluteFill>
  );
}

/** Hộp xem 3D trong màn hình app (theo điểm giao diện): lề, đỉnh, cao; dưới hộp là dòng gợi ý và nút về góc nhìn ban đầu. */
const HOP = { le: 8, dinh: 104, cao: 576, bo: 10 } as const;

/**
 * Hộp 3D của app dựng lại bằng code, trong điện thoại lớn bị mép dưới cắt (cùng kiểu máy cảnh mở app): ngón tay đặt xuống,
 * kéo ngang, mô hình xoay theo ngón rồi ngón nhấc lên. Chữ của màn hình vẽ thành vạch, nút chỉ có biểu tượng.
 */
export function MoHinhTrongMay({ moHinh }: { moHinh: MoHinh }) {
  const f = useCurrentFrame();
  const m = MOC.moHinhTrongMay;
  const r = MAY_MO_APP.rongMan;
  const c = coMay(r);
  const k = r / MAN.rong;
  const dinh = MAY_MO_APP.dinh + 50 * (1 - tienDo(f, m.mayLen));
  const tKeo = tienDo(f, m.keo, DI);
  // Khung vẽ 3D cần số nguyên điểm ảnh.
  const hop = { x: HOP.le * k, y: HOP.dinh * k, rong: Math.round((MAN.rong - HOP.le * 2) * k), cao: Math.round(HOP.cao * k) };
  const ngonX = hop.x + hop.rong / 2 + m.doiX[0] + (m.doiX[1] - m.doiX[0]) * tKeo;
  const ngonY = hop.y + hop.cao * 0.62;
  const vach = (x: number, y: number, rong: number, cao: number, mau: string = MAU_APP.vien) => <div style={{ position: 'absolute', left: x * k, top: y * k, width: rong * k, height: cao * k, borderRadius: (cao / 2) * k, backgroundColor: mau }} />;
  return (
    <AbsoluteFill>
      <KhungMay rongMan={r} style={{ left: (1080 - c.rong) / 2, top: dinh }}>
        <AbsoluteFill style={{ backgroundColor: MAU_APP.nen }} />
        <svg width={24 * k} height={24 * k} viewBox="0 0 24 24" fill="none" stroke={MAU_APP.son} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12 * k, top: 66 * k }}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {vach(50, 74, 150, 10, MAU_APP.vienDam)}
        <div style={{ position: 'absolute', left: hop.x, top: hop.y, width: hop.rong, height: hop.cao, borderRadius: HOP.bo * k, overflow: 'hidden', backgroundColor: MAU_APP.vien }}>
          <KhungMoHinh moHinh={moHinh} rong={hop.rong} cao={hop.cao} xoay={m.gocDau + m.xoayThem * tKeo} ngang={m.ngang} khoangCach={khoangCachVuaKhung(moHinh, hop.rong, hop.cao, 0.92)} />
        </div>
        {vach(12, HOP.dinh + HOP.cao + 22, 196, 9)}
        <div style={{ position: 'absolute', right: 12 * k, top: (HOP.dinh + HOP.cao + 10) * k, width: 40 * k, height: 34 * k, boxSizing: 'border-box', borderRadius: 8 * k, border: `${1.5 * k}px solid ${MAU_APP.son}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BieuTuongVeLai canh={18 * k} mau={MAU_APP.son} />
        </div>
        <NgonTay x={ngonX} y={ngonY} tVao={tienDo(f, m.ngonVao)} tRa={tienDo(f, m.ngonRa)} />
      </KhungMay>
    </AbsoluteFill>
  );
}
