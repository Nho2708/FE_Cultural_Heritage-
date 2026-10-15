import { BAN_DO } from '../nhip';
import type { DuLieuBanDo, TamNhin } from '../ui/BanDo';
import { coMay } from '../ui/KhungMay';

// Hình học chung của ba cảnh có bản đồ (mở app → bản đồ tràn khung → bản đồ trong máy) để hai lần cắt nối liền:
// cuối cảnh mở app, màn hình điện thoại phóng tới đúng tầm nhìn đầu cảnh bản đồ tràn khung; đầu cảnh bản đồ trong máy,
// điện thoại đang phóng đúng bằng tầm nhìn cuối cảnh bản đồ tràn khung rồi mới thu về.

/** Điện thoại lớn bị mép dưới cắt (cảnh mở app): bề rộng màn hình, mép trên, tỉ lệ phóng khi xuyên vào màn hình. */
export const MAY_MO_APP = { rongMan: 800, dinh: 420, phongXuyen: 1.42 } as const;
/** Điện thoại nguyên chiếc giữa khung (cảnh bản đồ trong máy): bề rộng màn hình, tỉ lệ phóng lúc bắt đầu (màn hình che kín khung). */
export const MAY_TRONG_MAY = { rongMan: 680, phongDau: 1.66 } as const;

/** Cỡ ghim di sản và chấm người xem trên bản đồ tràn khung (px video); ghim được chọn phóng tới tỉ lệ GHIM_CHON. */
export const GHIM = { canh: 72, chon: 1.4, banKinhNguoi: 22, chuKySong: 30 } as const;

/** Tâm khung nhìn: giữa ghim di sản và người xem. */
export function tamBanDo(d: DuLieuBanDo): { x: number; y: number } {
  return { x: (d.ghim[0] + d.nguoi[0]) / 2, y: (d.ghim[1] + d.nguoi[1]) / 2 };
}

/** Tầm nhìn trên màn hình ở mức phóng z (1 = đầu cảnh bản đồ tràn khung, BAN_DO.heSoPhong = cuối cảnh). */
export function tamNhin(d: DuLieuBanDo, z: number): TamNhin {
  return { ...tamBanDo(d), m: BAN_DO.metMoiDiemDau / z };
}

export const caoManMoApp = coMay(MAY_MO_APP.rongMan).caoMan;
