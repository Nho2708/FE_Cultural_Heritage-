import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HatMin } from '../nen';
import { DI, MOC, tienDo } from '../nhip';
import { AnhDiTich } from '../thanh-phan';
import { BangNghe, type NgonNguNghe } from '../ui/BangNghe';
import { MAU_APP } from '../ui/mau-app';

const DINH_BANG = 980;

/** Cảnh đổi ngôn ngữ: nửa trên là đèn lồng bên sông buổi tối, nửa dưới là bảng nghe; chip ngôn ngữ đổi mỗi phách. */
export function DoiNgonNgu({ batDau, ds, tienTrinhDau, tienTrinhCuoi }: { batDau: number; ds: NgonNguNghe[]; tienTrinhDau: number; tienTrinhCuoi: number }) {
  const f = useCurrentFrame();
  const m = MOC.doiNgonNgu;
  const i = Math.min(ds.length - 1, Math.floor(f / m.moiNgonNgu));
  const tDoi = tienDo(f - i * m.moiNgonNgu, [0, m.doiChu]);
  const lia = tienDo(f, m.lia, DI);
  const tienTrinh = tienTrinhDau + (tienTrinhCuoi - tienTrinhDau) * tienDo(f, m.lia, (t) => t);
  return (
    <AbsoluteFill style={{ backgroundColor: '#0d0d12' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: DINH_BANG + 60 }}>
        <AnhDiTich id="den-long-song-dem" tiLe={1.12} tieuDiem={[0.5, 0.5]} dichX={30 - lia * 60} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: DINH_BANG, bottom: 0, backgroundColor: MAU_APP.nen, borderRadius: '48px 48px 0 0', boxShadow: '0 -24px 60px rgba(0,0,0,0.45)' }}>
        <BangNghe f={batDau + f} rong={1080} ds={ds} iNgonNgu={i} tDoi={tDoi} tienTrinh={tienTrinh} cauDangDoc={1} />
      </div>
      <HatMin doDam={0.035} />
    </AbsoluteFill>
  );
}
