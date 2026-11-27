import { BieuTuong, NEN_TOI, tienDoTheoMoc, type MauLogo, type MocBieuTuong } from '../../Logo';

/**
 * Biểu tượng DiViet dựng lên (hai trang sách mở từ gáy, mái hạ xuống, bờ nóc hạ xuống), cùng nhịp với logo chuyển động của web
 * nhưng nén theo mốc truyền vào (màn hình chờ trong cảnh mở app, thẻ kết). `f` tính từ đầu cảnh; `rong` là chiều rộng hình.
 */
export function BieuTuongVao({ f, rong, moc, mau = NEN_TOI }: { f: number; rong: number; moc: MocBieuTuong; mau?: MauLogo }) {
  return <BieuTuong rong={rong} mau={mau} tienDo={tienDoTheoMoc(f, moc)} />;
}
