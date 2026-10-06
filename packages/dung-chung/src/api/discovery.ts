import type { ApiClient } from './client';
import type { HeritageType, MediaType, Province, RecognitionLevel } from './heritage';
import type { Paged } from './types';

// Khám phá di sản công khai của web học tập: khách và học sinh xem, không cần đăng nhập (tiền tố /public), chỉ thấy di
// sản đã xuất bản. Giá trị enum viết HOA như CSDL; nhãn tiếng Việt lấy ở heritage.ts hoặc danh mục bộ lọc.

export const DISCOVERY_ENDPOINTS = {
  home: '/public/home',
  filters: '/public/filters',
  heritages: '/public/heritages',
  map: '/public/heritages/map',
  heritage: (slug: string) => `/public/heritages/${encodeURIComponent(slug)}`,
  timeline: (slug: string) => `/public/heritages/${encodeURIComponent(slug)}/timeline`,
} as const;

/** Thời kỳ của bộ lọc: năm âm là trước Công nguyên; các khoảng cố định do máy chủ quyết định. */
export type HeritagePeriod = 'PREHISTORIC' | 'NORTHERN_RULE' | 'INDEPENDENT_FEUDAL' | 'MODERN' | 'CONTEMPORARY';

/** Vùng miền viết đúng như máy chủ nhận (có dấu). */
export type HeritageRegion = 'Bắc' | 'Trung' | 'Nam';

/** Bộ lọc dùng chung cho tìm kiếm và bản đồ; các điều kiện kết hợp theo VÀ, giá trị bỏ trống là không lọc. */
export interface DiscoveryFilter {
  /** 2-100 ký tự, không phân biệt hoa thường và dấu. */
  keyword?: string;
  provinceId?: number;
  region?: string;
  heritageType?: HeritageType;
  recognitionLevel?: RecognitionLevel;
  period?: HeritagePeriod;
}

export interface HeritageCard {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  provinceId: number | null;
  provinceName: string | null;
  region: string | null;
  heritageType: HeritageType | null;
  recognitionLevel: RecognitionLevel | null;
  recognizedYear: number | null;
}

export interface CountItem {
  /** Giá trị dùng làm bộ lọc. */
  value: string;
  label: string;
  count: number;
}

export interface DiscoveryHome {
  featured: HeritageCard[];
  totalHeritages: number;
  byType: CountItem[];
  byRegion: CountItem[];
}

export interface HeritagePin {
  id: number;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  provinceId: number | null;
  provinceName: string | null;
  heritageType: HeritageType | null;
  recognitionLevel: RecognitionLevel | null;
  hasTimeline: boolean;
}

export interface HeritageMapResult {
  /** Tối đa 500 ghim, cấp xếp hạng cao trước. */
  pins: HeritagePin[];
  totalMatched: number;
  /** Số di sản khớp bộ lọc nhưng không có tọa độ (thường là di sản phi vật thể). */
  withoutLocation: number;
  isTruncated: boolean;
}

/** Ảnh, video, âm thanh kèm ghi công tách ba phần (tác giả, giấy phép, nguồn). */
export interface PublicMedia {
  id: number;
  mediaType: MediaType | null;
  url: string | null;
  caption: string | null;
  credit: string | null;
  author: string | null;
  license: string | null;
  source: string | null;
  isThumbnail: boolean;
  /** Ảnh thu nhỏ của ảnh tải lên; null hoặc không có với ảnh thêm bằng đường dẫn. */
  previewUrl?: string | null;
}

export interface PublicReference {
  id: number;
  heritageId: number;
  title: string | null;
  url: string | null;
  sourceType: string | null;
  sourceTypeLabel: string;
}

export interface PublicPhaseSummary {
  id: number;
  name: string | null;
  startYear: number | null;
  endYear: number | null;
  /** Chữ hiển thị sẵn, ví dụ "1010 – 1821", "1962 – nay". */
  rangeLabel: string;
  eventCount: number;
}

export interface PublicHeritageDetail {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  content: string | null;
  heritageType: HeritageType | null;
  recognitionLevel: RecognitionLevel | null;
  recognizedYear: number | null;
  province: Province | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
  hasTimeline: boolean;
  media: PublicMedia[];
  references: PublicReference[];
  timeline: PublicPhaseSummary[];
}

export interface PublicEvent {
  id: number;
  name: string | null;
  description: string | null;
  startYear: number;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  /** Chữ hiển thị sẵn, ví dụ "15/03/1010", "179 TCN", "1945 – 1954". */
  dateLabel: string;
  media: PublicMedia[];
}

export interface PublicPhase {
  id: number;
  name: string | null;
  description: string | null;
  startYear: number | null;
  endYear: number | null;
  rangeLabel: string;
  events: PublicEvent[];
}

export interface PublicTimeline {
  heritageId: number;
  slug: string;
  name: string;
  thumbnailUrl: string | null;
  provinceName: string | null;
  /** Rỗng khi di sản chưa có giai đoạn nào (vẫn là phản hồi thành công). */
  phases: PublicPhase[];
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface PeriodOption extends FilterOption {
  /** null là không giới hạn phía đó. */
  fromYear: number | null;
  toYear: number | null;
}

export interface FilterCatalog {
  provinces: Province[];
  regions: FilterOption[];
  heritageTypes: FilterOption[];
  recognitionLevels: FilterOption[];
  periods: PeriodOption[];
}

function filterQuery(filter: DiscoveryFilter) {
  return {
    keyword: filter.keyword,
    provinceId: filter.provinceId,
    region: filter.region,
    heritageType: filter.heritageType,
    recognitionLevel: filter.recognitionLevel,
    period: filter.period,
  };
}

interface RequestSignal {
  signal?: AbortSignal;
}

export function createDiscoveryApi(client: ApiClient) {
  const get = async <T>(path: string, query?: Record<string, string | number | undefined>, signal?: AbortSignal) =>
    (await client.request<T>(path, { auth: false, query, signal })).data;

  return {
    home: ({ signal }: RequestSignal = {}) => get<DiscoveryHome>(DISCOVERY_ENDPOINTS.home, undefined, signal),

    /** Danh mục cho mọi ô lọc (tỉnh, vùng, loại, cấp xếp hạng, thời kỳ). Máy chủ cho lưu tạm 1 giờ. */
    filters: ({ signal }: RequestSignal = {}) => get<FilterCatalog>(DISCOVERY_ENDPOINTS.filters, undefined, signal),

    /** Tìm và lọc, phân trang (`pageSize` mặc định 20, tối đa 100). */
    search: (filter: DiscoveryFilter, paging: { page?: number; pageSize?: number } = {}, { signal }: RequestSignal = {}) =>
      get<Paged<HeritageCard>>(DISCOVERY_ENDPOINTS.heritages, { ...filterQuery(filter), page: paging.page, pageSize: paging.pageSize }, signal),

    /** Ghim bản đồ theo cùng bộ lọc, không phân trang. */
    map: (filter: DiscoveryFilter, { signal }: RequestSignal = {}) =>
      get<HeritageMapResult>(DISCOVERY_ENDPOINTS.map, filterQuery(filter), signal),

    detail: (slug: string, { signal }: RequestSignal = {}) => get<PublicHeritageDetail>(DISCOVERY_ENDPOINTS.heritage(slug), undefined, signal),

    timeline: (slug: string, { signal }: RequestSignal = {}) => get<PublicTimeline>(DISCOVERY_ENDPOINTS.timeline(slug), undefined, signal),
  };
}

export type DiscoveryApi = ReturnType<typeof createDiscoveryApi>;
