import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { PHONG_CHU } from '../brand';
import { DungTruocDiTich, HieuRoi } from './canh/AnhPho';
import { DoiNgonNgu } from './canh/DoiNgonNgu';
import { TheKet } from './canh/TheKet';
import { chuQuangCao } from './chuoi';
import { NenThuongHieu } from './nen';
import { CANH_DOC_30, type Canh } from './nhip';

export interface QuangCaoProps {
  ngonNgu: string;
  [key: string]: unknown;
}

/** Video quảng cáo cho khách du lịch, bản dọc 30 giây: vấn đề → giải pháp (gần bạn, nghe thuyết minh, xem 3D) → kết quả → thẻ kết. */
export function QuangCao({ ngonNgu }: QuangCaoProps) {
  const chu = chuQuangCao(ngonNgu);
  const noiDung = (c: Canh): ReactNode => {
    switch (c.id) {
      case 'dung-truoc-di-tich':
        return <DungTruocDiTich chu={chu.canh[c.id] ?? ''} />;
      case 'doi-ngon-ngu':
        return <DoiNgonNgu batDau={c.tu} ds={chu.giaoDien.ngonNguNghe} tienTrinhDau={0.28} tienTrinhCuoi={0.36} />;
      case 'hieu-roi':
        return <HieuRoi chu={chu.canh[c.id] ?? ''} />;
      case 'the-ket':
        return <TheKet chu={chu.theKet} />;
      default:
        return <ChuaDung id={c.id} />;
    }
  };
  return (
    <NenThuongHieu>
      {CANH_DOC_30.map((c) => (
        <Sequence key={c.id} from={c.tu} durationInFrames={c.dai} name={c.id}>
          {noiDung(c)}
        </Sequence>
      ))}
    </NenThuongHieu>
  );
}

/** Cảnh chưa dựng (các cổng duyệt sau), chỉ để xem khung thời gian trong Remotion Studio. */
function ChuaDung({ id }: { id: string }) {
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: PHONG_CHU, fontSize: 36, color: 'rgba(255,255,255,0.35)' }}>{id}</AbsoluteFill>;
}
