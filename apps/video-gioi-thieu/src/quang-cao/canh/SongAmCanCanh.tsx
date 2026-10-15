import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HatMin } from '../nen';
import { DI, MOC, tienDo } from '../nhip';
import { BieuTuongPhat, BieuTuongTamDung } from '../ui/BieuTuong';
import { MAU_APP } from '../ui/mau-app';
import { SongAm } from '../ui/SongAm';

const LE = 90;
const RONG = 900;
const NUT = { tamY: 500, canh: 240 } as const;
const SONG = { dinh: 700, cao: 360, soVach: 48 } as const;
const THANH = { dinh: 1160, cao: 14 } as const;
const CAU = { dinh: 1250, cao: 30, cach: 34, rong: [1, 0.9, 0.68] } as const;

/**
 * Cận cảnh bảng nghe, tràn khung trên nền của app, không khung điện thoại: nút phát nhún xuống và đổi sang tạm dừng, sóng âm dâng lên
 * rồi chạy theo từng cụm âm tiết, vạch tô câu đang đọc nhảy sang câu sau (như app tô câu đang đọc), thanh tiến trình chạy đều.
 * Các câu thuyết minh vẽ thành vạch, không có chữ. `batDau` là khung bắt đầu cảnh trong video (sóng âm nối liền sang cảnh đổi ngôn ngữ).
 */
export function SongAmCanCanh({ batDau }: { batDau: number }) {
  const f = useCurrentFrame();
  const m = MOC.songAm;
  const day = 1 + 0.04 * tienDo(f, m.day, DI);
  const nhan = Math.sin(Math.PI * tienDo(f, m.nhan, (x) => x));
  const tGon = tienDo(f, m.gon, (x) => x);
  const tienTrinh = m.tienTrinh[0] + (m.tienTrinh[1] - m.tienTrinh[0]) * tienDo(f, m.day, (x) => x);
  const cauDangDoc = tienDo(f, m.doiCau, DI);
  const yTo = cauDangDoc * (CAU.cao + CAU.cach);
  return (
    <AbsoluteFill style={{ backgroundColor: MAU_APP.nen }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 42%, rgba(250,233,188,0.55), rgba(250,233,188,0) 62%)' }} />
      <AbsoluteFill style={{ transform: `scale(${day})`, transformOrigin: '540px 900px' }}>
        <div style={{ position: 'absolute', left: 540 - NUT.canh / 2, top: NUT.tamY - NUT.canh / 2, width: NUT.canh, height: NUT.canh }}>
          {tGon > 0 && tGon < 1 ? (
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `6px solid ${MAU_APP.son}`, transform: `scale(${1 + 0.5 * tGon})`, opacity: 0.5 * (1 - tGon) }} />
          ) : null}
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: MAU_APP.son, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 22px 50px rgba(164,35,31,0.34)', transform: `scale(${1 - 0.08 * nhan})` }}>
            {f < m.doiNut ? <BieuTuongPhat canh={110} mau="#fff" /> : <BieuTuongTamDung canh={104} mau="#fff" />}
          </div>
        </div>
        <div style={{ position: 'absolute', left: LE, top: SONG.dinh }}>
          <SongAm f={batDau + f} rong={RONG} cao={SONG.cao} soVach={SONG.soVach} mau={MAU_APP.son} mauPhu="#E07E76" mo={tienDo(f, m.dangLen)} />
        </div>
        <div style={{ position: 'absolute', left: LE, top: THANH.dinh, width: RONG, height: THANH.cao, borderRadius: THANH.cao / 2, backgroundColor: MAU_APP.vien }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${tienTrinh * 100}%`, borderRadius: THANH.cao / 2, backgroundColor: MAU_APP.son }} />
          <div style={{ position: 'absolute', top: -12, left: `calc(${tienTrinh * 100}% - 19px)`, width: 38, height: 38, boxSizing: 'border-box', borderRadius: '50%', backgroundColor: '#fff', border: `5px solid ${MAU_APP.son}` }} />
        </div>
        <div style={{ position: 'absolute', left: LE, top: CAU.dinh, width: RONG }}>
          <div style={{ position: 'absolute', left: -24, right: -24, top: yTo - 16, height: CAU.cao + 32, borderRadius: 16, backgroundColor: MAU_APP.vangNhat, borderLeft: `7px solid ${MAU_APP.son}` }} />
          {CAU.rong.map((r, k) => (
            <div
              key={k}
              style={{
                position: 'relative',
                width: RONG * r,
                height: CAU.cao,
                marginBottom: CAU.cach,
                borderRadius: CAU.cao / 2,
                backgroundColor: interpolate(Math.abs(cauDangDoc - k), [0, 1], [1, 0], { extrapolateRight: 'clamp' }) > 0.5 ? '#C9A97A' : MAU_APP.vien,
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
      <HatMin doDam={0.035} />
    </AbsoluteFill>
  );
}
