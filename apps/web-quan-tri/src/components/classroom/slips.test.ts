import { describe, expect, it } from 'vitest';
import { SLIPS_PER_PAGE, chunk, pdfName } from './slips';

describe('phiếu đăng nhập in khổ A4', () => {
  it('xếp 8 phiếu mỗi trang', () => {
    const pages = chunk(Array.from({ length: 28 }, (_, i) => i), SLIPS_PER_PAGE);
    expect(pages.map((p) => p.length)).toEqual([8, 8, 8, 4]);
    expect(chunk([], SLIPS_PER_PAGE)).toEqual([]);
  });

  it('tên tệp PDF không dấu theo tên lớp', () => {
    expect(pdfName('7A1')).toBe('Phieu-dang-nhap-lop-7A1');
    expect(pdfName('Lớp Đặc biệt 10/2')).toBe('Phieu-dang-nhap-lop-Lop-Dac-biet-10-2');
  });
});
