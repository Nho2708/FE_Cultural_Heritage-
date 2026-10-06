import type { ApiClient } from './client';
import type { HeritageCard, LanguageCode } from './discovery';
import type { Paged } from './types';

// Khách tham quan (không đăng nhập) trên web học tập và app: nhận diện bằng mã thiết bị ẩn danh (UUID phiên bản 4) ở tiêu đề `X-Device-Key`.
// Máy chủ chỉ giữ mã, nền tảng, ngôn ngữ, cờ "Gần bạn" và lịch sử; không ghi địa chỉ IP, không ghi vị trí. Học sinh đã đăng nhập không dùng các
// chức năng này (máy chủ trả 403 GUEST_ONLY), nên ứng dụng chỉ gọi khi chưa có phiên đăng nhập và không gửi mã thiết bị cùng yêu cầu của học sinh.

export const GUEST_ENDPOINTS = {
  devices: '/public/guest/devices',
  device: '/public/guest/device',
  activities: '/public/guest/activities',
  history: '/public/guest/history',
  historyItem: (id: number) => `/public/guest/history/${id}`,
  recommendations: '/public/guest/recommendations',
  nearby: '/public/guest/nearby',
} as const;

/** Tiêu đề của khách: mã thiết bị và nền tảng. Các API công khai gửi kèm mã thì máy chủ tự ghi lịch sử (tìm có từ khóa, xem chi tiết, đọc tóm tắt, xem 3D). */
export const GUEST_HEADERS = {
  deviceKey: 'X-Device-Key',
  platform: 'X-Client-Platform',
} as const;

export type ClientPlatform = 'ANDROID' | 'IOS' | 'WEB';

/** Loại lượt trong lịch sử. "Nghe" chạy trên thiết bị nên client tự ghi bằng `recordActivity`; các loại còn lại máy chủ tự ghi. */
export type GuestActivityType = 'SEARCH' | 'VIEW' | 'READ_SUMMARY' | 'LISTEN' | 'VIEW_3D';

/** Điểm chung giữa một di sản được gợi ý và di sản khách đã quan tâm; giao diện tự ghép câu theo ngôn ngữ. */
export type SimilarityFactor = 'SAME_TYPE' | 'SAME_PROVINCE' | 'SAME_REGION' | 'SAME_LEVEL' | 'OVERLAPPING_ERA' | 'SIMILAR_TEXT';

/** Thiết bị của khách. `isRegistered` false khi máy chủ chưa từng thấy mã (các giá trị là mặc định). `locationAllowed` chỉ là cờ nhớ lựa chọn, không chứa tọa độ. */
export interface GuestDevice {
  deviceKey: string;
  isRegistered: boolean;
  platform: ClientPlatform | null;
  language: LanguageCode;
  locationAllowed: boolean;
  createdAt: string | null;
  lastSeenAt: string | null;
}

/** Trường nào không gửi thì máy chủ giữ nguyên giá trị đang lưu. */
export interface GuestDeviceSettings {
  platform?: ClientPlatform;
  language?: LanguageCode;
  locationAllowed?: boolean;
}

export interface GuestActivityInput {
  type: GuestActivityType;
  /** Di sản đã xuất bản (mọi loại trừ tìm kiếm). */
  slug?: string;
  /** Từ khóa 2-100 ký tự (chỉ loại tìm kiếm). */
  query?: string;
}

/** `recorded` false khi lượt lặp trong 10 phút (`DUPLICATE`) hoặc yêu cầu của học sinh đã đăng nhập (`STUDENT_SESSION`). */
export interface GuestActivityResult {
  recorded: boolean;
  reason: string | null;
}

/** Một mục lịch sử (mới nhất trước). Mục tìm kiếm có `query`; mục khác có `heritage` theo ngôn ngữ yêu cầu. */
export interface GuestHistoryItem {
  id: number;
  type: GuestActivityType;
  typeLabel: string;
  query: string | null;
  heritage: HeritageCard | null;
  language: LanguageCode;
  createdAt: string;
}

export interface GuestRecommendation {
  heritage: HeritageCard;
  reasons: SimilarityFactor[];
  becauseOfHeritageId: number | null;
  /** Di sản giống nhất mà khách đã quan tâm (tên theo ngôn ngữ yêu cầu). */
  becauseOfName: string | null;
}

/**
 * "Gợi ý cho bạn": tối đa 6 di sản. `isPersonalized` false khi khách chưa có lịch sử (hoặc vừa xóa hết): hiện di sản nổi bật.
 * `usedFallback` true khi Dịch vụ AI lỗi và máy chủ tự chọn cùng loại hoặc cùng vùng. `message` là lời mời xem thử bằng tiếng Việt khi chưa có lịch sử.
 */
export interface GuestRecommendations {
  items: GuestRecommendation[];
  isPersonalized: boolean;
  usedFallback: boolean;
  message: string | null;
}

export interface NearbyHeritage {
  heritage: HeritageCard;
  distanceMeters: number;
  /** Chữ khoảng cách tiếng Việt ("350 m", "1,2 km"); giao diện nhiều ngôn ngữ tự định dạng từ `distanceMeters`. */
  distanceText: string;
}

