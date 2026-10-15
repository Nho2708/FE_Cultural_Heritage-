import { Easing, interpolate } from 'remotion';

// Mọi mốc thời gian và đường cong của video quảng cáo nằm ở tệp này; component chỉ đọc từ đây, không tự đặt số khung hình.
// 30 khung mỗi giây. Nhạc 120 nhịp mỗi phút nên một phách dài 15 khung; mọi điểm cắt rơi đúng phách.

export const FPS = 30;
export const PHACH = 15;

/** Đường cong cho mọi thứ xuất hiện: chữ, khung, ghim, thẻ. */
export const VAO = Easing.bezier(0.19, 1, 0.22, 1);
/** Đường cong cho mọi chuyển động camera: zoom, lia, quỹ đạo quanh mô hình. */
export const DI = Easing.bezier(0.65, 0, 0.35, 1);

/** Quãng đường chữ trượt lên khi xuất hiện (px). */
export const DO_TRUOT_CHU = 40;

export type IdCanh =
  | 'dung-truoc-di-tich'
  | 'chi-tiet-bi-an'
  | 'mo-app'
  | 'ban-do-zoom'
  | 'ban-do-trong-may'
  | 'trang-chi-tiet'
  | 'song-am'
  | 'doi-ngon-ngu'
  | 'mo-hinh-xoay'
  | 'mo-hinh-goc-cao'
  | 'mo-hinh-trong-may'
  | 'hieu-roi'
  | 'the-ket';

export interface Canh {
  id: IdCanh;
  /** Khung bắt đầu trong video. */
  tu: number;
  /** Số khung. Mỗi cảnh tối đa 75 khung (2,5 giây); riêng thẻ kết gồm hai cảnh nối nhau, xem MOC.theKet.doiAnh. */
  dai: number;
}

function xepLien(ds: Array<[IdCanh, number]>): Canh[] {
  let tu = 0;
  return ds.map(([id, dai]) => {
    const canh = { id, tu, dai };
    tu += dai;
    return canh;
  });
}

/** Bản chính 9:16, 30 giây. */
export const CANH_DOC_30 = xepLien([
  ['dung-truoc-di-tich', 4 * PHACH],
  ['chi-tiet-bi-an', 4 * PHACH],
  ['mo-app', 4 * PHACH],
  ['ban-do-zoom', 5 * PHACH],
  ['ban-do-trong-may', 4 * PHACH],
  ['trang-chi-tiet', 4 * PHACH],
  ['song-am', 5 * PHACH],
  ['doi-ngon-ngu', 4 * PHACH],
  ['mo-hinh-xoay', 4 * PHACH],
  ['mo-hinh-goc-cao', 4 * PHACH],
  ['mo-hinh-trong-may', 4 * PHACH],
  ['hieu-roi', 5 * PHACH],
  ['the-ket', 9 * PHACH],
]);

export const TONG_DOC_30 = CANH_DOC_30[CANH_DOC_30.length - 1].tu + CANH_DOC_30[CANH_DOC_30.length - 1].dai;

/** Mốc bên trong từng cảnh, tính bằng khung kể từ đầu cảnh. [a, b] = chạy từ khung a tới khung b. */
export const MOC = {
  dungTruocDiTich: { phong: [0, 59], chu: [3, 15], ghim: [10, 22], gach: [18, 36] },
  doiNgonNgu: { moiNgonNgu: PHACH, doiChu: 6, lia: [0, 59] },
  songAm: { dangLen: [3, 15] },
  hieuRoi: { phong: [0, 74], chu: [4, 16], vongSang: [10, 40], toiDan: [60, 74] },
  theKet: {
    khoiQr: [0, 12],
    vong: [0, 12],
    dia: [3, 15],
    tangCong: { batDau: 7, lech: 3, dai: 10 },
    chuCung: [27, 45],
    ten: [12, 24],
    phu: [16, 28],
    /** Khung cắt sang cảnh thứ hai của thẻ kết: chỉ đổi nửa trên, khối mã QR và địa chỉ đứng yên. */
    doiAnh: 4 * PHACH,
    nhacTat: [105, 134],
  },
} as const;

type Doan = readonly [number, number];

/** Tiến độ 0→1 của một đoạn [a, b] tại khung f, theo đường cong cho trước (mặc định VAO), kẹp hai đầu. */
export function tienDo(f: number, [a, b]: Doan, duongCong: (t: number) => number = VAO): number {
  return interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: duongCong });
}
