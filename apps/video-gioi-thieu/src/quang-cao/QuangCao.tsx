import type { ReactNode } from 'react';
import { Html5Audio, Sequence, staticFile } from 'remotion';
import { DungTruocDiTich, HieuRoi } from './canh/AnhPho';
import { BanDoTrongMay } from './canh/BanDoTrongMay';
import { BanDoZoom } from './canh/BanDoZoom';
import { ChiTietBiAn } from './canh/ChiTietBiAn';
import { DoiNgonNgu } from './canh/DoiNgonNgu';
import { MoApp } from './canh/MoApp';
import { MoHinhGocCao, MoHinhTrongMay, MoHinhXoay } from './canh/MoHinh';
import { SongAmCanCanh } from './canh/SongAmCanCanh';
import { TheKet } from './canh/TheKet';
import { TrangChiTiet } from './canh/TrangChiTiet';
import { chuQuangCao } from './chuoi';
import { NenThuongHieu } from './nen';
import { CANH_DOC_30, MOC, type Canh } from './nhip';
import { useBanDo } from './ui/BanDo';
import { useMoHinh, type MoHinh } from './ui/MoHinh3D';

export interface QuangCaoProps {
  ngonNgu: string;
  [key: string]: unknown;
}

/** Chỉ vẽ cảnh 3D khi mô hình đã tải xong (mô hình tải một lần, chỉ ở các cảnh có 3D). */
function CoMoHinh({ ve }: { ve: (moHinh: MoHinh) => ReactNode }) {
  const moHinh = useMoHinh();
  return moHinh ? <>{ve(moHinh)}</> : null;
}

const canhTheoId = (id: Canh['id']) => CANH_DOC_30.find((c) => c.id === id)!;

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
      case 'trang-chi-tiet':
        return banDo ? <TrangChiTiet chu={cau(c.id)} banDo={banDo} tenDiTich={chu.giaoDien.tenDiTich} khoangCach={chu.giaoDien.khoangCach} /> : null;
      case 'song-am':
        return <SongAmCanCanh batDau={c.tu} />;
      case 'doi-ngon-ngu':
        return <DoiNgonNgu batDau={c.tu} ds={chu.giaoDien.ngonNguNghe} tienTrinhDau={MOC.songAm.tienTrinh[1]} tienTrinhCuoi={MOC.doiNgonNgu.tienTrinhCuoi} />;
      case 'mo-hinh-xoay':
        return <CoMoHinh ve={(m) => <MoHinhXoay chu={cau(c.id)} moHinh={m} />} />;
      case 'mo-hinh-goc-cao':
        return <CoMoHinh ve={(m) => <MoHinhGocCao moHinh={m} khungCanhTruoc={canhTheoId('mo-hinh-xoay').dai} />} />;
      case 'mo-hinh-trong-may':
        return <CoMoHinh ve={(m) => <MoHinhTrongMay moHinh={m} />} />;
      case 'hieu-roi':
        return <HieuRoi chu={cau(c.id)} />;
      case 'the-ket':
        return <TheKet chu={chu.theKet} />;
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
