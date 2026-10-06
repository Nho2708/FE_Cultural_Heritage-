import type { GuestDevice, GuestHistoryItem, GuestRecommendation, GuestRecommendations, NearbyResult } from '@dsvhvn/dung-chung/api';
import { vi } from 'vitest';
import { HUE, QUAN_HO, THANG_LONG } from './discoveryFixtures';
import { envelope, type FetchCall } from './fixtures';

// Dữ liệu mẫu và máy chủ giả của khách tham quan (/api/v1/public/guest), cùng khuôn với phản hồi của backend.

export const NO_HISTORY_MESSAGE = 'Hãy xem thử vài di sản, mục "Gợi ý cho bạn" sẽ xuất hiện ở đây.';

export function deviceOf(overrides: Partial<GuestDevice> = {}): GuestDevice {
  return {
    deviceKey: '00000000-0000-4000-8000-000000000000',
    isRegistered: false,
    platform: null,
    language: 'vi',
    locationAllowed: false,
    createdAt: null,
    lastSeenAt: null,
    ...overrides,
  };
}

export function recommendationOf(overrides: Partial<GuestRecommendation> = {}): GuestRecommendation {
  return { heritage: QUAN_HO, reasons: ['SAME_TYPE', 'SAME_REGION'], becauseOfHeritageId: 1, becauseOfName: HUE.name, ...overrides };
}

export function personalizedOf(items: GuestRecommendation[] = [recommendationOf(), recommendationOf({ heritage: THANG_LONG, reasons: ['SAME_LEVEL', 'OVERLAPPING_ERA'] })]): GuestRecommendations {
  return { items, isPersonalized: true, usedFallback: false, message: null };
}

export function featuredOf(): GuestRecommendations {
  return {
    items: [HUE, THANG_LONG, QUAN_HO].map((heritage) => ({ heritage, reasons: [], becauseOfHeritageId: null, becauseOfName: null })),
    isPersonalized: false,
    usedFallback: false,
    message: NO_HISTORY_MESSAGE,
  };
}

export function historyItemOf(overrides: Partial<GuestHistoryItem> = {}): GuestHistoryItem {
  return { id: 1, type: 'VIEW', typeLabel: 'Đã xem', query: null, heritage: HUE, language: 'vi', createdAt: '2026-10-06T07:05:00Z', ...overrides };
}

export function nearbyOf(overrides: Partial<NearbyResult> = {}): NearbyResult {
  return {
    items: [
      { heritage: HUE, distanceMeters: 350, distanceText: '350 m' },
      { heritage: THANG_LONG, distanceMeters: 1234, distanceText: '1,2 km' },
    ],
    unavailableReason: null,
    message: null,
    ...overrides,
  };
}

export interface GuestServerState {
  history: GuestHistoryItem[];
  recommendations: GuestRecommendations;
  nearby: NearbyResult;
  device: GuestDevice;
  /** Các lượt ghi tay (POST activities) đã nhận. */
  activities: unknown[];
}

/**
 * Máy chủ giả của khách: lịch sử, gợi ý, "Gần bạn", cài đặt thiết bị. Thay đổi (xóa, đổi cờ) có hiệu lực ở các lần gọi sau như máy chủ thật.
 * Mặc định khách chưa có lịch sử (gợi ý là di sản nổi bật kèm lời mời).
 */
export function guestServer(initial: Partial<GuestServerState> = {}) {
  const state: GuestServerState = {
    history: [],
    recommendations: featuredOf(),
    nearby: nearbyOf(),
    device: deviceOf(),
    activities: [],
    ...initial,
  };
  const handler = (call: FetchCall): Response | undefined => {
    const [path = '', query = ''] = call.path.split('?');
    if (!path.startsWith('/public/guest/')) return undefined;
    const params = new URLSearchParams(query);
    const route = `${call.method} ${path}`;
    switch (route) {
      case 'GET /public/guest/recommendations':
        return envelope(200, { data: state.recommendations });
      case 'GET /public/guest/device':
        return envelope(200, { data: state.device });
      case 'PUT /public/guest/device':
        state.device = { ...state.device, ...(call.body as Partial<GuestDevice>), isRegistered: true };
        return envelope(200, { data: state.device });
      case 'GET /public/guest/history': {
        const page = Number(params.get('page') ?? 1);
        const pageSize = Number(params.get('pageSize') ?? 20);
        const items = state.history.slice((page - 1) * pageSize, page * pageSize);
        return envelope(200, { data: { items, page, pageSize, totalItems: state.history.length, totalPages: Math.max(1, Math.ceil(state.history.length / pageSize)) } });
      }
      case 'DELETE /public/guest/history': {
        const deleted = state.history.length;
        state.history = [];
        state.recommendations = featuredOf();
        return envelope(200, { data: { deleted }, message: 'Xóa lịch sử thành công.' });
      }
      case 'POST /public/guest/nearby':
        return envelope(200, { data: state.nearby });
      case 'POST /public/guest/activities':
        state.activities.push(call.body);
        return envelope(200, { data: { recorded: true, reason: null } });
      default: {
        const match = /^\/public\/guest\/history\/(\d+)$/.exec(path);
        if (call.method === 'DELETE' && match) {
          const id = Number(match[1]);
          if (!state.history.some((item) => item.id === id)) return envelope(404, { errorCode: 'BLOCKED', message: 'Không tìm thấy mục lịch sử.' });
          state.history = state.history.filter((item) => item.id !== id);
          return envelope(200, { message: 'Xóa mục lịch sử thành công.' });
        }
        return undefined;
      }
    }
  };
  return { state, handler };
}

/** Giả lập quyền và vị trí của trình duyệt (jsdom không có geolocation). `afterEach` của test gọi `restoreLocation`. */
export function stubLocation(options: { permission: PermissionState; coords?: { latitude: number; longitude: number }; deny?: boolean }) {
  const getCurrentPosition = vi.fn<(ok: (position: { coords: { latitude: number; longitude: number } }) => void, fail: (error: { code: number; PERMISSION_DENIED: number }) => void) => void>(
    (ok, fail) => {
      if (options.deny || !options.coords) fail({ code: 1, PERMISSION_DENIED: 1 });
      else ok({ coords: options.coords });
    },
  );
  const status = { state: options.permission, addEventListener: vi.fn<() => void>(), removeEventListener: vi.fn<() => void>() };
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
  Object.defineProperty(navigator, 'permissions', { value: { query: vi.fn<() => Promise<typeof status>>(async () => status) }, configurable: true });
  return { getCurrentPosition };
}

export function restoreLocation() {
  Reflect.deleteProperty(navigator, 'geolocation');
  Reflect.deleteProperty(navigator, 'permissions');
}
