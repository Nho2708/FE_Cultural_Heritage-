import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MAU } from '../../brand';
import { HatMin } from '../nen';
import { DI, MOC, tienDo } from '../nhip';
import { AnhDiTich, CauTieuDe } from '../thanh-phan';
import { DungTruocDiTich } from './AnhPho';

/** Ba dải ảnh chi tiết dựng đứng, từ trái sang phải: rồng ở hội quán người Hoa (Hội An), Ngọ Môn (Huế), cổng thành nhà Hồ. [id ảnh, tiêu điểm]. */
const DAI: Array<[string, [number, number]]> = [
  ['rong-hoi-quan', [0.47, 0.5]],
  ['ngo-mon-hue', [0.5, 0.45]],
  ['thanh-nha-ho', [0.71, 0.5]],
];
const RONG_DAI = 360;
/** Quãng ảnh trôi ngang trong dải (px), cùng chiều phải sang trái với lúc dải trượt vào. */
const TROI = 30;
const VACH = { mong: 3, day: 6 } as const;
const DINH_BANG_CHU = 1180;

/**
 * Cảnh "đây là gì": ba dải ảnh chi tiết lần lượt trượt từ phải sang trái phủ lên khung cuối cảnh trước, mỗi dải mang một vạch vàng
 * ở mép trái; khi các dải đã nằm yên, vạch ngăn dải đậm dần lên. Ảnh trong dải trôi ngang chậm, dải chữ ngang giữa khung.
 * `tinh` = khung cuối, đứng yên (làm nền nhòe cho cảnh sau); `chuCanhTruoc` là câu của cảnh trước (nền lúc các dải chưa phủ kín).
 */
export function ChiTietBiAn({ chu, chuCanhTruoc = '', tinh = false }: { chu: string; chuCanhTruoc?: string; tinh?: boolean }) {
  const fThat = useCurrentFrame();
  const m = MOC.chiTietBiAn;
  const f = tinh ? m.troi[1] : fThat;
  const vao = DAI.map((_, i) => tienDo(f, [m.daiVao.batDau + i * m.daiVao.lech, m.daiVao.batDau + i * m.daiVao.lech + m.daiVao.dai]));
  const troi = (0.5 - tienDo(f, m.troi, DI)) * TROI;
  return (
    <AbsoluteFill style={{ backgroundColor: MAU.navyDam }}>
      {vao[0] < 1 ? <DungTruocDiTich chu={chuCanhTruoc} tinh /> : null}
      {DAI.map(([id, tieuDiem], i) => {
        const tVach = tienDo(f, [m.vachDam[0] + (i - 1) * m.lechVach, m.vachDam[1] + (i - 1) * m.lechVach]);
        return (
          <div key={id} style={{ position: 'absolute', left: i * RONG_DAI, top: 0, width: RONG_DAI, height: 1920, overflow: 'hidden', transform: `translateX(${(1 - vao[i]) * (1080 - i * RONG_DAI)}px)`, boxShadow: vao[i] < 1 ? '-24px 0 48px rgba(0,0,0,0.45)' : undefined }}>
            <AnhDiTich id={id} tieuDiem={tieuDiem} tiLe={1.08} dichX={troi} />
            {/* Dải đầu nằm sát mép trái khung nên vạch của nó chỉ hiện lúc đang trượt; hai vạch kia thành vạch ngăn dải. */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: VACH.mong + (VACH.day - VACH.mong) * tVach, backgroundColor: MAU.vang, opacity: i === 0 ? 1 - vao[0] : 0.75 + 0.25 * tVach }} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: DINH_BANG_CHU, height: 170, backgroundColor: 'rgba(29,31,41,0.78)', opacity: Math.min(1, tienDo(f, m.chu) * 1.6), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CauTieuDe chu={chu} t={tienDo(f, m.chu)} co={62} />
      </div>
      <HatMin doDam={0.04} />
    </AbsoluteFill>
  );
}
