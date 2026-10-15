import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MAU } from '../../brand';
import { HatMin } from '../nen';
import { DI, MOC, tienDo } from '../nhip';
import { AnhDiTich, CauTieuDe } from '../thanh-phan';

/** Ba dải ảnh chi tiết dựng đứng: rồng ở hội quán, mái ngói, đèn lồng. [id ảnh, tiêu điểm]. */
const DAI: Array<[string, [number, number]]> = [
  ['rong-hoi-quan', [0.42, 0.5]],
  ['mai-ngoi', [0.5, 0.45]],
  ['den-long-trang', [0.5, 0.5]],
];
const RONG_DAI = 360;
const TROI = 40;
const DINH_BANG_CHU = 1180;

/**
 * Cảnh "đây là gì": ba dải ảnh chi tiết, dải giữa trượt lên, dải phải trượt xuống, ảnh trong dải trôi dọc chậm;
 * dải chữ ngang giữa khung, vạch vàng ngăn dải kẻ từ trên xuống. `tinh` = khung cuối, đứng yên (làm nền nhòe cho cảnh sau).
 */
export function ChiTietBiAn({ chu, tinh = false }: { chu: string; tinh?: boolean }) {
  const fThat = useCurrentFrame();
  const m = MOC.chiTietBiAn;
  const f = tinh ? m.troi[1] : fThat;
  const vao = [1, tienDo(f, m.dai2Vao), tienDo(f, m.dai3Vao)];
  const huong = [0, 1, -1];
  const troi = tienDo(f, m.troi, DI) * TROI;
  const tVach = tienDo(f, m.vachNgan);
  return (
    <AbsoluteFill style={{ backgroundColor: MAU.navyDam }}>
      {DAI.map(([id, tieuDiem], i) => (
        <div key={id} style={{ position: 'absolute', left: i * RONG_DAI, top: 0, width: RONG_DAI, height: 1920, overflow: 'hidden', transform: `translateY(${(1 - vao[i]) * 1920 * huong[i]}px)` }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: -TROI, height: 1920 + TROI * 2, transform: `translateY(${-troi + TROI / 2}px)` }}>
            <AnhDiTich id={id} tieuDiem={tieuDiem} />
          </div>
        </div>
      ))}
      {[1, 2].map((k) => (
        <div key={k} style={{ position: 'absolute', left: k * RONG_DAI - 2, top: 0, width: 4, height: 1920 * tVach, backgroundColor: MAU.vang }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: DINH_BANG_CHU, height: 170, backgroundColor: 'rgba(29,31,41,0.78)', opacity: Math.min(1, tienDo(f, m.chu) * 1.6), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CauTieuDe chu={chu} t={tienDo(f, m.chu)} co={62} />
      </div>
      <HatMin doDam={0.04} />
    </AbsoluteFill>
  );
}
