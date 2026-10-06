import type { DiscoveryFilter, HeritageCard } from '@dsvhvn/dung-chung/api';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApp } from '../state/AppProvider';

// Truy vấn dữ liệu khám phá công khai của chế độ Khách. Mọi truy vấn nội dung di sản mang theo ngôn ngữ đang chọn (`lang`) và đưa nó vào khóa bộ nhớ đệm:
// đổi ngôn ngữ thì tải lại theo ngôn ngữ mới. Danh mục bộ lọc không phụ thuộc ngôn ngữ (giao diện tự dịch tên). Học sinh đã đăng nhập luôn nhận tiếng Việt.

const CATALOG_STALE_MS = 60 * 60_000;
export const SEARCH_PAGE_SIZE = 20;
export const KEYWORD_MIN = 2;

export function keywordInvalid(keyword: string | undefined): boolean {
  const length = keyword?.trim().length ?? 0;
  return length > 0 && length < KEYWORD_MIN;
}

export function useHome() {
  const { language, services } = useApp();
  return useQuery({ queryKey: ['discovery', 'home', language], queryFn: ({ signal }) => services.discoveryApi.home({ signal, lang: language }) });
}

export function useFilterCatalog() {
  const { services } = useApp();
  return useQuery({ queryKey: ['discovery', 'filters'], queryFn: ({ signal }) => services.discoveryApi.filters({ signal }), staleTime: CATALOG_STALE_MS });
}

/** Tìm và lọc, tải thêm từng trang. Từ khóa quá ngắn thì không gọi máy chủ. */
export function useSearch(filter: DiscoveryFilter) {
  const { language, services } = useApp();
  return useInfiniteQuery({
    queryKey: ['discovery', 'search', language, filter],
    enabled: !keywordInvalid(filter.keyword),
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) => services.discoveryApi.search(filter, { page: pageParam, pageSize: SEARCH_PAGE_SIZE }, { signal, lang: language }),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useMapPins(filter: DiscoveryFilter, enabled = true) {
  const { language, services } = useApp();
  return useQuery({
    queryKey: ['discovery', 'map', language, filter],
    enabled: enabled && !keywordInvalid(filter.keyword),
    queryFn: ({ signal }) => services.discoveryApi.map(filter, { signal, lang: language }),
  });
}

export function useHeritageDetail(slug: string | undefined) {
  const { language, services } = useApp();
  return useQuery({
    queryKey: ['discovery', 'detail', language, slug],
    enabled: Boolean(slug),
    queryFn: ({ signal }) => services.discoveryApi.detail(slug!, { signal, lang: language }),
  });
}

export function useTimeline(slug: string | undefined) {
  const { language, services } = useApp();
  return useQuery({
    queryKey: ['discovery', 'timeline', language, slug],
    enabled: Boolean(slug),
    queryFn: ({ signal }) => services.discoveryApi.timeline(slug!, { signal, lang: language }),
  });
}

export function useSummary(slug: string | undefined, enabled: boolean) {
  const { language, services } = useApp();
  return useQuery({
    queryKey: ['discovery', 'summary', language, slug],
    enabled: enabled && Boolean(slug),
    retry: false,
    queryFn: ({ signal }) => services.discoveryApi.summary(slug!, { signal, lang: language }),
  });
}

export function useModel(slug: string | undefined) {
  const { services } = useApp();
  return useQuery({
    queryKey: ['discovery', 'model', slug],
    enabled: Boolean(slug),
    retry: false,
    queryFn: ({ signal }) => services.discoveryApi.model(slug!, { signal }),
  });
}

/**
 * "Gợi ý cho bạn": máy chủ chọn di sản giống những gì khách đã quan tâm (theo lịch sử của thiết bị); chưa có lịch sử hoặc máy chủ lỗi thì dùng di sản nổi bật của trang chủ.
 * `refreshKey` đổi khi lịch sử đổi để gợi ý được tính lại.
 */
export function useRecommendations(refreshKey: number, featured: readonly HeritageCard[] | undefined) {
  const { language, services } = useApp();
  const query = useQuery({
    queryKey: ['guest', 'recommend', language, refreshKey],
    retry: false,
    queryFn: ({ signal }) => services.guestApi.recommendations(services.deviceId, { signal, lang: language }),
  });
  const items = query.data?.items.map((item) => item.heritage) ?? [];
  const personal = Boolean(query.data?.isPersonalized) && items.length > 0;
  return { cards: personal ? items : (featured ?? []).slice(0, 6), personal, isLoading: query.isLoading };
}
