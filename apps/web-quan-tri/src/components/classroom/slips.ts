// Chia phiếu đăng nhập theo trang in A4 và đặt tên tệp PDF.

export const SLIPS_PER_PAGE = 8;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** Tên tệp PDF (không dấu) theo tên lớp, ví dụ "Phieu-dang-nhap-lop-7A1". */
export function pdfName(className: string): string {
  const ascii = className.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return `Phieu-dang-nhap-lop-${ascii.replace(/[^A-Za-z0-9]+/g, '-')}`;
}
