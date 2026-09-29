/** Dãy số trang có dấu "…" khi nhiều trang: luôn có trang đầu, cuối và trang đang xem cùng hai trang liền kề. */
export function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1]! > 1) result.push('gap');
    result.push(p);
  });
  return result;
}
