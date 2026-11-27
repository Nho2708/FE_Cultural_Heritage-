import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { MAU } from '../../brand';
import { HatMin } from '../nen';
import { DI, MOC, tienDo } from '../nhip';
import { AnhDiTich, CauTieuDe, GhimVang } from '../thanh-phan';

/**
 * Ảnh mở đầu video, trở lại ở cảnh hiểu rồi: nhà cổ tường vàng ở phố cổ Hội An lúc chập tối, treo đèn lồng nhiều màu (ảnh dọc).
 * Tiêu điểm lệch trái để khung dọc giữ chùm đèn lồng và cắt bớt người đứng ở mép phải ảnh.
 */
const ANH_DI_TICH = 'pho-den-long';
const TIEU_DIEM: [number, number] = [0.2, 0.45];
const PHONG_TOI = 1.06;
/** Dòng chữ nằm ở phần tối của ảnh, trên vùng 420 px dưới cùng mà mạng xã hội che. */
const DINH_CHU = 1360;

/** Dải tối dưới chân ảnh để chữ đọc được trên mọi phần ảnh. */
function DaiToi() {
  return <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(29,31,41,0.92) 0%, rgba(29,31,41,0.72) 34%, rgba(29,31,41,0) 60%)' }} />;
}

/**
 * Cảnh mở đầu: nhà cổ treo đèn lồng ở phố cổ Hội An tràn khung hiện lên từ nền tối, câu "đang đứng ở đây" và ghim vàng.
 * `tinh` = khung cuối, đứng yên (làm nền cho các dải ảnh cảnh sau trượt lên phủ).
 */
export function DungTruocDiTich({ chu, tinh = false }: { chu: string; tinh?: boolean }) {
  const fThat = useCurrentFrame();
  const m = MOC.dungTruocDiTich;
  const f = tinh ? m.phong[1] : fThat;
  const phong = 1 + (PHONG_TOI - 1) * tienDo(f, m.phong, DI);
  const tChu = tienDo(f, m.chu);
  const tGhim = tienDo(f, m.ghim);
  const tGach = tienDo(f, m.gach);
  return (
    <AbsoluteFill>
      <AnhDiTich id={ANH_DI_TICH} tiLe={phong} tieuDiem={TIEU_DIEM} style={{ opacity: tienDo(f, m.hien) }} />
      <DaiToi />
      <HatMin doDam={0.04} />
      <div style={{ position: 'absolute', left: 90, top: DINH_CHU, display: 'flex', alignItems: 'flex-end', gap: 22 }}>
        <GhimVang canh={46} style={{ opacity: tGhim, transform: `translateY(${(1 - tGhim) * -60}px)`, marginBottom: 10 }} />
        <CauTieuDe chu={chu} t={tChu} co={62} />
      </div>
      <div style={{ position: 'absolute', left: 158, top: DINH_CHU + 94, height: 5, width: 260, borderRadius: 3, backgroundColor: MAU.vang, transform: `scaleX(${tGach})`, transformOrigin: 'left center' }} />
    </AbsoluteFill>
  );
}

/** Cảnh kết quả: lại ảnh của cảnh mở đầu, ảnh thu về ngược chiều, ghim tỏa vòng sáng, rồi tối dần về thẻ kết. */
export function HieuRoi({ chu }: { chu: string }) {
  const f = useCurrentFrame();
  const m = MOC.hieuRoi;
  const phong = PHONG_TOI - (PHONG_TOI - 1) * tienDo(f, m.phong, DI);
  const tChu = tienDo(f, m.chu);
  const tVong = tienDo(f, m.vongSang, DI);
  const toi = tienDo(f, m.toiDan, DI);
  return (
    <AbsoluteFill>
      <AnhDiTich id={ANH_DI_TICH} tiLe={phong} tieuDiem={TIEU_DIEM} />
      <DaiToi />
      <HatMin doDam={0.04} />
      <div style={{ position: 'absolute', left: 90, top: DINH_CHU, display: 'flex', alignItems: 'flex-end', gap: 22 }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <GhimVang canh={46} />
          <div
            style={{
              position: 'absolute',
              left: 23 - 20 - tVong * 50,
              top: 20 - 20 - tVong * 50,
              width: 40 + tVong * 100,
              height: 40 + tVong * 100,
              borderRadius: '50%',
              border: `3px solid ${MAU.vang}`,
              opacity: interpolate(tVong, [0, 0.2, 1], [0, 0.9, 0]),
            }}
          />
        </div>
        <CauTieuDe chu={chu} t={tChu} co={62} />
      </div>
      <AbsoluteFill style={{ backgroundColor: MAU.navy, opacity: toi }} />
    </AbsoluteFill>
  );
}
