import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BAN_DO, DI, MOC, tienDo } from '../nhip';
import { HatMin } from '../nen';
import { CauTieuDe } from '../thanh-phan';
import { BanDo, ChamNguoiXem, GhimDiSan, veDiem, type DuLieuBanDo } from '../ui/BanDo';
import { GHIM, tamNhin } from './ban-do-chung';

/** Mức phóng trên màn hình tại khung f của cảnh bản đồ tràn khung (phóng theo hàm mũ để mắt thấy đều). */
export function mucPhongBanDo(f: number): number {
  return BAN_DO.heSoPhong ** tienDo(f, MOC.banDoZoom.phong, DI);
}

/**
 * Cảnh bản đồ tràn khung, không khung điện thoại: phóng từ cả thành phố Hội An vào phố cổ, chấm người xem hiện với vòng sóng,
 * ghim di sản bật lên rồi to ra (được chọn). Dòng ghi nguồn OpenStreetMap ở góc trái, ngay trên vùng mạng xã hội che.
 */
export function BanDoZoom({ chu, banDo }: { chu: string; banDo: DuLieuBanDo }) {
  const f = useCurrentFrame();
  const m = MOC.banDoZoom;
  const z = mucPhongBanDo(f);
  const tam = tamNhin(banDo, z);
  const [nx, ny] = veDiem(banDo.nguoi, tam, 1080, 1920);
  const [gx, gy] = veDiem(banDo.ghim, tam, 1080, 1920);
  const tNguoi = tienDo(f, m.nguoi);
  const tGhim = tienDo(f, m.ghim);
  const ghimLon = 1 + (GHIM.chon - 1) * tienDo(f, m.ghimLon);
  return (
    <AbsoluteFill>
      <BanDo duLieu={banDo} rong={1080} cao={1920} tam={tam} phongTuongDoi={z} ghiNguon={{ left: 0, right: 'auto', bottom: 420 }} />
      <ChamNguoiXem x={nx} y={ny} r={GHIM.banKinhNguoi} f={f - m.nguoi[0]} chuKy={GHIM.chuKySong} mo={tNguoi} />
      {tGhim > 0 ? <GhimDiSan x={gx} y={gy} canh={GHIM.canh} chon={ghimLon > 1.2} tiLe={interpolate(tGhim, [0, 1], [0.4, 1]) * ghimLon} mo={Math.min(1, tGhim * 2)} /> : null}
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(29,31,41,0.9) 0px, rgba(29,31,41,0.62) 380px, rgba(29,31,41,0) 620px)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center' }}>
        <CauTieuDe chu={chu} t={tienDo(f, m.chu)} co={62} />
      </div>
      <HatMin doDam={0.03} />
    </AbsoluteFill>
  );
}
