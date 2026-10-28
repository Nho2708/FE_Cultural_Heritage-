// Tải trước và chiếu quảng cáo có thưởng. Tách khỏi `rewarded.ts` (phần gọi mô-đun gốc) để kiểm thử bằng mô-đun quảng cáo giả.
//
// Quảng cáo video của Google có khi tải gần hết 60 giây (tài nguyên của quảng cáo về chậm ở lần đầu), quá hạn đó thư viện báo lỗi nội bộ dù Google đã trả quảng cáo.
// Vì vậy app tải sẵn quảng cáo ngay khi hiện lời mời xem: khách bấm "Xem quảng cáo" thì chiếu luôn, hoặc chờ nốt lượt tải đang chạy thay vì tải lại từ đầu.
// Mỗi lúc chỉ giữ một quảng cáo (của di sản đang xem). Tải hỏng vì lỗi khác "không có quảng cáo" thì tự thử lại một lần.

export interface RewardedAdInstance {
  addAdEventListener: (type: string, listener: (payload?: unknown) => void) => () => void;
  load: () => void;
  show: () => Promise<void>;
  destroy: () => void;
}

export interface RewardedAdsApi {
  RewardedAd: { createForAdRequest: (unitId: string, options: Record<string, unknown>) => RewardedAdInstance };
  RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
  AdEventType: { CLOSED: string; ERROR: string };
}

/**
 * - `earned`: khách xem đủ và đóng quảng cáo (việc mở khóa vẫn do máy chủ quyết định).
 * - `closed`: khách đóng quảng cáo trước khi được thưởng.
 * - `noFill`: Google không có quảng cáo để trả lúc này.
 * - `failed`: tải hoặc chiếu hỏng vì lý do khác.
 * - `unavailable`: bản dựng không có mô-đun quảng cáo.
 */
export type RewardedOutcome = 'earned' | 'closed' | 'noFill' | 'failed' | 'unavailable';

/** Google giữ quảng cáo đã tải được một giờ; bỏ sớm hơn một chút cho chắc. */
export const LOADED_AD_MAX_AGE_MS = 50 * 60 * 1000;

// Google không có quảng cáo: thử lại ngay cũng vô ích.
const NO_AD_REASONS = new Set(['no-fill', 'mediation-no-fill']);
// Yêu cầu sai (mã đơn vị, mã ứng dụng): thử lại vẫn hỏng. Lỗi còn lại (hết hạn tải, lỗi mạng, lỗi nội bộ) thử lại một lần.
const FINAL_REASONS = new Set([...NO_AD_REASONS, 'invalid-request', 'app-id-missing', 'invalid-ad-string']);

/** Lý do lỗi trong sự kiện ERROR của thư viện (`reason`, hoặc suy ra từ `code` như "googleMobileAds/no-fill"). */
export function errorReason(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const { reason, code } = payload as { reason?: unknown; code?: unknown };
    if (typeof reason === 'string' && reason) return reason;
    if (typeof code === 'string' && code) return code.replace(/^googleMobileAds\//, '').replace(/^error-code-/, '');
  }
  return 'unknown';
}

type LoadResult = { ok: true } | { ok: false; reason: string };

interface Slot {
  key: string;
  ad: RewardedAdInstance;
  result: Promise<LoadResult>;
  loadedAt: number | null;
  inUse: boolean;
  destroyed: boolean;
}

export function createRewardedLoader(ads: RewardedAdsApi, now: () => number = Date.now) {
  // Quảng cáo đang tải, đã tải chờ chiếu, hoặc đang chiếu.
  let slot: Slot | null = null;

  const keyOf = (unitId: string, deviceKey: string, heritageId: number) => `${unitId}|${deviceKey}|${heritageId}`;
  const expired = (s: Slot) => s.loadedAt !== null && now() - s.loadedAt > LOADED_AD_MAX_AGE_MS;

  function discard(s: Slot) {
    if (s.destroyed) return;
    s.destroyed = true;
    s.ad.destroy();
    if (slot === s) slot = null;
  }

  // Mã thiết bị làm `user_id` và mã di sản làm `custom_data` để Google gọi xác minh về máy chủ.
  function start(unitId: string, deviceKey: string, heritageId: number): Slot {
    const ad = ads.RewardedAd.createForAdRequest(unitId, { serverSideVerificationOptions: { userId: deviceKey, customData: String(heritageId) } });
    let next: Slot;
    const result = new Promise<LoadResult>((resolve) => {
      const offs: Array<() => void> = [];
      const done = (outcome: LoadResult) => {
        offs.forEach((off) => off());
        resolve(outcome);
      };
      offs.push(
        ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
          next.loadedAt = now();
          done({ ok: true });
        }),
      );
      offs.push(ad.addAdEventListener(ads.AdEventType.ERROR, (payload) => done({ ok: false, reason: errorReason(payload) })));
    });
    next = { key: keyOf(unitId, deviceKey, heritageId), ad, result, loadedAt: null, inUse: false, destroyed: false };
    ad.load();
    return next;
  }

  function present(ad: RewardedAdInstance): Promise<RewardedOutcome> {
    return new Promise<RewardedOutcome>((resolve) => {
      let earned = false;
      let settled = false;
      const offs: Array<() => void> = [];
      const finish = (outcome: RewardedOutcome) => {
        if (settled) return;
        settled = true;
        offs.forEach((off) => off());
        resolve(outcome);
      };
      offs.push(ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => (earned = true)));
      offs.push(ad.addAdEventListener(ads.AdEventType.CLOSED, () => finish(earned ? 'earned' : 'closed')));
      offs.push(ad.addAdEventListener(ads.AdEventType.ERROR, () => finish('failed')));
      ad.show().catch(() => finish('failed'));
    });
  }

  /** Bắt đầu tải quảng cáo cho di sản này nếu chưa có. Quảng cáo đang giữ của di sản khác thì bỏ; đang chiếu thì để yên. */
  function preload(unitId: string, deviceKey: string, heritageId: number): void {
    const key = keyOf(unitId, deviceKey, heritageId);
    if (slot && (slot.inUse || (slot.key === key && !expired(slot)))) return;
    if (slot) discard(slot);
    const loading = start(unitId, deviceKey, heritageId);
    slot = loading;
    // Tải hỏng mà chưa ai dùng thì bỏ, lần bấm sau tải lại.
    void loading.result.then((result) => {
      if (!result.ok && !loading.inUse) discard(loading);
    });
  }

  /** Chiếu quảng cáo của di sản này: dùng quảng cáo đã tải sẵn (hoặc chờ lượt tải đang chạy), không có thì tải mới. */
  async function show(unitId: string, deviceKey: string, heritageId: number): Promise<RewardedOutcome> {
    const key = keyOf(unitId, deviceKey, heritageId);
    if (slot?.inUse) return 'failed';
    let current: Slot;
    if (slot && slot.key === key && !expired(slot)) current = slot;
    else {
      if (slot) discard(slot);
      current = start(unitId, deviceKey, heritageId);
    }
    try {
      for (let attempt = 0; ; attempt += 1) {
        current.inUse = true;
        slot = current;
        const result = await current.result;
        if (result.ok) return await present(current.ad);
        discard(current);
        if (NO_AD_REASONS.has(result.reason)) return 'noFill';
        if (FINAL_REASONS.has(result.reason) || attempt >= 1) return 'failed';
        current = start(unitId, deviceKey, heritageId);
      }
    } finally {
      discard(current);
    }
  }

  return { preload, show };
}
