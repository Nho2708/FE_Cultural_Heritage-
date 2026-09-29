import type { DiscoveryFilter } from '@dsvhvn/dung-chung/api';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { discoveryApi } from '../lib/api/client';
import { keywordError } from './filters';

// Truy vấn dữ liệu khám phá công khai. Danh mục bộ lọc gần như không đổi nên giữ lâu; trang chủ, tìm kiếm, bản đồ,
// chi tiết dùng thời gian mặc định ngắn để di sản vừa ẩn hoặc xuất bản hiện đúng sau khi tải lại.

const CATALOG_STALE_MS = 60 * 60_000;

export const PICKER_PAGE_SIZE = 100;

export function useHome() {
  return useQuery({ queryKey: ['discovery', 'home'], queryFn: ({ signal }) => discoveryApi.home({ signal }) });
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
  const enabled = keywordError(filter.keyword) === null;
  return useQuery({
    queryKey: ['discovery', 'search', filter, page, pageSize],
    queryFn: ({ signal }) => discoveryApi.search(filter, { page, pageSize }, { signal }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMapPins(filter: DiscoveryFilter) {
  const enabled = keywordError(filter.keyword) === null;
  return useQuery({
    queryKey: ['discovery', 'map', filter],
    queryFn: ({ signal }) => discoveryApi.map(filter, { signal }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useHeritageDetail(slug: string | undefined) {
  return useQuery({
    queryKey: ['discovery', 'detail', slug],
    queryFn: ({ signal }) => discoveryApi.detail(slug!, { signal }),
    enabled: Boolean(slug),
  });
}

export function useHeritageTimeline(slug: string | undefined) {
  return useQuery({
    queryKey: ['discovery', 'timeline', slug],
    queryFn: ({ signal }) => discoveryApi.timeline(slug!, { signal }),
    enabled: Boolean(slug),
  });
}

/** Mọi di sản (tối đa 100 mỗi trang) cho ô chọn di sản của Dòng thời gian; `keyword` tìm nhanh theo tên. */
export function usePickerHeritages(keyword: string) {
  const filter: DiscoveryFilter = keyword ? { keyword } : {};
  const enabled = keywordError(keyword) === null;
  return useQuery({
    queryKey: ['discovery', 'picker', keyword],
    queryFn: ({ signal }) => discoveryApi.search(filter, { page: 1, pageSize: PICKER_PAGE_SIZE }, { signal }),
    enabled,
    placeholderData: keepPreviousData,
  });
}
