import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { PHONG_CHU } from '../../brand';
import { BAN_DO, CANH_DOC_30, DI, MOC, tienDo } from '../nhip';
import { AnhDiTich } from '../thanh-phan';
import { BanDo, ChamNguoiXem, GhimDiSan, veDiem, type DuLieuBanDo } from '../ui/BanDo';
import { KhungMay, coMay } from '../ui/KhungMay';
import { MAU_APP } from '../ui/mau-app';
import { GHIM, MAY_TRONG_MAY, tamNhin } from './ban-do-chung';

/** Vòng sóng quanh chấm người xem chạy tiếp từ cảnh trước (tính từ lúc chấm hiện ở cảnh bản đồ tràn khung). */
const PHA_SONG = CANH_DOC_30.find((c) => c.id === 'ban-do-zoom')!.dai - MOC.banDoZoom.nguoi[0];

/** Mũi tên chỉ đường của chip khoảng cách trong app. */
function MuiTen({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" fill="none" stroke={mau} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

/**
 * Cảnh bản đồ trong máy: điện thoại khép lại quanh đúng tầm bản đồ cuối cảnh trước (từ phóng che kín khung về nguyên chiếc giữa khung),
 * thẻ di sản trượt lên ở đáy màn hình (ảnh, tên, chip khoảng cách như thẻ "Gần bạn" của app), rồi một vòng chạm lên thẻ.
 */
export function BanDoTrongMay({ banDo, tenDiTich, khoangCach }: { banDo: DuLieuBanDo; tenDiTich: string; khoangCach: string }) {
  const f = useCurrentFrame();
  const m = MOC.banDoTrongMay;
  const r = MAY_TRONG_MAY.rongMan;
  const c = coMay(r);
  const k = r / 393; // px video trên một điểm giao diện của app
  const tKhep = tienDo(f, m.mayKhep, DI);
  const phong = MAY_TRONG_MAY.phongDau + (1 - MAY_TRONG_MAY.phongDau) * tKhep;
  const pd = MAY_TRONG_MAY.phongDau;
  // Trong màn hình (chưa nhân tỉ lệ phóng của máy), tầm nhìn bằng tầm cuối cảnh trước nhân tỉ lệ phóng lúc đầu.
  const tamCuoi = tamNhin(banDo, BAN_DO.heSoPhong);
  const tam = { ...tamCuoi, m: tamCuoi.m * pd };
  const [nx, ny] = veDiem(banDo.nguoi, tam, r, c.caoMan);
  const [gx, gy] = veDiem(banDo.ghim, tam, r, c.caoMan);
  const tThe = tienDo(f, m.theTruot);
  const tCham = tienDo(f, m.cham);
  const caoAnh = 170 * k;
  const caoThe = caoAnh + 56 * k;
  const day = 24 * k;
  return (
    <AbsoluteFill style={{ transform: `scale(${phong})`, transformOrigin: '540px 960px' }}>
      <KhungMay rongMan={r} style={{ left: (1080 - c.rong) / 2, top: (1920 - c.cao) / 2 }}>
        <BanDo duLieu={banDo} rong={r} cao={c.caoMan} tam={tam} phongTuongDoi={BAN_DO.heSoPhong} tiLeHien={pd} ghiNguon={{ bottom: day + caoThe + 10 * k, right: 0 }} />
        <ChamNguoiXem x={nx} y={ny} r={GHIM.banKinhNguoi / pd} f={f + PHA_SONG} chuKy={GHIM.chuKySong} />
        <GhimDiSan x={gx} y={gy} canh={GHIM.canh / pd} chon tiLe={GHIM.chon} />
        <div
          style={{
            position: 'absolute',
            left: 16 * k,
            right: 16 * k,
            bottom: day,
            height: caoThe,
            borderRadius: 16 * k,
            overflow: 'hidden',
            backgroundColor: MAU_APP.be,
            fontFamily: PHONG_CHU,
            boxShadow: '0 12px 36px rgba(42,35,28,0.28)',
            transform: `translateY(${(1 - tThe) * (caoThe + day + 20 * k)}px)`,
          }}
        >
          <div style={{ position: 'relative', height: caoAnh }}>
            <AnhDiTich id="pho-nha-vang" tieuDiem={[0.5, 0.45]} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 60%)' }} />
            <div style={{ position: 'absolute', left: 14 * k, bottom: 12 * k, fontWeight: 600, fontSize: 21 * k, color: '#fff', whiteSpace: 'nowrap' }}>{tenDiTich}</div>
          </div>
          <div style={{ height: 56 * k, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: `0 ${14 * k}px` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * k, padding: `${3 * k}px ${8 * k}px`, borderRadius: 6 * k, backgroundColor: MAU_APP.vangNhat, color: '#43382E', fontSize: 15 * k, fontWeight: 500 }}>
              <MuiTen canh={14 * k} mau="#43382E" />
              {khoangCach}
            </div>
          </div>
          {tCham > 0 && tCham < 1 ? (
            <div style={{ position: 'absolute', left: '50%', top: caoThe / 2, width: 64 * k, height: 64 * k, marginLeft: -32 * k, marginTop: -32 * k, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.55)', border: `${2 * k}px solid rgba(255,255,255,0.9)`, transform: `scale(${0.6 + 0.4 * tCham})`, opacity: 1 - tCham }} />
          ) : null}
        </div>
      </KhungMay>
    </AbsoluteFill>
  );
}
