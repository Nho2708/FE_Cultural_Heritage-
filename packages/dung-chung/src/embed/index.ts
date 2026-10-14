import type { DiscoveryFilter, HeritagePeriod, LanguageCode } from '../api/discovery';
import type { HeritageType, RecognitionLevel } from '../api/heritage';
import { parseLanguage } from '../i18n/languages';

// Hợp đồng giữa app mobile và hai trang nhúng của web học tập (bản đồ, trình xem 3D). App mở trang nhúng trong WebView và hai bên nói chuyện
// bằng `postMessage` với thông điệp JSON có `type` và `version`. Trang nhúng không nhận token nào; app chỉ cho WebView mở đúng origin của web học tập
// và bỏ qua mọi thông điệp lạ hoặc sai phiên bản.

export const EMBED_PROTOCOL_VERSION = 1;

/** Đường dẫn trang nhúng trên web học tập. */
export const EMBED_PATHS = {
  map: '/nhung/ban-do',
  introVideo: '/nhung/video-gioi-thieu',
  model: (slug: string) => `/nhung/3d/${encodeURIComponent(slug)}`,
} as const;

/** Tên tham số trên địa chỉ trang nhúng. */
export const EMBED_PARAM = {
  language: 'lang',
  keyword: 'tu-khoa',
  region: 'vung',
  type: 'loai',
  province: 'tinh',
  level: 'cap',
  period: 'thoi-ky',
  select: 'chon',
} as const;

const REGIONS = ['Bắc', 'Trung', 'Nam'] as const;
const TYPES: readonly HeritageType[] = ['TANGIBLE', 'INTANGIBLE', 'NATURAL', 'MIXED', 'DOCUMENTARY'];
const LEVELS: readonly RecognitionLevel[] = ['UNESCO', 'NATIONAL_SPECIAL', 'NATIONAL', 'PROVINCIAL', 'NONE'];
const PERIODS: readonly HeritagePeriod[] = ['PREHISTORIC', 'NORTHERN_RULE', 'INDEPENDENT_FEUDAL', 'MODERN', 'CONTEMPORARY'];

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

function positiveInt(value: unknown): number | undefined {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number) && number > 0 ? number : undefined;
}

/** Các trường bộ lọc mà trang bản đồ nhúng hiểu (cùng bộ với trang Bản đồ của web). */
export type EmbedMapFilter = Pick<DiscoveryFilter, 'keyword' | 'region' | 'heritageType' | 'provinceId' | 'recognitionLevel' | 'period'>;

/** Vị trí của khách để vẽ chấm "Gần bạn" trên bản đồ. Chỉ nằm trong bộ nhớ của trang nhúng, không lưu và không đi vào địa chỉ. */
export interface EmbedPosition {
  latitude: number;
  longitude: number;
}

export type ModelErrorReason = 'webgl' | 'load';

/** Trang nhúng → app. */
export type EmbedMessage =
  | { type: 'ready'; version: 1 }
  /** Khách chạm một ghim rồi bấm mở chi tiết: app đi tới trang chi tiết di sản. */
  | { type: 'pin-selected'; version: 1; slug: string }
  /** Khách chạm một ghim rồi bấm mở dòng thời gian: app đi tới dòng thời gian của di sản. */
  | { type: 'timeline-selected'; version: 1; slug: string }
  /** Tiến trình tải mô hình, 0 đến 1. */
  | { type: 'model-progress'; version: 1; fraction: number }
  | { type: 'model-loaded'; version: 1 }
  /** Trình xem không dựng được: app quay về bộ ảnh của di sản. */
  | { type: 'model-error'; version: 1; reason: ModelErrorReason };

/** App → trang nhúng. */
export type EmbedCommand =
  | { type: 'set-filter'; version: 1; filter: EmbedMapFilter }
  | { type: 'focus'; version: 1; slug: string }
  /** Vị trí của khách ("Gần bạn"): bản đồ vẽ một chấm tại đó và đưa khung nhìn tới. `null` thì bỏ chấm. */
  | { type: 'set-position'; version: 1; position: EmbedPosition | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Đọc thông điệp từ trang nhúng (chuỗi JSON hoặc đối tượng đã giải mã). Sai khuôn, sai phiên bản hoặc loại lạ thì trả null. */
export function parseEmbedMessage(raw: unknown): EmbedMessage | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(value) || value.version !== EMBED_PROTOCOL_VERSION) return null;
  switch (value.type) {
    case 'ready':
      return { type: 'ready', version: 1 };
    case 'pin-selected':
      return typeof value.slug === 'string' && value.slug !== '' && value.slug.length <= 200 ? { type: 'pin-selected', version: 1, slug: value.slug } : null;
    case 'timeline-selected':
      return typeof value.slug === 'string' && value.slug !== '' && value.slug.length <= 200 ? { type: 'timeline-selected', version: 1, slug: value.slug } : null;
    case 'model-progress':
      return typeof value.fraction === 'number' && Number.isFinite(value.fraction)
        ? { type: 'model-progress', version: 1, fraction: Math.min(1, Math.max(0, value.fraction)) }
        : null;
    case 'model-loaded':
      return { type: 'model-loaded', version: 1 };
    case 'model-error':
      return value.reason === 'webgl' || value.reason === 'load' ? { type: 'model-error', version: 1, reason: value.reason } : null;
    default:
      return null;
  }
}

