// Đổi danh-sach.json (ghi lúc chụp màn hình khách du lịch) sang toạ độ cuộn theo px trang cho từng ngôn ngữ.
export function chuyenViTri(danhSach) {
  const tyLe = danhSach.khung?.tyLe ?? 2.75;
  const caoKhung = danhSach.khung?.cao ?? 852;
  const ketQua = {};
  for (const [ngonNgu, { tep }] of Object.entries(danhSach.ngonNgu ?? {})) {
    const dongThoiGian = tep['11-dong-thoi-gian-dai.png'];
    ketQua[ngonNgu] = {
      dongThoiGian: dongThoiGian ? Math.max(0, Math.min(1300, Math.round(dongThoiGian.cao / tyLe - caoKhung))) : 0,
    };
  }
  return ketQua;
}
