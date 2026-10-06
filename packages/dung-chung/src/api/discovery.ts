import type { ApiClient } from './client';
import type { ContentStatus, HeritageType, MediaType, Province, RecognitionLevel } from './heritage';
import type { PublicModel } from './models';
import type { Paged } from './types';

// Khám phá di sản công khai của web học tập: khách và học sinh xem, không cần đăng nhập (tiền tố /public), chỉ thấy di
// sản đã xuất bản. Giá trị enum viết HOA như CSDL; nhãn tiếng Việt lấy ở heritage.ts hoặc danh mục bộ lọc.

export const DISCOVERY_ENDPOINTS = {
  languages: '/public/languages',
  home: '/public/home',
  filters: '/public/filters',
  heritages: '/public/heritages',
  map: '/public/heritages/map',
  heritage: (slug: string) => `/public/heritages/${encodeURIComponent(slug)}`,
  timeline: (slug: string) => `/public/heritages/${encodeURIComponent(slug)}/timeline`,
  summary: (slug: string) => `/public/heritages/${encodeURIComponent(slug)}/summary`,
  model: (slug: string) => `/public/heritages/${encodeURIComponent(slug)}/model`,
} as const;

/**
 * Năm ngôn ngữ của phần công khai: mã của giao diện và của API (`lang`). Tiếng Việt là bản gốc; tiếng Anh cần được quản trị duyệt;
 * tiếng Hàn, Trung giản thể, Nhật là bản dịch máy hiện ngay kèm nhãn. Học sinh đã đăng nhập luôn nhận tiếng Việt.
 */
export type LanguageCode = 'vi' | 'en' | 'ko' | 'zh-Hans' | 'ja';

/** Một ngôn ngữ của bộ chọn: tên viết bằng chính ngôn ngữ đó, mã giọng đọc của thiết bị và cờ cho biết bản gốc hay chỉ có bản dịch máy. */
export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  /** Mã giọng đọc của trình duyệt hoặc thiết bị (`vi-VN`, `en-US`, `ko-KR`, `zh-CN`, `ja-JP`). */
  speechTag: string;
  isSource: boolean;
  isMachineOnly: boolean;
}

/**
 * Cờ ngôn ngữ của một phản hồi: `language` là ngôn ngữ nội dung đang hiện; khác `requestedLanguage` khi `isFallback` (chưa có bản hiện hành
 * nên đang hiện tiếng Việt: giao diện báo một lần cho cả trang). `isMachineTranslated` bật với tiếng Hàn, Trung, Nhật: luôn gắn nhãn "bản dịch máy".
 */
export interface Localization {
  requestedLanguage: LanguageCode;
  language: LanguageCode;
  isFallback: boolean;
  isMachineTranslated: boolean;
}

/** Tóm tắt của một di sản: `shortText` để nghe thuyết minh, `detailedText` để đọc. Lấy từ bản đã lưu, không gọi AI khi xem. */
export interface PublicSummary {
  heritageId: number;
  slug: string;
  name: string;
  localization: Localization;
  shortText: string;
  detailedText: string;
}

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
  /** Chưa có bản hiện hành ở ngôn ngữ yêu cầu nên tên và mô tả ngắn đang là tiếng Việt. */
  isFallback?: boolean;
  /** Tên và mô tả ngắn là bản dịch máy. */
  isMachineTranslated?: boolean;
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
  isFallback?: boolean;
  isMachineTranslated?: boolean;
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
  /** Ngôn ngữ đang hiện và nhãn bản dịch máy; bản cũ của máy chủ không có thì xem như tiếng Việt. */
  localization?: Localization | null;
  /** Di sản có tóm tắt tiếng Việt đã duyệt (bật nút "Tóm tắt" và "Nghe"). */
  hasSummary?: boolean;
  /** Di sản có mô hình 3D đang hiển thị: bật nút "Xem 3D" (miễn phí, không cần đăng nhập). Dữ liệu trình xem lấy ở `model`. */
  hasModel?: boolean;
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
  localization?: Localization | null;
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

/** Ngôn ngữ nội dung: bỏ trống thì máy chủ trả tiếng Việt (hoặc theo tiêu đề Accept-Language). Học sinh đã đăng nhập luôn nhận tiếng Việt. */
interface LanguageOptions extends RequestSignal {
  lang?: LanguageCode;
}

