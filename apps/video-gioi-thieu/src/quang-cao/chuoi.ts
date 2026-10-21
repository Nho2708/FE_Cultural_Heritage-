import en from '../../kich-ban/quang-cao/en.json';
import type { IdCanh } from './nhip';

// Chữ của video quảng cáo theo ngôn ngữ: mỗi ngôn ngữ một tệp kich-ban/quang-cao/<mã>.json cùng cấu trúc với en.json.
// Dựng bản tiếng Việt, Hàn, Nhật sau này: thêm tệp rồi khai báo ở BO_CHU, không sửa component.

export interface ChuQuangCao {
  ngonNgu: string;
  canh: Partial<Record<IdCanh, string>>;
  giaoDien: {
    tenDiTich: string;
    khoangCach: string;
    ngonNguNghe: Array<{ ma: string; ten: string }>;
    /** Chữ của trang chi tiết di sản trên web (dựng lại giống trang thật): nút đăng nhập, đường dẫn, nhãn, nút, dòng ghi nguồn ảnh, đoạn giới thiệu. */
    trangChiTiet: { dangNhap: string; duongDan: string; the: string[]; nut: [string, string, string]; nguonAnh: string; gioiThieu: string; doanGioiThieu: string };
    /** Hai câu thuyết minh hiện chữ theo giọng đọc ở cảnh cận bảng nghe (câu đầu bản tóm tắt của di sản). */
    loiThuyetMinh: [string, string];
  };
  theKet: { ten: string; phu: string; diaChiHien: string; lienKetQr: string };
  moTaBaiDang: string;
}

const BO_CHU: Record<string, ChuQuangCao> = { en: en as ChuQuangCao };

export type MaNgonNguQuangCao = keyof typeof BO_CHU;

export function chuQuangCao(ma: string): ChuQuangCao {
  const bo = BO_CHU[ma];
  if (!bo) throw new Error(`Chưa có tệp chữ kich-ban/quang-cao/${ma}.json`);
  return bo;
}
