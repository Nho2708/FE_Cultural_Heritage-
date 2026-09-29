import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

// Bộ lọc và trang của bảng quản trị nằm trên URL để gửi hoặc quay lại được đúng trạng thái. Tên tham số và giá trị viết
// chữ Việt không dấu như route: ?tu-khoa=…&trang-thai=bi-khoa&trang=2. Giá trị enum của API đổi qua lại bằng bảng `slugs`.

export const PAGE_SIZE = 20;

/** Đọc số trang từ URL (≥ 1). */
export function readPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Bảng đổi giá trị enum ⇄ chữ Việt không dấu trên URL. */
export function slugMap<T extends string>(slugs: Record<T, string>) {
  const reverse = new Map(Object.entries(slugs).map(([value, slug]) => [slug as string, value as T]));
  return {
    toSlug: (value: T | '') => (value === '' ? '' : slugs[value]),
    fromSlug: (slug: string | null): T | '' => (slug ? (reverse.get(slug) ?? '') : ''),
  };
}

/**
 * Đọc / ghi tham số danh sách trên URL. Đổi bộ lọc thì về trang 1; giá trị rỗng thì bỏ khỏi URL.
 * `replace` để thao tác lọc không làm dài lịch sử trình duyệt.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string | number | null>, keepPage = false) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '' || (key === 'trang' && value === 1)) next.delete(key);
            else next.set(key, String(value));
          }
          if (!keepPage && !('trang' in changes)) next.delete('trang');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { params, update, page: readPage(params.get('trang')) };
}
