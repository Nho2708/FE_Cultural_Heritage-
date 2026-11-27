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
  | 'mo-hinh-hue'
  | 'mo-hinh-trong-may'
  | 'hieu-roi'
  | 'the-ket';

export interface Canh {
  id: IdCanh;
  /** Khung bắt đầu trong video. */
  tu: number;
  /** Số khung. Mỗi cảnh tối đa 75 khung (2,5 giây); riêng thẻ kết dài hơn để mã QR và địa chỉ đứng trên màn hình đủ lâu. */
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
  /** Ảnh nhà cổ treo đèn lồng hiện lên (từ nền tối) rồi phóng chậm; chữ trượt lên, ghim rơi, gạch chân kẻ ra. */
  dungTruocDiTich: { hien: [0, 8], phong: [0, 59], chu: [3, 15], ghim: [10, 22], gach: [18, 36] },
  /**
   * Ba dải ảnh lần lượt trượt từ phải sang trái phủ lên ảnh cảnh trước (dải i bắt đầu ở batDau + i·lech), mỗi dải mang vạch vàng ở mép trái;
   * khi đã nằm yên, vạch ngăn dải đậm dần (vachDam, dải sau muộn hơn lechVach). Ảnh trong dải trôi ngang chậm.
   */
  chiTietBiAn: { daiVao: { batDau: 0, lech: 5, dai: 14 }, troi: [0, 59], chu: [14, 26], vachDam: [18, 34], lechVach: 6 },
  moApp: {
    nenNhoe: [0, 12],
    mayTroi: [0, 15],
    /** Màn hình chờ của app: hai trang sách mở, mái rồi bờ nóc hạ xuống. */
    logo: { sach: [6, 16], mai: [9, 19], noc: [12, 22] },
    /** Màn hình chuyển sang bản đồ cả nước, camera xuyên vào màn hình, rồi bản đồ lao xuống Hội An cho tới đúng tầm đầu cảnh sau. */
    banDoHien: [24, 30],
    xuyenMan: [30, 44],
    laoXuong: [34, 59],
  },
  banDoZoom: { phong: [2, 52], chu: [6, 18], nguoi: [14, 24], ghim: [32, 42], ghimLon: [56, 66] },
  banDoTrongMay: { mayKhep: [0, 15], theTruot: [13, 29], cham: [36, 46], nhan: [36, 44] },
  /**
   * Trang chi tiết. moTrang tính từ đầu cảnh, số âm là trước điểm cắt: thẻ bắt đầu mở thành trang ở phách cuối cảnh bản đồ trong máy,
   * cắt sang khung cận giữa lúc đang mở (cắt trên chuyển động). Camera đẩy dần về nút nghe, nút nhịp hai lần, ngón tay chạm nút ở phách thứ tư.
   */
  trangChiTiet: { moTrang: [-12, 12], noiDung: [-6, 10], chu: [6, 18], day: [0, 59], nutNhip: [12, 36], ngonVao: [36, 44], cham: [44, 54], ngonRa: [50, 58] },
  /**
   * Cận cảnh bảng nghe: nút nhún và đổi sang tạm dừng, sóng âm dâng lên, chữ câu thứ nhất hiện từng từ theo giọng đọc
   * (từ thứ i hiện ở cau1 + i·moiTu, mỗi từ mất hienTu khung), vạch tô nhảy sang câu sau rồi câu sau hiện tương tự; tiến trình chạy đều.
   */
  songAm: { nhan: [0, 8], gon: [0, 16], doiNut: 4, dangLen: [3, 15], cau1: 8, cau2: 52, moiTu: 3, hienTu: 5, doiCau: [44, 54], day: [0, 74], tienTrinh: [0, 0.28] },
  doiNgonNgu: { moiNgonNgu: PHACH, doiChu: 6, lia: [0, 59], tienTrinhCuoi: 0.36 },
  /** Mô hình đứng một mình: xoay đều, camera tiến lại gần (khoảng cách nhân hệ số), chữ vào. */
  moHinhXoay: { tien: [0, 59], khoangCach: [1.15, 1], ngang: 10, chu: [4, 16] },
  /** Mô hình thứ hai (Cao Đỉnh, Hoàng thành Huế) đứng một mình: xoay tiếp cùng nhịp không ngắt qua điểm cắt, camera ngẩng dần lên. */
  moHinhHue: { ngang: [8, 32], khoangCach: 0.92, nhinCao: 0.46, ngangLen: [0, 59] },
  /** Hộp 3D của app trong điện thoại lớn: ngón tay đặt xuống, kéo ngang, mô hình xoay theo ngón rồi ngón nhấc lên. */
  moHinhTrongMay: { mayLen: [0, 12], ngonVao: [2, 10], keo: [10, 40], ngonRa: [42, 50], doiX: [-160, 160], xoayThem: 90, gocDau: 25, ngang: 14 },
  hieuRoi: { phong: [0, 74], chu: [4, 16], vongSang: [10, 40], toiDan: [60, 74] },
  theKet: {
    khoiQr: [0, 12],
    sach: [0, 12],
    mai: [6, 18],
    noc: [12, 24],
    ten: [12, 24],
    /** Hai chấm chữ i của chữ DiViet nảy lên sau cùng. */
    cham: [24, 34],
    phu: [16, 28],
    nhacTat: [105, 134],
  },
} as const;

/**
 * Tầm nhìn bản đồ: số mét trên một điểm ảnh lúc bắt đầu phóng (khung rộng khoảng 3 km) và hệ số phóng tới cuối cảnh.
 * Bản đồ trong điện thoại ở cảnh mở app và cảnh bản đồ trong máy tính từ hai số này để nối liền khi cắt.
 */
export const BAN_DO = { metMoiDiemDau: 2.8, heSoPhong: 6 } as const;

/**
 * Mô hình 3D ở hai cảnh đầu xoay đều (tuyến tính, không đường cong) và nối liền qua điểm cắt:
 * góc tại khung f tính từ đầu cảnh xoay = gocDau + tocDo·f (độ).
 */
export const MO_HINH = { gocDau: 20, tocDo: 1.5 } as const;

type Doan = readonly [number, number];

/** Tiến độ 0→1 của một đoạn [a, b] tại khung f, theo đường cong cho trước (mặc định VAO), kẹp hai đầu. */
export function tienDo(f: number, [a, b]: Doan, duongCong: (t: number) => number = VAO): number {
  return interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: duongCong });
}
