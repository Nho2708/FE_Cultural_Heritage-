import type { ApiClient } from './client';
import type { ClientPlatform } from './guest';
import { GUEST_HEADERS } from './guest';

// Quảng cáo Google có thưởng cho khách tham quan: xem hết một quảng cáo ngắn để mở tóm tắt và nghe thuyết minh của MỘT di sản trong 24 giờ trên đúng thiết bị đó
// (mọi nội dung khác miễn phí; học sinh đã đăng nhập không thấy quảng cáo). Web dùng Google Publisher Tag của Ad Manager: máy chủ cấp mã giao dịch một lần lúc bắt đầu,
// trình duyệt báo "đã cấp thưởng" lúc xong. App dùng AdMob: máy chủ nhận xác minh phía máy chủ của Google rồi app chỉ hỏi lại trạng thái mở khóa.
// Phần quản trị hệ thống: thống kê lượt mở khóa, lượt bị từ chối, khách hoạt động (không có doanh thu, xem ở bảng điều khiển của Google).

export const AD_ENDPOINTS = {
  config: '/public/ads/config',
  unlock: '/public/ads/unlock',
  webStart: '/public/ads/web/start',
  webRewarded: '/public/ads/web/rewarded',
  adminStats: '/admin/ads/stats',
} as const;

/** Tiêu đề app gửi khi thiết bị không có mô-đun quảng cáo (Expo Go ở bản demo iOS); máy chủ chỉ nghe khi `allowNoAdsDeclaration` bật ở môi trường phát triển. Web không gửi. */
export const ADS_UNAVAILABLE_HEADER = 'X-Ads-Unavailable';

/** Cấu hình công khai của cổng. Mã đơn vị quảng cáo đến từ cấu hình môi trường của máy chủ (đơn vị thử của Google khi phát triển). */
export interface AdConfig {
  /** Cổng đang hoạt động: đã bật và có ít nhất một đơn vị quảng cáo. Tắt thì tóm tắt và nghe mở thẳng. */
  gateActive: boolean;
  /** Số giờ mỗi lần mở khóa (24). */
  unlockHours: number;
  /** Mức xếp hạng nội dung tối đa của yêu cầu quảng cáo (`G`: phù hợp mọi lứa tuổi). */
  maxContentRating: string;
  androidAdUnitId: string | null;
  iosAdUnitId: string | null;
  /** Đường dẫn đơn vị Ad Manager có thưởng của web, ví dụ `/22639388115/rewarded_web_example` (đơn vị thử của Google). */
  webAdUnitPath: string | null;
  allowNoAdsDeclaration: boolean;
}

/** Vì sao cổng không áp dụng: học sinh đã đăng nhập, cổng tắt hoặc thiết bị khai không có quảng cáo. */
export type AdOpenReason = 'STUDENT' | 'GATE_DISABLED' | 'NO_ADS_DEVICE';

/** Trạng thái mở khóa của một di sản trên thiết bị của yêu cầu. `expiresAt` là hạn (UTC, giờ máy chủ) khi còn mở khóa. */
export interface AdUnlockStatus {
  heritageId: number;
  slug: string;
  gateRequired: boolean;
  unlocked: boolean;
  expiresAt: string | null;
  openReason: AdOpenReason | null;
}

/** Bắt đầu xem quảng cáo ở web. `alreadyUnlocked` true thì không cấp mã (di sản đang còn mở khóa hoặc cổng không áp dụng). */
export interface WebRewardStart {
  alreadyUnlocked: boolean;
  transactionId: string | null;
  transactionExpiresAt: string | null;
  adUnitPath: string | null;
  status: AdUnlockStatus;
}

/** `recorded` false khi gửi lại cùng mã giao dịch (`DUPLICATE`) hoặc di sản đang còn mở khóa (`ALREADY_UNLOCKED`): cả hai đều thành công. */
export interface AdRewardResult {
  recorded: boolean;
  reason: 'DUPLICATE' | 'ALREADY_UNLOCKED' | null;
  expiresAt: string | null;
}

// ---- Thống kê cho quản trị hệ thống ----

export type AdNetwork = 'ADMOB' | 'AD_MANAGER';

export interface AdDayCount {
  date: string;
  count: number;
}

export interface AdPlatformCount {
  platform: ClientPlatform;
  count: number;
}

export interface AdNetworkCount {
  network: AdNetwork;
  /** Nguồn báo: máy chủ Google xác minh hay trình duyệt báo. */
  source: string;
  sourceLabel: string;
  count: number;
}

