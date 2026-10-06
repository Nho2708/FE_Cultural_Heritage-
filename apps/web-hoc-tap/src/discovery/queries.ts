import type { DiscoveryFilter } from '@dsvhvn/dung-chung/api';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { discoveryApi, quietDiscoveryApi } from '../lib/api/client';
import { useLanguage } from '../i18n/context';
import { keywordInvalid } from './filters';

// Truy vấn dữ liệu khám phá công khai. Danh mục bộ lọc gần như không đổi nên giữ lâu; trang chủ, tìm kiếm, bản đồ,
// chi tiết dùng thời gian mặc định ngắn để di sản vừa ẩn hoặc xuất bản hiện đúng sau khi tải lại.

const CATALOG_STALE_MS = 60 * 60_000;

export const PICKER_PAGE_SIZE = 100;

// Mọi truy vấn nội dung di sản mang theo ngôn ngữ đang chọn (`lang`) và đưa nó vào khóa bộ nhớ đệm: đổi ngôn ngữ thì tải lại nội dung
// theo ngôn ngữ mới. Học sinh đã đăng nhập luôn là tiếng Việt (LanguageProvider). Danh mục bộ lọc không phụ thuộc ngôn ngữ: giao diện tự dịch tên.

export function useHome() {
  const lang = useLanguage();
  return useQuery({ queryKey: ['discovery', 'home', lang], queryFn: ({ signal }) => discoveryApi.home({ signal, lang }) });
}

export function useFilterCatalog() {
  return useQuery({
    queryKey: ['discovery', 'filters'],
    queryFn: ({ signal }) => discoveryApi.filters({ signal }),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useSearch(filter: DiscoveryFilter, page: number, pageSize: number) {
  // Từ khóa sai độ dài đã có câu lỗi trên ô nhập: không gọi máy chủ chỉ để nhận 400.
  const lang = useLanguage();
  const enabled = !keywordInvalid(filter.keyword);
  return useQuery({
    queryKey: ['discovery', 'search', lang, filter, page, pageSize],
    queryFn: ({ signal }) => discoveryApi.search(filter, { page, pageSize }, { signal, lang }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMapPins(filter: DiscoveryFilter) {
  const lang = useLanguage();
  const enabled = !keywordInvalid(filter.keyword);
  return useQuery({
    queryKey: ['discovery', 'map', lang, filter],
    queryFn: ({ signal }) => discoveryApi.map(filter, { signal, lang }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useHeritageDetail(slug: string | undefined) {
  const lang = useLanguage();
  return useQuery({
    queryKey: ['discovery', 'detail', lang, slug],
    queryFn: ({ signal }) => discoveryApi.detail(slug!, { signal, lang }),
    enabled: Boolean(slug),
  });
}

/**
 * Chi tiết di sản tải ngầm, không ghi vào lịch sử "đã xem" của khách (ảnh bìa trang chủ lấy chi tiết của di sản đầu danh sách mà khách chưa hề mở).
 * Khóa bộ nhớ đệm riêng để kết quả này không bị dùng lại ở trang chi tiết thật: trang đó phải gọi máy chủ để lượt xem được ghi.
 */
export function useQuietHeritageDetail(slug: string | undefined) {
  const lang = useLanguage();
  return useQuery({
    queryKey: ['discovery', 'detail-quiet', lang, slug],
    queryFn: ({ signal }) => quietDiscoveryApi.detail(slug!, { signal, lang }),
    enabled: Boolean(slug),
  });
}

export function useHeritageTimeline(slug: string | undefined) {
  const lang = useLanguage();
  return useQuery({
    queryKey: ['discovery', 'timeline', lang, slug],
    queryFn: ({ signal }) => discoveryApi.timeline(slug!, { signal, lang }),
    enabled: Boolean(slug),
  });
}

/** Mọi di sản (tối đa 100 mỗi trang) cho ô chọn di sản của Dòng thời gian; `keyword` tìm nhanh theo tên. */
export function usePickerHeritages(keyword: string) {
  const lang = useLanguage();
  const filter: DiscoveryFilter = keyword ? { keyword } : {};
  const enabled = !keywordInvalid(keyword);
  return useQuery({
    queryKey: ['discovery', 'picker', lang, keyword],
    queryFn: ({ signal }) => discoveryApi.search(filter, { page: 1, pageSize: PICKER_PAGE_SIZE }, { signal, lang }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Tiền tố khóa của mọi tóm tắt đã tải; khóa đầy đủ là `[...SUMMARY_KEY, ngôn ngữ, slug]`. */
export const SUMMARY_KEY = ['discovery', 'summary'] as const;

/** Tóm tắt của một di sản theo ngôn ngữ đang chọn; chỉ gọi khi hộp thoại tóm tắt mở (`enabled`). 404 là chưa có tóm tắt tiếng Việt đã duyệt: không thử lại. */
export function useHeritageSummary(slug: string | undefined, enabled: boolean) {
  const lang = useLanguage();
  return useQuery({
    queryKey: [...SUMMARY_KEY, lang, slug],
    queryFn: ({ signal }) => discoveryApi.summary(slug!, { signal, lang }),
    enabled: enabled && Boolean(slug),
    retry: false,
  });
}
