import { Easing, interpolate } from 'remotion';
import bang from '../../kich-ban/quang-cao/canh.json';

// Mọi mốc thời gian và đường cong của video quảng cáo nằm ở tệp này (thứ tự cảnh và độ dài theo phách ở kich-ban/quang-cao/canh.json,
// dùng chung với script tạo nhạc); component chỉ đọc từ đây, không tự đặt số khung hình.
// 30 khung mỗi giây, nhạc 120 nhịp mỗi phút: một phách dài 15 khung, mọi điểm cắt rơi đúng phách.

export const FPS = bang.khungMoiGiay;
export const PHACH = (FPS * 60) / bang.nhipMoiPhut;

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
export const CANH_DOC_30 = xepLien(bang.doc30.map(([id, phach]) => [id as IdCanh, (phach as number) * PHACH]));

export const TONG_DOC_30 = CANH_DOC_30[CANH_DOC_30.length - 1].tu + CANH_DOC_30[CANH_DOC_30.length - 1].dai;

/** Mốc bên trong từng cảnh, tính bằng khung kể từ đầu cảnh. [a, b] = chạy từ khung a tới khung b. */
export const MOC = {
  dungTruocDiTich: { phong: [0, 59], chu: [3, 15], ghim: [10, 22], gach: [18, 36] },
  chiTietBiAn: { dai2Vao: [0, 12], dai3Vao: [4, 16], troi: [0, 59], chu: [6, 18], vachNgan: [18, 36] },
  moApp: {
    nenNhoe: [0, 15],
    mayTroi: [0, 18],
    logo: { vong: [8, 20], dia: [11, 23], tangCong: { batDau: 14, lech: 3, dai: 10 }, chuCung: [26, 40] },
    banDoHien: [36, 44],
    xuyenMan: [46, 59],
  },
  banDoZoom: { phong: [2, 52], chu: [6, 18], nguoi: [14, 24], ghim: [32, 42], ghimLon: [56, 66] },
  banDoTrongMay: { mayKhep: [0, 15], theTruot: [13, 29], cham: [41, 51] },
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

/** Mốc dựng huy hiệu: vòng vàng, đĩa kem, năm tầng cổng lệch nhịp, chữ chạy theo cung. */
export interface MocHuyHieu {
  vong: Doan;
  dia: Doan;
  tangCong: { batDau: number; lech: number; dai: number };
  chuCung: Doan;
}

/**
 * Tầm nhìn bản đồ: số mét trên một điểm ảnh lúc bắt đầu phóng (khung rộng khoảng 3 km) và hệ số phóng tới cuối cảnh.
 * Bản đồ trong điện thoại ở cảnh mở app và cảnh bản đồ trong máy tính từ hai số này để nối liền khi cắt.
 */
export const BAN_DO = { metMoiDiemDau: 2.8, heSoPhong: 6 } as const;

type Doan = readonly [number, number];

/** Tiến độ 0→1 của một đoạn [a, b] tại khung f, theo đường cong cho trước (mặc định VAO), kẹp hai đầu. */
export function tienDo(f: number, [a, b]: Doan, duongCong: (t: number) => number = VAO): number {
  return interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: duongCong });
}