/** "Gần bạn": tối đa 6 di sản có tọa độ, gần nhất trước. `unavailableReason` là `OUTSIDE_VIETNAM` khi vị trí ngoài khung tọa độ Việt Nam (danh sách rỗng). */
export interface NearbyResult {
  items: NearbyHeritage[];
  unavailableReason: string | null;
  message: string | null;
}

export const NEARBY_OUTSIDE_VIETNAM = 'OUTSIDE_VIETNAM';

interface Options {
  signal?: AbortSignal;
  lang?: LanguageCode;
  /** Nền tảng gửi ở `X-Client-Platform` (mặc định máy chủ coi là WEB). */
  platform?: ClientPlatform;
}

function headersOf(deviceKey: string | null | undefined, platform?: ClientPlatform): Record<string, string> {
  const headers: Record<string, string> = {};
  if (deviceKey) headers[GUEST_HEADERS.deviceKey] = deviceKey;
  if (platform) headers[GUEST_HEADERS.platform] = platform;
  return headers;
}

/**
 * Các endpoint của khách. Mã thiết bị truyền tường minh ở mỗi hàm và đi vào tiêu đề của riêng yêu cầu đó (web và app dùng chung, mỗi nơi tự giữ mã).
 * Không endpoint nào gắn token đăng nhập.
 */
export function createGuestApi(client: ApiClient) {
  return {
    /** Đăng ký thiết bị: tạo bản ghi nếu chưa có, đã có thì cập nhật cài đặt. Không truyền mã thì máy chủ cấp mã mới (trả ở `deviceKey`). */
    register: async (deviceKey: string | null, settings: GuestDeviceSettings = {}, { signal, platform }: Options = {}) =>
      (await client.request<GuestDevice>(GUEST_ENDPOINTS.devices, { method: 'POST', auth: false, body: settings, headers: headersOf(deviceKey, platform), signal })).data,

    /** Cài đặt của thiết bị; mã chưa từng thấy thì trả mặc định và không tạo bản ghi. */
    device: async (deviceKey: string, { signal, lang }: Options = {}) =>
      (await client.request<GuestDevice>(GUEST_ENDPOINTS.device, { auth: false, query: { lang }, headers: headersOf(deviceKey), signal })).data,

    /** Đổi ngôn ngữ hoặc bật, tắt "Gần bạn" (chỉ nhớ lựa chọn; vị trí không lưu). */
    updateDevice: async (deviceKey: string, settings: GuestDeviceSettings, { signal, platform }: Options = {}) =>
      (await client.request<GuestDevice>(GUEST_ENDPOINTS.device, { method: 'PUT', auth: false, body: settings, headers: headersOf(deviceKey, platform), signal })).data,

    /** Ghi một lượt (dùng cho "nghe thuyết minh"). */
    recordActivity: async (deviceKey: string, input: GuestActivityInput, { signal, lang, platform }: Options = {}) =>
      (await client.request<GuestActivityResult>(GUEST_ENDPOINTS.activities, { method: 'POST', auth: false, body: input, query: { lang }, headers: headersOf(deviceKey, platform), signal })).data,

    /** Lịch sử của thiết bị, mới nhất trước, trong 90 ngày. */
    history: async (deviceKey: string, paging: { page?: number; pageSize?: number } = {}, { signal, lang }: Options = {}) =>
      (await client.request<Paged<GuestHistoryItem>>(GUEST_ENDPOINTS.history, { auth: false, query: { ...paging, lang }, headers: headersOf(deviceKey), signal })).data,

    /** Xóa thật một mục của lịch sử. */
    deleteHistoryItem: async (deviceKey: string, id: number, { signal }: Options = {}) => {
      await client.request<null>(GUEST_ENDPOINTS.historyItem(id), { method: 'DELETE', auth: false, headers: headersOf(deviceKey), signal });
    },

    /** Xóa thật toàn bộ lịch sử; trả số mục đã xóa. */
    deleteHistory: async (deviceKey: string, { signal }: Options = {}) =>
      (await client.request<{ deleted: number }>(GUEST_ENDPOINTS.history, { method: 'DELETE', auth: false, headers: headersOf(deviceKey), signal })).data.deleted,

    /** "Gợi ý cho bạn". Không có mã hoặc chưa có lịch sử thì trả di sản nổi bật. */
    recommendations: async (deviceKey: string | null, { signal, lang }: Options = {}) =>
      (await client.request<GuestRecommendations>(GUEST_ENDPOINTS.recommendations, { auth: false, query: { lang }, headers: headersOf(deviceKey), signal })).data,

    /** "Gần bạn": tọa độ đi trong thân yêu cầu (không lên đường dẫn), máy chủ chỉ tính khoảng cách, không lưu. */
    nearby: async (position: { latitude: number; longitude: number }, { signal, lang }: Options = {}) =>
      (await client.request<NearbyResult>(GUEST_ENDPOINTS.nearby, { method: 'POST', auth: false, body: position, query: { lang }, signal })).data,
  };
}

export type GuestApi = ReturnType<typeof createGuestApi>;