/** Di sản kèm số lượt; `slug` và `name` null khi di sản đã bị xóa. */
export interface AdHeritageCount {
  heritageId: number;
  slug: string | null;
  name: string | null;
  count: number;
}

export interface AdRejectionCount {
  reason: string;
  label: string;
  count: number;
}

export interface AdLanguageCount {
  language: string;
  devices: number;
}

export interface AdStats {
  from: string;
  to: string;
  unlocks: {
    total: number;
    byDay: AdDayCount[];
    byPlatform: AdPlatformCount[];
    byNetwork: AdNetworkCount[];
    topHeritages: AdHeritageCount[];
  };
  rejections: { total: number; byReason: AdRejectionCount[] };
  guests: {
    activeDevices: number;
    byLanguage: AdLanguageCount[];
    mostViewed: AdHeritageCount[];
    mostListened: AdHeritageCount[];
    mostViewed3D: AdHeritageCount[];
  };
  note: string;
  adMobConsoleUrl: string;
  adManagerConsoleUrl: string;
}

export interface AdStatsQuery {
  /** Ngày Việt Nam `yyyy-MM-dd`; mặc định 30 ngày gần nhất, tối đa 366 ngày. */
  from?: string;
  to?: string;
}

interface Options {
  signal?: AbortSignal;
  /** Nền tảng gửi ở `X-Client-Platform` (mặc định máy chủ coi là WEB). */
  platform?: ClientPlatform;
  /** Tiêu đề thêm cho riêng yêu cầu này (app gửi `X-Ads-Unavailable`). */
  headers?: Record<string, string>;
}

function headersOf(deviceKey: string | null | undefined, platform?: ClientPlatform): Record<string, string> {
  const headers: Record<string, string> = {};
  if (deviceKey) headers[GUEST_HEADERS.deviceKey] = deviceKey;
  if (platform) headers[GUEST_HEADERS.platform] = platform;
  return headers;
}

/**
 * Các endpoint công khai của cổng quảng cáo. Mã thiết bị truyền tường minh ở từng hàm (web và app dùng chung). Không endpoint nào gắn token đăng nhập:
 * máy chủ nhận ra học sinh từ phiên đăng nhập (ở endpoint cần), còn khách chỉ có mã thiết bị.
 */
export function createAdsApi(client: ApiClient) {
  return {
    config: async ({ signal }: Options = {}) => (await client.request<AdConfig>(AD_ENDPOINTS.config, { auth: false, signal })).data,

    /** Trạng thái mở khóa; app hỏi lại mỗi 2 giây (tối đa 20 giây) sau khi xem xong, chờ máy chủ nhận xác minh của Google. */
    unlock: async (deviceKey: string | null, slug: string, { signal, platform, headers }: Options = {}) =>
      (await client.request<AdUnlockStatus>(AD_ENDPOINTS.unlock, { auth: false, query: { slug }, headers: { ...headersOf(deviceKey, platform), ...headers }, signal })).data,

    /** Web: bắt đầu xem quảng cáo. Cần mã thiết bị. 422 `AD_UNAVAILABLE` khi môi trường chưa có đơn vị quảng cáo cho web. */
    startWeb: async (deviceKey: string, slug: string, { signal }: Options = {}) =>
      (await client.request<WebRewardStart>(AD_ENDPOINTS.webStart, { method: 'POST', auth: false, body: { slug }, headers: headersOf(deviceKey, 'WEB'), signal })).data,

    /** Web: báo trình duyệt đã nhận sự kiện "đã cấp thưởng". 400 `AD_REWARD_REJECTED`, 429 `AD_REWARD_RATE_LIMITED`. */
    reportWebReward: async (deviceKey: string, input: { slug: string; transactionId: string; adUnit: string }, { signal }: Options = {}) =>
      (await client.request<AdRewardResult>(AD_ENDPOINTS.webRewarded, { method: 'POST', auth: false, body: input, headers: headersOf(deviceKey, 'WEB'), signal })).data,
  };
}

export type AdsApi = ReturnType<typeof createAdsApi>;

/** Quản trị hệ thống: thống kê lượt mở khóa bằng quảng cáo. Vai trò khác nhận 403. */
export function createAdminAdsApi(client: ApiClient) {
  return {
    stats: (query: AdStatsQuery = {}) => client.request<AdStats>(AD_ENDPOINTS.adminStats, { query: { from: query.from, to: query.to } }),
  };
}

export type AdminAdsApi = ReturnType<typeof createAdminAdsApi>;
