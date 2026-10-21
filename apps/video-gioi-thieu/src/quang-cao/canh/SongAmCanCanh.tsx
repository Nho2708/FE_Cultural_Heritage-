import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HatMin } from '../nen';
import { DI, MOC, tienDo } from '../nhip';
import { phongTheoMa } from '../phong';
import { BieuTuongPhat, BieuTuongTamDung } from '../ui/BieuTuong';
import { MAU_APP } from '../ui/mau-app';
import { SongAm } from '../ui/SongAm';

const LE = 90;
const RONG = 900;
/** Lề phải của khối chữ rộng hơn lề trái: cột nút của mạng xã hội nằm sát mép phải. */
const RONG_CHU = 850;
const NUT = { tamY: 420, canh: 220 } as const;
const SONG = { dinh: 590, cao: 300, soVach: 48 } as const;
const THANH = { dinh: 960, cao: 14 } as const;
const CAU = { dinh: 1050, co: 46, dong: 64, cach: 26, dem: 18 } as const;

/**
 * Một câu thuyết minh hiện từng từ theo giọng đọc: từ thứ i hiện ở khung batDau + i·moiTu (mờ dần lên, trượt nhẹ lên).
 * Câu đang đọc có nền tô và vạch đỏ son bên trái như app tô câu đang đọc; `to` 0→1 là độ đậm của phần tô.
 */
function CauDoc({ cau, f, batDau, to, ma }: { cau: string; f: number; batDau: number; to: number; ma: string }) {
  const m = MOC.songAm;
  // Tiếng Nhật, tiếng Trung không cách chữ bằng dấu cách: hiện từng chữ.
  const theoChu = /^(ja|zh)/.test(ma);
  const tu = theoChu ? Array.from(cau) : cau.split(' ');
  return (
    <div style={{ position: 'relative', width: RONG_CHU, padding: `${CAU.dem}px 0`, marginBottom: CAU.cach }}>
      <div style={{ position: 'absolute', left: -24, right: -24, top: 0, bottom: 0, borderRadius: 16, backgroundColor: MAU_APP.vangNhat, borderLeft: `7px solid ${MAU_APP.son}`, opacity: to }} />
      <div style={{ position: 'relative', fontFamily: phongTheoMa(ma), fontWeight: 500, fontSize: CAU.co, lineHeight: `${CAU.dong}px`, color: MAU_APP.chu }}>
        {tu.map((chu, i) => {
          const t = tienDo(f, [batDau + i * m.moiTu, batDau + i * m.moiTu + m.hienTu]);
          return (
            <span key={i} style={{ display: 'inline-block', marginRight: theoChu ? 0 : '0.28em', opacity: t, transform: `translateY(${(1 - t) * 10}px)` }}>
              {chu}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cận cảnh bảng nghe, tràn khung trên nền của app, không khung điện thoại: nút phát nhún xuống và đổi sang tạm dừng, sóng âm dâng lên
 * rồi chạy theo từng cụm âm tiết; chữ câu đang đọc hiện ra từng từ cùng lúc với sóng âm, vạch tô nhảy sang câu sau và câu sau hiện tương tự;
 * thanh tiến trình chạy đều. `batDau` là khung bắt đầu cảnh trong video (sóng âm nối liền sang cảnh đổi ngôn ngữ).
 */
export function SongAmCanCanh({ batDau, cau, ma }: { batDau: number; cau: [string, string]; ma: string }) {
  const f = useCurrentFrame();
  const m = MOC.songAm;
  const day = 1 + 0.04 * tienDo(f, m.day, DI);
  const nhan = Math.sin(Math.PI * tienDo(f, m.nhan, (x) => x));
  const tGon = tienDo(f, m.gon, (x) => x);
  const tienTrinh = m.tienTrinh[0] + (m.tienTrinh[1] - m.tienTrinh[0]) * tienDo(f, m.day, (x) => x);
  const doiCau = tienDo(f, m.doiCau, DI);
  return (
    <AbsoluteFill style={{ backgroundColor: MAU_APP.nen }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 32%, rgba(250,233,188,0.55), rgba(250,233,188,0) 62%)' }} />
      <AbsoluteFill style={{ transform: `scale(${day})`, transformOrigin: '540px 900px' }}>
        <div style={{ position: 'absolute', left: 540 - NUT.canh / 2, top: NUT.tamY - NUT.canh / 2, width: NUT.canh, height: NUT.canh }}>
          {tGon > 0 && tGon < 1 ? <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `6px solid ${MAU_APP.son}`, transform: `scale(${1 + 0.5 * tGon})`, opacity: 0.5 * (1 - tGon) }} /> : null}
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: MAU_APP.son, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 22px 50px rgba(164,35,31,0.34)', transform: `scale(${1 - 0.08 * nhan})` }}>
            {f < m.doiNut ? <BieuTuongPhat canh={100} mau="#fff" /> : <BieuTuongTamDung canh={96} mau="#fff" />}
          </div>
        </div>
        <div style={{ position: 'absolute', left: LE, top: SONG.dinh }}>
          <SongAm f={batDau + f} rong={RONG} cao={SONG.cao} soVach={SONG.soVach} mau={MAU_APP.son} mauPhu="#E07E76" mo={tienDo(f, m.dangLen)} />
        </div>
        <div style={{ position: 'absolute', left: LE, top: THANH.dinh, width: RONG, height: THANH.cao, borderRadius: THANH.cao / 2, backgroundColor: MAU_APP.vien }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${tienTrinh * 100}%`, borderRadius: THANH.cao / 2, backgroundColor: MAU_APP.son }} />
          <div style={{ position: 'absolute', top: -12, left: `calc(${tienTrinh * 100}% - 19px)`, width: 38, height: 38, boxSizing: 'border-box', borderRadius: '50%', backgroundColor: '#fff', border: `5px solid ${MAU_APP.son}` }} />
        </div>
        <div style={{ position: 'absolute', left: LE, top: CAU.dinh }}>
          <CauDoc cau={cau[0]} f={f} batDau={m.cau1} to={1 - doiCau} ma={ma} />
          <CauDoc cau={cau[1]} f={f} batDau={m.cau2} to={doiCau} ma={ma} />
        </div>
      </AbsoluteFill>
      <HatMin doDam={0.035} />
    </AbsoluteFill>
  );
}