export function serializeEmbedMessage(message: EmbedMessage | EmbedCommand): string {
  return JSON.stringify(message);
}

/** Đọc lệnh từ app (phía trang nhúng). Sai khuôn thì trả null. */
export function parseEmbedCommand(raw: unknown): EmbedCommand | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(value) || value.version !== EMBED_PROTOCOL_VERSION) return null;
  if (value.type === 'focus' && typeof value.slug === 'string' && value.slug !== '') return { type: 'focus', version: 1, slug: value.slug };
  if (value.type === 'set-filter' && isRecord(value.filter)) {
    const { keyword, region, heritageType, provinceId, recognitionLevel, period } = value.filter;
    return {
      type: 'set-filter',
      version: 1,
      filter: {
        keyword: typeof keyword === 'string' ? keyword : undefined,
        region: typeof region === 'string' ? region : undefined,
        heritageType: typeof heritageType === 'string' ? (heritageType as HeritageType) : undefined,
        provinceId: positiveInt(provinceId),
        recognitionLevel: oneOf(recognitionLevel, LEVELS),
        period: oneOf(period, PERIODS),
      },
    };
  }
  if (value.type === 'set-position') {
    if (value.position === null) return { type: 'set-position', version: 1, position: null };
    if (isRecord(value.position)) {
      const { latitude, longitude } = value.position;
      if (typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        return { type: 'set-position', version: 1, position: { latitude, longitude } };
      }
    }
  }
  return null;
}

/** Địa chỉ trang bản đồ nhúng: bộ lọc, ngôn ngữ và ghim cần làm nổi (tùy chọn). */
export function embedMapUrl(baseUrl: string, filter: DiscoveryFilter, language: LanguageCode, select?: string): string {
  const params = new URLSearchParams();
  params.set(EMBED_PARAM.language, language);
  if (filter.keyword) params.set(EMBED_PARAM.keyword, filter.keyword);
  if (filter.region) params.set(EMBED_PARAM.region, filter.region);
  if (filter.heritageType) params.set(EMBED_PARAM.type, filter.heritageType);
  if (filter.provinceId) params.set(EMBED_PARAM.province, String(filter.provinceId));
  if (filter.recognitionLevel) params.set(EMBED_PARAM.level, filter.recognitionLevel);
  if (filter.period) params.set(EMBED_PARAM.period, filter.period);
  if (select) params.set(EMBED_PARAM.select, select);
  return `${baseUrl.replace(/\/+$/, '')}${EMBED_PATHS.map}?${params.toString()}`;
}

/** Địa chỉ trang xem 3D nhúng; `language` để chữ hướng dẫn trong trình xem theo ngôn ngữ khách đã chọn. */
export function embedModelUrl(baseUrl: string, slug: string, language?: LanguageCode): string {
  const query = language ? `?${EMBED_PARAM.language}=${encodeURIComponent(language)}` : '';
  return `${baseUrl.replace(/\/+$/, '')}${EMBED_PATHS.model(slug)}${query}`;
}

/** Địa chỉ trang video giới thiệu nhúng: chỉ có trình phát video khách theo ngôn ngữ của app. */
export function embedIntroVideoUrl(baseUrl: string, language: LanguageCode): string {
  return `${baseUrl.replace(/\/+$/, '')}${EMBED_PATHS.introVideo}?${EMBED_PARAM.language}=${encodeURIComponent(language)}`;
}

/** Bộ lọc và ngôn ngữ đọc lại từ tham số của địa chỉ trang nhúng (phía trang web). */
export function readEmbedMapParams(params: URLSearchParams): { filter: DiscoveryFilter; language: LanguageCode; select: string | null } {
  const filter: DiscoveryFilter = {};
  const keyword = params.get(EMBED_PARAM.keyword)?.trim();
  if (keyword) filter.keyword = keyword;
  const region = oneOf(params.get(EMBED_PARAM.region), REGIONS);
  if (region) filter.region = region;
  const type = oneOf(params.get(EMBED_PARAM.type), TYPES);
  if (type) filter.heritageType = type;
  const province = positiveInt(params.get(EMBED_PARAM.province));
  if (province) filter.provinceId = province;
  const level = oneOf(params.get(EMBED_PARAM.level), LEVELS);
  if (level) filter.recognitionLevel = level;
  const period = oneOf(params.get(EMBED_PARAM.period), PERIODS);
  if (period) filter.period = period;
  return { filter, language: parseLanguage(params.get(EMBED_PARAM.language)) ?? 'vi', select: params.get(EMBED_PARAM.select) };
}

/** Origin của một địa chỉ (để so với origin được phép của WebView), null nếu địa chỉ không hợp lệ. */
export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
