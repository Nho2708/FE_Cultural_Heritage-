import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HatMin } from '../nen';
import { CANH_DOC_30, DI, MOC, tienDo } from '../nhip';
import { CauTieuDe } from '../thanh-phan';
import type { ChuQuangCao } from '../chuoi';
import type { DuLieuBanDo } from '../ui/BanDo';
import { KhungMay, coMay } from '../ui/KhungMay';
import { NgonTay } from '../ui/NgonTay';
import { MAY_TRONG_MAY } from './ban-do-chung';
import { LopBanDo } from './BanDoTrongMay';
import { MAN, NoiDungTrang, TAM_NUT_NGHE, TheMoThanhTrang } from './TheDiSan';

/** Số khung của cảnh bản đồ trong máy: sóng quanh chấm người xem và thẻ đang mở chạy tiếp từ cảnh đó. */
const DAI_CANH_TRUOC = CANH_DOC_30.find((c) => c.id === 'ban-do-trong-may')!.dai;

/**
 * Khung cận: điện thoại phóng quanh nút nghe đặt cố định ở độ cao NUT_Y (px video) nên màn hình gần kín bề ngang, viền máy còn lộ ở hai mép,
 * thanh trên của web còn thấy ở đầu khung. Camera đẩy chậm từ tỉ lệ đầu tới tỉ lệ cuối.
 */
const PHONG_CAN = [1.45, 1.5] as const;
const NUT_Y = 1069;
/** Câu chữ nằm trên vùng trời của ảnh đầu trang, giữa thanh trên và dòng đường dẫn, trên một dải tối mờ hai mép. */
const DINH_CHU = 235;

/**
 * Cảnh trang chi tiết (khung cận): cắt vào giữa lúc thẻ đang mở thành trang, bản đồ còn thấy phía trên rồi bị ảnh đầu trang phủ kín;
 * điện thoại phóng gần kín bề ngang, viền máy lộ ở hai mép. Camera đẩy chậm về hàng nút, nút nghe nhịp hai lần, ngón tay chạm nút.
 * Trang dựng lại giống trang chi tiết thật của web ở khổ điện thoại. Câu chữ nằm trên vùng trời của ảnh đầu trang.
 */
export function TrangChiTiet({ chu, banDo, giaoDien }: { chu: string; banDo: DuLieuBanDo; giaoDien: ChuQuangCao['giaoDien'] }) {
  const f = useCurrentFrame();
  const m = MOC.trangChiTiet;
  const r = MAY_TRONG_MAY.rongMan;
  const c = coMay(r);
  const k = r / MAN.rong;
  const trai = (1080 - c.rong) / 2;
  const dinh = NUT_Y - c.vien - TAM_NUT_NGHE.y * k;
  const phong = PHONG_CAN[0] + (PHONG_CAN[1] - PHONG_CAN[0]) * tienDo(f, m.day, DI);
  const tMo = tienDo(f, m.moTrang, DI);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${phong})`, transformOrigin: `540px ${NUT_Y}px` }}>
        <KhungMay rongMan={r} style={{ left: trai, top: dinh }}>
          {tMo < 1 ? <LopBanDo banDo={banDo} f={DAI_CANH_TRUOC + f} /> : null}
          <TheMoThanhTrang k={k} tMo={tMo} tenDiTich={giaoDien.tenDiTich} khoangCach={giaoDien.khoangCach} dangNhap={giaoDien.trangChiTiet.dangNhap}>
            <NoiDungTrang k={k} t={tienDo(f, m.noiDung)} tNhip={tienDo(f, m.nutNhip, (x) => x)} tCham={tienDo(f, m.cham)} tenDiTich={giaoDien.tenDiTich} chu={giaoDien.trangChiTiet} />
            <NgonTay x={TAM_NUT_NGHE.x * k} y={TAM_NUT_NGHE.y * k} canh={96 / PHONG_CAN[1]} tVao={tienDo(f, m.ngonVao)} tRa={tienDo(f, m.ngonRa)} />
          </TheMoThanhTrang>
        </KhungMay>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, rgba(29,31,41,0) ${DINH_CHU - 90}px, rgba(29,31,41,0.62) ${DINH_CHU - 20}px, rgba(29,31,41,0.62) ${DINH_CHU + 85}px, rgba(29,31,41,0) ${DINH_CHU + 150}px)`, opacity: tienDo(f, m.chu) }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: DINH_CHU, display: 'flex', justifyContent: 'center' }}>
        <CauTieuDe chu={chu} t={tienDo(f, m.chu)} co={56} />
      </div>
      <HatMin doDam={0.03} />
    </AbsoluteFill>
  );
}