export function createDiscoveryApi(client: ApiClient) {
  const get = async <T>(path: string, query?: Record<string, string | number | undefined>, signal?: AbortSignal, auth: false | 'optional' = false) =>
    (await client.request<T>(path, { auth, query, signal })).data;

  return {
    /** Năm ngôn ngữ của bộ chọn. Danh mục cố định, máy chủ cho lưu tạm 1 giờ. */
    languages: ({ signal }: RequestSignal = {}) => get<LanguageOption[]>(DISCOVERY_ENDPOINTS.languages, undefined, signal),

    home: ({ signal, lang }: LanguageOptions = {}) => get<DiscoveryHome>(DISCOVERY_ENDPOINTS.home, { lang }, signal),

    /** Danh mục cho mọi ô lọc (tỉnh, vùng, loại, cấp xếp hạng, thời kỳ). Máy chủ cho lưu tạm 1 giờ. */
    filters: ({ signal }: RequestSignal = {}) => get<FilterCatalog>(DISCOVERY_ENDPOINTS.filters, undefined, signal),

    /** Tìm và lọc, phân trang (`pageSize` mặc định 20, tối đa 100). */
    search: (filter: DiscoveryFilter, paging: { page?: number; pageSize?: number } = {}, { signal, lang }: LanguageOptions = {}) =>
      get<Paged<HeritageCard>>(DISCOVERY_ENDPOINTS.heritages, { ...filterQuery(filter), page: paging.page, pageSize: paging.pageSize, lang }, signal),

    /** Ghim bản đồ theo cùng bộ lọc, không phân trang. */
    map: (filter: DiscoveryFilter, { signal, lang }: LanguageOptions = {}) =>
      get<HeritageMapResult>(DISCOVERY_ENDPOINTS.map, { ...filterQuery(filter), lang }, signal),

    detail: (slug: string, { signal, lang }: LanguageOptions = {}) => get<PublicHeritageDetail>(DISCOVERY_ENDPOINTS.heritage(slug), { lang }, signal),

    timeline: (slug: string, { signal, lang }: LanguageOptions = {}) => get<PublicTimeline>(DISCOVERY_ENDPOINTS.timeline(slug), { lang }, signal),

    /**
     * Tóm tắt theo ngôn ngữ. 404 `SUMMARY_UNAVAILABLE` khi chưa có tóm tắt tiếng Việt đã duyệt; ngôn ngữ chưa có bản hiện hành thì trả bản tiếng Việt kèm `isFallback`.
     * Khách chưa mở khóa bằng quảng cáo nhận 403 `AD_UNLOCK_REQUIRED`. **Gắn token của học sinh nếu đang có phiên**: máy chủ nhận ra học sinh theo phiên đăng nhập
     * (không theo khai báo của máy khách) để mở thẳng, không qua cổng quảng cáo.
     */
    summary: (slug: string, { signal, lang }: LanguageOptions = {}) => get<PublicSummary>(DISCOVERY_ENDPOINTS.summary(slug), { lang }, signal, 'optional'),

    /** Mô hình 3D đang hiển thị của di sản (miễn phí). 404 `MODEL_UNAVAILABLE` khi không có mô hình hiển thị: trình xem quay về bộ ảnh. */
    model: (slug: string, { signal }: RequestSignal = {}) => get<PublicModel>(DISCOVERY_ENDPOINTS.model(slug), undefined, signal),
  };
}

export type DiscoveryApi = ReturnType<typeof createDiscoveryApi>;

// Xem trước bản nháp di sản (quản trị hệ thống): cùng cấu trúc trang chi tiết công khai nhưng đọc bản nháp đang lưu. Cần cả mã
// xem trước còn hạn lẫn token quản trị hệ thống; thiếu một trong hai, mã sai, hết hạn hay di sản đã xóa đều trả cùng một 404.

export const PREVIEW_ENDPOINTS = {
  heritage: (code: string) => `/preview/heritages/${encodeURIComponent(code)}`,
  timeline: (code: string) => `/preview/heritages/${encodeURIComponent(code)}/timeline`,
  model: (code: string) => `/preview/heritages/${encodeURIComponent(code)}/model`,
} as const;

/** Bản nháp di sản như trang công khai sẽ hiện, kèm hạn của mã xem trước. */
export interface HeritagePreview {
  /** Thời điểm mã hết hạn (ISO). */
  expiresAt: string;
  /** Nháp hoặc Đã ẩn (di sản đã xuất bản không cấp mã xem trước). */
  status: ContentStatus;
  heritage: PublicHeritageDetail;
}

export function createPreviewApi(client: ApiClient) {
  return {
    /** Bản nháp đang lưu. 404 `PREVIEW_INVALID` cho mọi lý do không đọc được. */
    heritage: async (code: string, { signal, lang }: LanguageOptions = {}) =>
      (await client.request<HeritagePreview>(PREVIEW_ENDPOINTS.heritage(code), { signal, query: { lang } })).data,

    timeline: async (code: string, { signal, lang }: LanguageOptions = {}) =>
      (await client.request<PublicTimeline>(PREVIEW_ENDPOINTS.timeline(code), { signal, query: { lang } })).data,

    /** Mô hình 3D của bản nháp (cùng điều kiện mở như bản nháp). 404 `MODEL_UNAVAILABLE` khi di sản chưa có mô hình hiển thị. */
    model: async (code: string, { signal }: RequestSignal = {}) =>
      (await client.request<PublicModel>(PREVIEW_ENDPOINTS.model(code), { signal })).data,
  };
}

export type PreviewApi = ReturnType<typeof createPreviewApi>;
