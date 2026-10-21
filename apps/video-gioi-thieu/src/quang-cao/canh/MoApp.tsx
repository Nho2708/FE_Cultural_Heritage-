import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MAU } from '../../brand';
import { DI, MOC, tienDo } from '../nhip';
import { BanDo, type DuLieuBanDo, type DuLieuQuocGia } from '../ui/BanDo';
import { MAU_LOGO } from '../../logo-duong-net';
import { NEN_SANG } from '../../Logo';
import { BieuTuongVao } from '../ui/BieuTuongVao';
import { KhungMay, coMay } from '../ui/KhungMay';
import { MAY_MO_APP, tamNhin } from './ban-do-chung';
import { ChiTietBiAn } from './ChiTietBiAn';

/**
 * Số mét trên một điểm màn hình điện thoại khi nhìn cả nước: lấy theo điểm xa nhất của Việt Nam (đảo xa nhất quần đảo Trường Sa ở phía đông)
 * tính từ Hội An, cộng 12% lề, để cả đất liền lẫn hai quần đảo lọt bề ngang màn hình.
 */
function metCaNuoc(qg: DuLieuQuocGia, rongMan: number): number {
  let xa = 0;
  for (const vung of qg.vietNam) for (let i = 0; i < vung.length; i += 2) xa = Math.max(xa, Math.abs(vung[i]));
  for (const [x] of qg.dao) xa = Math.max(xa, Math.abs(x));
  return (xa * 1.12) / (rongMan / 2);
}

/**
 * Cảnh mở app: nền ba dải ảnh nhòe dần, điện thoại lớn trồi lên (mép dưới bị cắt) với màn hình chờ có biểu tượng dựng lên,
 * màn hình chuyển sang bản đồ cả nước Việt Nam (kể cả Hoàng Sa, Trường Sa), camera xuyên vào màn hình cho tới khi bản đồ che kín khung,
 * rồi bản đồ lao xuống Hội An (phóng theo hàm mũ) tới đúng tầm nhìn đầu cảnh bản đồ tràn khung. Lớp đường phố hiện dần ở chặng cuối.
 */
export function MoApp({ chuCanhTruoc, banDo, quocGia }: { chuCanhTruoc: string; banDo: DuLieuBanDo; quocGia: DuLieuQuocGia }) {
  const f = useCurrentFrame();
  const m = MOC.moApp;
  const c = coMay(MAY_MO_APP.rongMan);
  const tNhoe = tienDo(f, m.nenNhoe, DI);
  const tTroi = tienDo(f, m.mayTroi);
  const tBanDo = tienDo(f, m.banDoHien, DI);
  const tXuyen = tienDo(f, m.xuyenMan, DI);
  const trai = (1080 - c.rong) / 2;
  const dinh = 1920 + (MAY_MO_APP.dinh - 1920) * tTroi;
  // Tâm màn hình (px video) lúc điện thoại đã đứng yên; khi xuyên vào, tâm này dời về giữa khung và cả máy phóng quanh nó.
  const tamManY = MAY_MO_APP.dinh + c.vien + c.caoMan / 2;
  const phong = 1 + (MAY_MO_APP.phongXuyen - 1) * tXuyen;
  const doiY = (960 - tamManY) * tXuyen;
  // Tầm nhìn cuối cảnh (đúng tầm đầu cảnh sau, tính trên màn hình chưa phóng) và tầm nhìn cả nước; lao xuống theo hàm mũ giữa hai tầm.
  const tamCuoi = tamNhin(banDo, 1 / MAY_MO_APP.phongXuyen);
  const mDau = metCaNuoc(quocGia, MAY_MO_APP.rongMan);
  const tLao = tienDo(f, m.laoXuong, DI);
  const met = mDau * (tamCuoi.m / mDau) ** tLao;
  // Đường phố chỉ có trong vùng vài km quanh phố cổ: hiện dần khi tầm nhìn còn dưới ba lần tầm cuối, rõ hẳn ở tầm cuối.
  const moChiTiet = Math.min(1, Math.max(0, Math.log((3 * tamCuoi.m) / met) / Math.log(3)));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - tNhoe, filter: `blur(${tNhoe * 24}px)` }}>
        <ChiTietBiAn chu={chuCanhTruoc} tinh />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${doiY}px) scale(${phong})`, transformOrigin: `540px ${tamManY}px` }}>
        <KhungMay rongMan={MAY_MO_APP.rongMan} style={{ left: trai, top: dinh }}>
          {/* Màn hình chờ của app: nền kem, biểu tượng màu cho nền sáng (như app thật). */}
          <AbsoluteFill style={{ backgroundColor: MAU_LOGO.kem, alignItems: 'center', justifyContent: 'center', opacity: 1 - tBanDo }}>
            <BieuTuongVao f={f} rong={MAY_MO_APP.rongMan * 0.5} moc={m.logo} mau={NEN_SANG} />
          </AbsoluteFill>
          {tBanDo > 0 ? (
            <AbsoluteFill style={{ opacity: tBanDo }}>
              <BanDo duLieu={banDo} quocGia={quocGia} moChiTiet={moChiTiet} rong={MAY_MO_APP.rongMan} cao={c.caoMan} tam={{ ...tamCuoi, m: met }} phongTuongDoi={1} tiLeHien={phong} ghiNguon={false} />
            </AbsoluteFill>
          ) : null}
        </KhungMay>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
