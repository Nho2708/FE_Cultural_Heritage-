import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MAU } from '../../brand';
import { DI, MOC, tienDo } from '../nhip';
import { BanDo, type DuLieuBanDo } from '../ui/BanDo';
import { HuyHieuVao } from '../ui/HuyHieuVao';
import { KhungMay, coMay } from '../ui/KhungMay';
import { MAY_MO_APP, tamNhin } from './ban-do-chung';
import { ChiTietBiAn } from './ChiTietBiAn';

/**
 * Cảnh mở app: nền ba dải ảnh nhòe dần, điện thoại lớn trồi lên (mép dưới bị cắt) với màn hình chờ có huy hiệu dựng lên,
 * màn hình chuyển sang bản đồ, rồi camera xuyên vào màn hình cho tới khi bản đồ che kín khung (nối sang cảnh bản đồ tràn khung).
 */
export function MoApp({ chuCanhTruoc, banDo }: { chuCanhTruoc: string; banDo: DuLieuBanDo }) {
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
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - tNhoe, filter: `blur(${tNhoe * 24}px)` }}>
        <ChiTietBiAn chu={chuCanhTruoc} tinh />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${doiY}px) scale(${phong})`, transformOrigin: `540px ${tamManY}px` }}>
        <KhungMay rongMan={MAY_MO_APP.rongMan} style={{ left: trai, top: dinh }}>
          <AbsoluteFill style={{ backgroundColor: MAU.navy, alignItems: 'center', justifyContent: 'center', opacity: 1 - tBanDo }}>
            <HuyHieuVao f={f} canh={MAY_MO_APP.rongMan * 0.46} moc={m.logo} />
          </AbsoluteFill>
          {tBanDo > 0 ? (
            <AbsoluteFill style={{ opacity: tBanDo }}>
              <BanDo duLieu={banDo} rong={MAY_MO_APP.rongMan} cao={c.caoMan} tam={tamNhin(banDo, 1 / MAY_MO_APP.phongXuyen)} phongTuongDoi={1} tiLeHien={MAY_MO_APP.phongXuyen} ghiNguon={false} />
            </AbsoluteFill>
          ) : null}
        </KhungMay>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
