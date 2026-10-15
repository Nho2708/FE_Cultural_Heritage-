import en from '../../kich-ban/quang-cao/en.json';
import type { IdCanh } from './nhip';

// Chữ của video quảng cáo theo ngôn ngữ: mỗi ngôn ngữ một tệp kich-ban/quang-cao/<mã>.json cùng cấu trúc với en.json.
// Dựng bản tiếng Việt, Hàn, Nhật sau này: thêm tệp rồi khai báo ở BO_CHU, không sửa component.

export interface ChuQuangCao {
  ngonNgu: string;
  canh: Partial<Record<IdCanh, string>>;
  giaoDien: { tenDiTich: string; khoangCach: string; ngonNguNghe: Array<{ ma: string; ten: string }> };
  theKet: { ten: string; phu: string; diaChiHien: string; lienKetQr: string };
  moTaBaiDang: string;
}

const BO_CHU: Record<string, ChuQuangCao> = { en };

export type MaNgonNguQuangCao = keyof typeof BO_CHU;

export function chuQuangCao(ma: string): ChuQuangCao {
  const bo = BO_CHU[ma];
  if (!bo) throw new Error(`Chưa có tệp chữ kich-ban/quang-cao/${ma}.json`);
  return bo;
}
