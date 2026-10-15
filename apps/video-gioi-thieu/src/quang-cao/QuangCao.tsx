import type { ReactNode } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from 'remotion';
import { PHONG_CHU } from '../brand';
import { DungTruocDiTich, HieuRoi } from './canh/AnhPho';
import { BanDoTrongMay } from './canh/BanDoTrongMay';
import { BanDoZoom } from './canh/BanDoZoom';
import { ChiTietBiAn } from './canh/ChiTietBiAn';
import { MoApp } from './canh/MoApp';
import { DoiNgonNgu } from './canh/DoiNgonNgu';
import { TheKet } from './canh/TheKet';
import { chuQuangCao } from './chuoi';
import { NenThuongHieu } from './nen';
import { CANH_DOC_30, type Canh } from './nhip';
import { useBanDo } from './ui/BanDo';

export interface QuangCaoProps {
  ngonNgu: string;
  [key: string]: unknown;
}

/** Video quảng cáo cho khách du lịch, bản dọc 30 giây: vấn đề → giải pháp (gần bạn, nghe thuyết minh, xem 3D) → kết quả → thẻ kết. */
export function QuangCao({ ngonNgu }: QuangCaoProps) {
  const chu = chuQuangCao(ngonNgu);
  const banDo = useBanDo();
  const cau = (id: Canh['id']) => chu.canh[id] ?? '';
  const noiDung = (c: Canh): ReactNode => {
    switch (c.id) {
      case 'dung-truoc-di-tich':
        return <DungTruocDiTich chu={cau(c.id)} />;
      case 'chi-tiet-bi-an':
        return <ChiTietBiAn chu={cau(c.id)} />;
      case 'mo-app':
        return banDo ? <MoApp chuCanhTruoc={cau('chi-tiet-bi-an')} banDo={banDo} /> : null;
      case 'ban-do-zoom':
        return banDo ? <BanDoZoom chu={cau(c.id)} banDo={banDo} /> : null;
      case 'ban-do-trong-may':
        return banDo ? <BanDoTrongMay banDo={banDo} tenDiTich={chu.giaoDien.tenDiTich} khoangCach={chu.giaoDien.khoangCach} /> : null;
      case 'doi-ngon-ngu':
        return <DoiNgonNgu batDau={c.tu} ds={chu.giaoDien.ngonNguNghe} tienTrinhDau={0.28} tienTrinhCuoi={0.36} />;
      case 'hieu-roi':
        return <HieuRoi chu={cau(c.id)} />;
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
      {/* Nhạc đã chuẩn hóa -14 LUFS sẵn trong tệp (scripts/tao-nhac-quang-cao.py), phát nguyên mức. */}
      <Html5Audio src={staticFile('nhac/quang-cao-30s.wav')} />
    </NenThuongHieu>
  );
}

/** Cảnh chưa dựng (các cổng duyệt sau), chỉ để xem khung thời gian trong Remotion Studio. */
function ChuaDung({ id }: { id: string }) {
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: PHONG_CHU, fontSize: 36, color: 'rgba(255,255,255,0.35)' }}>{id}</AbsoluteFill>;
}
