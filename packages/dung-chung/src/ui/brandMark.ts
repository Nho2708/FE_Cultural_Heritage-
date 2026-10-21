// Đường nét của biểu tượng "DiViet": mái đình che quyển sách mở, vẽ trên khung 256 × 256.
// Sinh từ doc/design/logo/diviet/bo-logo/duong-net.json (nằm ngoài repo này); đổi logo thì sinh lại, không sửa tay.
// Màu không đặt ở đây mà ở styles/nen.css (hai bộ màu: nền sáng và nền tối), để biểu tượng đổi theo giao diện.

export type BrandMarkRole = 'roof' | 'book';

export interface BrandMarkPart {
  id: string;
  role: BrandMarkRole;
  d: string;
}

export interface BrandMarkShape {
  /** Phần nhìn thấy của khung 256 × 256, đã cắt sát. */
  viewBox: string;
  /** Rộng chia cao của viewBox. */
  aspect: number;
  parts: readonly BrandMarkPart[];
}

/** Bản đầy đủ: nóc có đuôi cong lên, mái đao cong, hai trang sách. */
export const BRAND_MARK_FULL: BrandMarkShape = {
  viewBox: '16 46 224 160',
  aspect: 224 / 160,
  parts: [
    { id: 'noc', role: 'roof', d: 'M92,58 H164 C172,58 182,56 186,46 C186,64 180,68 164,68 H92 C76,68 70,64 70,46 C74,56 84,58 92,58 Z' },
    {
      id: 'mai',
      role: 'roof',
      d: 'M84,72 H172 C182,86 196,102 220,106 C230,107 236,98 240,80 C241,98 236,114 224,120 C198,128 164,130 128,130 C92,130 58,128 32,120 C20,114 15,98 16,80 C20,98 26,107 36,106 C60,102 74,86 84,72 Z',
    },
    { id: 'sach-trai', role: 'book', d: 'M124,150 C104,140 68,136 44,138 V194 C72,192 104,196 124,206 Z' },
    { id: 'sach-phai', role: 'book', d: 'M132,150 C152,140 188,136 212,138 V194 C184,192 152,196 132,206 Z' },
  ],
};

/** Bản nhỏ cho cỡ từ 32 px trở xuống: bỏ nóc để nét không dính vào nhau. */
export const BRAND_MARK_SMALL: BrandMarkShape = {
  viewBox: '16 52 224 164',
  aspect: 224 / 164,
  parts: [
    {
      id: 'mai',
      role: 'roof',
      d: 'M86,52 H170 C180,68 194,86 216,92 C228,94 236,84 240,68 C242,88 236,106 222,112 C196,120 162,122 128,122 C94,122 60,120 34,112 C20,106 14,88 16,68 C20,84 28,94 40,92 C62,86 76,68 86,52 Z',
    },
    { id: 'sach-trai', role: 'book', d: 'M119,158 C99,148 65,146 41,148 V206 C69,204 99,206 119,216 Z' },
    { id: 'sach-phai', role: 'book', d: 'M137,158 C157,148 191,146 215,148 V206 C187,204 157,206 137,216 Z' },
  ],
};
