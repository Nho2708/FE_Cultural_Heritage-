import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { ChuQuangCao } from '../chuoi';
import { BAN_DO, CANH_DOC_30, DI, MOC, tienDo } from '../nhip';
import { BanDo, ChamNguoiXem, GhimDiSan, veDiem, type DuLieuBanDo } from '../ui/BanDo';
import { KhungMay, coMay } from '../ui/KhungMay';
import { GHIM, MAY_TRONG_MAY, tamNhin } from './ban-do-chung';
import { MAN, NoiDungTrang, THE, TheMoThanhTrang, VongCham } from './TheDiSan';

/** Vòng sóng quanh chấm người xem chạy tiếp từ cảnh trước (tính từ lúc chấm hiện ở cảnh bản đồ tràn khung). */
const PHA_SONG = CANH_DOC_30.find((c) => c.id === 'ban-do-zoom')!.dai - MOC.banDoZoom.nguoi[0];
/** Số khung của cảnh này: thẻ bắt đầu mở thành trang trước điểm cắt (mốc moTrang của cảnh trang chi tiết tính từ đầu cảnh đó). */
const DAI = CANH_DOC_30.find((c) => c.id === 'ban-do-trong-may')!.dai;

/**
 * Bản đồ trên màn hình điện thoại nguyên chiếc: đúng tầm cuối cảnh bản đồ tràn khung, chấm người xem có sóng, ghim di sản đang chọn.
 * `f` tính từ đầu cảnh bản đồ trong máy (cảnh trang chi tiết truyền tiếp số khung để sóng không giật).
 */
export function LopBanDo({ banDo, f }: { banDo: DuLieuBanDo; f: number }) {
  const r = MAY_TRONG_MAY.rongMan;
  const c = coMay(r);
  const k = r / MAN.rong;
  const pd = MAY_TRONG_MAY.phongDau;
  // Trong màn hình (chưa nhân tỉ lệ phóng của máy), tầm nhìn bằng tầm cuối cảnh trước nhân tỉ lệ phóng lúc đầu.
  const tamCuoi = tamNhin(banDo, BAN_DO.heSoPhong);
  const tam = { ...tamCuoi, m: tamCuoi.m * pd };
  const [nx, ny] = veDiem(banDo.nguoi, tam, r, c.caoMan);
  const [gx, gy] = veDiem(banDo.ghim, tam, r, c.caoMan);
  return (
    <>
      <BanDo duLieu={banDo} rong={r} cao={c.caoMan} tam={tam} phongTuongDoi={BAN_DO.heSoPhong} tiLeHien={pd} ghiNguon={{ bottom: (THE.day + THE.caoAnh + THE.caoDong + 10) * k, right: 0 }} />
      <ChamNguoiXem x={nx} y={ny} r={GHIM.banKinhNguoi / pd} f={f + PHA_SONG} chuKy={GHIM.chuKySong} />
      <GhimDiSan x={gx} y={gy} canh={GHIM.canh / pd} chon tiLe={GHIM.chon} />
    </>
  );
}

/**
 * Cảnh bản đồ trong máy: điện thoại khép lại quanh đúng tầm bản đồ cuối cảnh trước (từ phóng che kín khung về nguyên chiếc giữa khung),
 * thẻ di sản trượt lên ở đáy màn hình (ảnh, tên, chip khoảng cách như thẻ "Gần bạn" của app), một vòng chạm lên thẻ,
 * rồi thẻ bắt đầu mở thành trang chi tiết ngay trước điểm cắt.
 */
export function BanDoTrongMay({ banDo, giaoDien }: { banDo: DuLieuBanDo; giaoDien: ChuQuangCao['giaoDien'] }) {
  const f = useCurrentFrame();
  const m = MOC.banDoTrongMay;
  const r = MAY_TRONG_MAY.rongMan;
  const c = coMay(r);
  const k = r / MAN.rong;
  const tKhep = tienDo(f, m.mayKhep, DI);
  const phong = MAY_TRONG_MAY.phongDau + (1 - MAY_TRONG_MAY.phongDau) * tKhep;
  const tThe = tienDo(f, m.theTruot);
  const nhan = Math.sin(Math.PI * tienDo(f, m.nhan, (x) => x));
  const tMo = tienDo(f - DAI, MOC.trangChiTiet.moTrang, DI);
  const caoThe = THE.caoAnh + THE.caoDong;
  return (
    <AbsoluteFill style={{ transform: `scale(${phong})`, transformOrigin: '540px 960px' }}>
      <KhungMay rongMan={r} style={{ left: (1080 - c.rong) / 2, top: (1920 - c.cao) / 2 }}>
        <LopBanDo banDo={banDo} f={f} />
        <TheMoThanhTrang k={k} tMo={tMo} doiY={(1 - tThe) * (caoThe + THE.day + 20) * k} nhan={nhan} tenDiTich={giaoDien.tenDiTich} khoangCach={giaoDien.khoangCach} dangNhap={giaoDien.trangChiTiet.dangNhap}>
          <VongCham x={((MAN.rong - THE.le * 2) / 2) * k} y={(caoThe / 2) * k} canh={64 * k} t={tienDo(f, m.cham)} />
          {f >= DAI + MOC.trangChiTiet.noiDung[0] ? <NoiDungTrang k={k} t={tienDo(f - DAI, MOC.trangChiTiet.noiDung)} tNhip={0} tCham={0} tenDiTich={giaoDien.tenDiTich} chu={giaoDien.trangChiTiet} /> : null}
        </TheMoThanhTrang>
      </KhungMay>
    </AbsoluteFill>
  );
}
