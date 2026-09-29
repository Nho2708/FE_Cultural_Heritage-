import { MESSAGES } from '@dsvhvn/dung-chung';
import type { DiscoveryFilter, HeritagePeriod, HeritageType, RecognitionLevel } from '@dsvhvn/dung-chung/api';

// Bộ lọc khám phá nằm trên địa chỉ trang (chia sẻ được, nút Back đúng): tìm kiếm và bản đồ dùng chung một bộ tham số
// để "Xem trên bản đồ" giữ nguyên từ khóa và bộ lọc. Giá trị lạ trên địa chỉ bị bỏ qua thay vì gửi lên máy chủ.

export const FILTER_PARAM = {
  keyword: 'tu-khoa',
  province: 'tinh',
  region: 'vung',
  type: 'loai',
  level: 'cap',
  period: 'thoi-ky',
  page: 'trang',
  select: 'chon',
} as const;

const REGIONS = ['Bắc', 'Trung', 'Nam'] as const;
const TYPES: readonly HeritageType[] = ['TANGIBLE', 'INTANGIBLE', 'NATURAL', 'MIXED', 'DOCUMENTARY'];
const LEVELS: readonly RecognitionLevel[] = ['UNESCO', 'NATIONAL_SPECIAL', 'NATIONAL', 'PROVINCIAL', 'NONE'];
const PERIODS: readonly HeritagePeriod[] = ['PREHISTORIC', 'NORTHERN_RULE', 'INDEPENDENT_FEUDAL', 'MODERN', 'CONTEMPORARY'];

export const KEYWORD_MIN = 2;
export const KEYWORD_MAX = 100;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

export function filterFromParams(params: URLSearchParams): DiscoveryFilter {
  const filter: DiscoveryFilter = {};
  const keyword = params.get(FILTER_PARAM.keyword)?.trim();
  if (keyword) filter.keyword = keyword;
  const province = Number(params.get(FILTER_PARAM.province));
  if (Number.isInteger(province) && province > 0) filter.provinceId = province;
  const region = oneOf(params.get(FILTER_PARAM.region), REGIONS);
  if (region) filter.region = region;
  const heritageType = oneOf(params.get(FILTER_PARAM.type), TYPES);
  if (heritageType) filter.heritageType = heritageType;
  const recognitionLevel = oneOf(params.get(FILTER_PARAM.level), LEVELS);
  if (recognitionLevel) filter.recognitionLevel = recognitionLevel;
  const period = oneOf(params.get(FILTER_PARAM.period), PERIODS);
  if (period) filter.period = period;
  return filter;
}

export function pageFromParams(params: URLSearchParams): number {
  const page = Number(params.get(FILTER_PARAM.page));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/** Tham số địa chỉ của một bộ lọc; `page` từ 2 trở lên mới ghi (trang 1 là mặc định). */
export function paramsFromFilter(filter: DiscoveryFilter, extra: { page?: number; select?: string } = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.keyword) params.set(FILTER_PARAM.keyword, filter.keyword);
  if (filter.provinceId) params.set(FILTER_PARAM.province, String(filter.provinceId));
  if (filter.region) params.set(FILTER_PARAM.region, filter.region);
  if (filter.heritageType) params.set(FILTER_PARAM.type, filter.heritageType);
  if (filter.recognitionLevel) params.set(FILTER_PARAM.level, filter.recognitionLevel);
  if (filter.period) params.set(FILTER_PARAM.period, filter.period);
  if (extra.page && extra.page > 1) params.set(FILTER_PARAM.page, String(extra.page));
  if (extra.select) params.set(FILTER_PARAM.select, extra.select);
  return params;
}

export function hasActiveFilter(filter: DiscoveryFilter): boolean {
  return Object.values(filter).some((value) => value !== undefined && value !== '');
}

/** Số ô lọc (không kể từ khóa) đang chọn. */
export function selectFilterCount(filter: DiscoveryFilter): number {
  return [filter.provinceId, filter.region, filter.heritageType, filter.recognitionLevel, filter.period].filter((v) => v !== undefined).length;
}

/** Câu lỗi cho từ khóa ngoài 2-100 ký tự (cùng câu với máy chủ), hoặc null nếu dùng được / để trống. */
export function keywordError(keyword: string | undefined): string | null {
  const text = keyword?.trim() ?? '';
  if (text === '') return null;
  if (text.length < KEYWORD_MIN || text.length > KEYWORD_MAX) {
    return MESSAGES.invalid('Từ khóa', `phải dài ${KEYWORD_MIN}-${KEYWORD_MAX} ký tự`);
  }
  return null;
}

export function toSearch(params: URLSearchParams): string {
  const text = params.toString();
  return text ? `?${text}` : '';
}
