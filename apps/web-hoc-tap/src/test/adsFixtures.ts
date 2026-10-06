import type { AdConfig, AdRewardResult, AdUnlockStatus, WebRewardStart } from '@dsvhvn/dung-chung/api';
import { vi } from 'vitest';
import type { GoogleTag } from '../ads/gpt';
import { HUE } from './discoveryFixtures';
import { envelope, type FetchCall } from './fixtures';

// Máy chủ giả của cổng quảng cáo (/api/v1/public/ads) và Google Publisher Tag giả: test điều khiển từng sự kiện của Google (sẵn sàng, cấp thưởng, đóng, rỗng).

export const AD_UNIT = '/22639388115/rewarded_web_example';
export const TRANSACTION = 'giao-dich-mot-lan-1';

export function adConfigOf(overrides: Partial<AdConfig> = {}): AdConfig {
  return {
    gateActive: true,
    unlockHours: 24,
    maxContentRating: 'G',
    androidAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
    iosAdUnitId: 'ca-app-pub-3940256099942544/1712485313',
    webAdUnitPath: AD_UNIT,
    allowNoAdsDeclaration: false,
    ...overrides,
  };
}

export function unlockStatusOf(overrides: Partial<AdUnlockStatus> = {}): AdUnlockStatus {
  return { heritageId: 1, slug: HUE.slug, gateRequired: true, unlocked: false, expiresAt: null, openReason: null, ...overrides };
}

export const UNLOCK_REQUIRED_MESSAGE = 'Xem một quảng cáo ngắn để mở tóm tắt và nghe thuyết minh của "Quần thể di tích Cố đô Huế" trong 24 giờ? Các nội dung khác vẫn miễn phí.';

export interface AdsServer {
  /** Máy chủ đang coi di sản là đã mở khóa tới thời điểm này (ms); 0 là chưa mở khóa. */
  unlockedUntil: number;
  /** Trả lời của `web/start`; mặc định cấp mã giao dịch. */
  start: () => Response;
  /** Trả lời của `web/rewarded`; mặc định ghi lượt mở khóa 24 giờ. */
  rewarded: () => Response;
  handler: (call: FetchCall) => Response | undefined;
}

/** Máy chủ quảng cáo giả: tóm tắt trả 403 khi chưa mở khóa; `web/rewarded` thành công thì mở khóa 24 giờ. */
export function adsServer(summary: unknown, overrides: Partial<Pick<AdsServer, 'start' | 'rewarded'>> = {}): AdsServer {
  const state: AdsServer = {
    unlockedUntil: 0,
    start: () => envelope(200, { data: { alreadyUnlocked: false, transactionId: TRANSACTION, transactionExpiresAt: '2026-10-07T08:10:00Z', adUnitPath: AD_UNIT, status: unlockStatusOf() } satisfies WebRewardStart }),
    rewarded: () => {
      state.unlockedUntil = Date.now() + 24 * 3600_000;
      return envelope(200, { data: { recorded: true, reason: null, expiresAt: new Date(state.unlockedUntil).toISOString() } satisfies AdRewardResult });
    },
    ...overrides,
    handler: (call) => {
      const path = call.path.split('?')[0]!;
      // Như máy chủ thật: học sinh được nhận ra theo phiên đăng nhập (tiêu đề Authorization), không theo khai báo nào khác; học sinh luôn mở thẳng.
      const student = call.authorization !== undefined;
      const open = student || Date.now() < state.unlockedUntil;
      switch (path) {
        case '/public/ads/config':
          return envelope(200, { data: adConfigOf() });
        case '/public/ads/unlock':
          return envelope(200, { data: unlockStatusOf(open ? { unlocked: true, expiresAt: new Date(state.unlockedUntil).toISOString() } : {}) });
        case '/public/ads/web/start':
          return state.start();
        case '/public/ads/web/rewarded':
          return state.rewarded();
        case `/public/heritages/${HUE.slug}/summary`:
          return open ? envelope(200, { data: summary }) : envelope(403, { errorCode: 'AD_UNLOCK_REQUIRED', message: UNLOCK_REQUIRED_MESSAGE });
        default:
          return undefined;
      }
    },
  };
  return state;
}

type Listener = (event: unknown) => void;

export interface FakeGoogletag {
  tag: GoogleTag;
  /** Phát một sự kiện của Google cho ô quảng cáo đã dựng. */
  emit: (type: string, extra?: Record<string, unknown>) => void;
  makeRewardedVisible: ReturnType<typeof vi.fn<() => boolean>>;
  destroySlots: ReturnType<typeof vi.fn<(slots?: unknown[]) => boolean>>;
  setPrivacySettings: ReturnType<typeof vi.fn<(settings: unknown) => void>>;
  defined: Array<{ path: string; format: unknown }>;
  /** Số bộ lắng nghe còn lại (phải về 0 sau khi xong). */
  listenerCount: () => number;
}

/**
 * Google Publisher Tag giả, cài vào `window.googletag`. `onDisplay` chạy khi trang gọi `display` (test phát `rewardedSlotReady` ở đây hoặc sau đó).
 * `unsupported` thì `defineOutOfPageSlot` trả null như khi thiết bị không hiện được quảng cáo có thưởng.
 */
export function installGoogletag({ unsupported = false, onDisplay }: { unsupported?: boolean; onDisplay?: (fake: FakeGoogletag) => void } = {}): FakeGoogletag {
  const listeners = new Map<string, Set<Listener>>();
  const slot = { addService: () => slot };
  const makeRewardedVisible = vi.fn<() => boolean>(() => true);
  const destroySlots = vi.fn<(slots?: unknown[]) => boolean>(() => true);
  const setPrivacySettings = vi.fn<(settings: unknown) => void>();
  const defined: FakeGoogletag['defined'] = [];
  const pubads = {
    addEventListener: (type: string, listener: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(type, set);
      return pubads;
    },
    removeEventListener: (type: string, listener: Listener) => void listeners.get(type)?.delete(listener),
    setPrivacySettings: (settings: unknown) => {
      setPrivacySettings(settings);
      return pubads;
    },
  };
  const fake: FakeGoogletag = {
    tag: {
      apiReady: true,
      cmd: { push: (callback: () => void) => callback() },
      enums: { OutOfPageFormat: { REWARDED: 'REWARDED' } },
      defineOutOfPageSlot: (path: string, format: unknown) => {
        defined.push({ path, format });
        return unsupported ? null : slot;
      },
      pubads: () => pubads,
      enableServices: () => undefined,
      display: () => onDisplay?.(fake),
      destroySlots,
    } as unknown as GoogleTag,
    emit: (type, extra = {}) => {
      const event = type === 'rewardedSlotReady' ? { slot, makeRewardedVisible, ...extra } : { slot, ...extra };
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
    },
    makeRewardedVisible,
    destroySlots,
    setPrivacySettings,
    defined,
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
  };
  Object.defineProperty(window, 'googletag', { value: fake.tag, configurable: true, writable: true });
  return fake;
}

export function removeGoogletag() {
  Reflect.deleteProperty(window, 'googletag');
}
