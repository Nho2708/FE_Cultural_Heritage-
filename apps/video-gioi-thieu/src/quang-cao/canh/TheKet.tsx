import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MAU, PHONG_CHU, PHONG_TIEU_DE } from '../../brand';
import type { ChuQuangCao } from '../chuoi';
import { DO_TRUOT_CHU, MOC, tienDo } from '../nhip';
import { VongManh } from '../nen';
import { HuyHieuVao } from '../ui/HuyHieuVao';
import { MaQR } from '../ui/MaQR';

const CANH_HUY_HIEU = 400;
const DINH_HUY_HIEU = 270;
/** Khoảng dời cả khối xuống để khối nằm giữa vùng an toàn (từ 220 px trên cùng tới 420 px dưới cùng). */
const DOI = DINH_HUY_HIEU - 230;
const CANH_THE_QR = 440;

/** Trượt lên khi xuất hiện, cùng quãng với chữ tiêu đề. */
const truot = (t: number) => ({ opacity: t, transform: `translateY(${(1 - t) * DO_TRUOT_CHU}px)` });

/**
 * Thẻ kết: huy hiệu dựng lên rồi đứng yên tới hết video, không đổi sang ảnh nào. Tên, dòng phụ, mã QR và địa chỉ vào ngay đầu thẻ
 * rồi đứng yên. Không có chữ nào trong 420 px dưới cùng (vùng chữ và nút của mạng xã hội).
 */
export function TheKet({ chu }: { chu: ChuQuangCao['theKet'] }) {
  const f = useCurrentFrame();
  const m = MOC.theKet;
  const tQr = tienDo(f, m.khoiQr);
  return (
    <AbsoluteFill>
      <VongManh x={540} y={DINH_HUY_HIEU + CANH_HUY_HIEU / 2} r={CANH_HUY_HIEU * 0.75} />
      <VongManh x={540} y={DINH_HUY_HIEU + CANH_HUY_HIEU / 2} r={CANH_HUY_HIEU * 0.98} doDam={0.08} />
      <div style={{ position: 'absolute', top: DINH_HUY_HIEU, left: (1080 - CANH_HUY_HIEU) / 2, width: CANH_HUY_HIEU, height: CANH_HUY_HIEU }}>
        <HuyHieuVao f={f} canh={CANH_HUY_HIEU} moc={m} />
      </div>
      <div style={{ position: 'absolute', top: 668 + DOI, left: 0, right: 0, textAlign: 'center', fontFamily: PHONG_TIEU_DE, fontWeight: 700, fontSize: 92, lineHeight: 1.1, color: MAU.kem, whiteSpace: 'nowrap', ...truot(tienDo(f, m.ten)) }}>
        {chu.ten}
      </div>
      <div style={{ position: 'absolute', top: 790 + DOI, left: 0, right: 0, textAlign: 'center', fontFamily: PHONG_CHU, fontWeight: 500, fontSize: 44, letterSpacing: 1, color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap', ...truot(tienDo(f, m.phu)) }}>
        {chu.phu}
      </div>
      <div style={{ position: 'absolute', top: 900 + DOI, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', ...truot(tQr) }}>
        <div style={{ width: CANH_THE_QR, height: CANH_THE_QR, borderRadius: 36, backgroundColor: '#F7F1E6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${MAU.vang}, 0 24px 60px rgba(0,0,0,0.4)` }}>
          <MaQR noiDung={chu.lienKetQr} canh={CANH_THE_QR - 72} mau={MAU.navyDam} />
        </div>
        <div style={{ marginTop: 34, fontFamily: PHONG_CHU, fontWeight: 500, fontSize: 31, color: MAU.kem, whiteSpace: 'nowrap' }}>{chu.diaChiHien}</div>
      </div>
    </AbsoluteFill>
  );
}
