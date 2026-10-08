import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Quảng cáo có thưởng của Google (AdMob) qua `react-native-google-mobile-ads`. Mô-đun này là mã gốc nên KHÔNG có trong Expo Go: ở đó `require` thất bại và app
// coi như không có quảng cáo (gửi `X-Ads-Unavailable` để máy chủ ở môi trường phát triển mở thẳng, hoặc hiện ghi chú cần bản dựng phát triển).
// Chỉ dùng đơn vị quảng cáo do máy chủ trả ở `GET /public/ads/config` (khi phát triển là đơn vị thử của Google); app không chứa mã đơn vị nào.

interface AdsModule {
  default: () => { initialize: () => Promise<unknown>; setRequestConfiguration: (config: Record<string, unknown>) => Promise<void> };
  RewardedAd: { createForAdRequest: (unitId: string, options: Record<string, unknown>) => RewardedAdInstance };
  RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
  AdEventType: { CLOSED: string; ERROR: string };
  AdsConsent?: { gatherConsent: () => Promise<unknown> };
  MaxAdContentRating: { G: string };
}

interface RewardedAdInstance {
  addAdEventListener: (type: string, listener: (payload?: unknown) => void) => () => void;
  load: () => void;
  show: () => Promise<void>;
}

let cached: AdsModule | null | undefined;

function adsModule(): AdsModule | null {
  if (cached !== undefined) return cached;
  // Expo Go không chứa mô-đun quảng cáo: gọi `require` ở đó làm Metro báo lỗi đỏ dù đã bắt, nên không thử.
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('react-native-google-mobile-ads') as AdsModule;
    // Trong Expo Go mô-đun nạp được nhưng gọi sẽ lỗi; thử một lần để biết chắc.
    loaded.default();
    cached = loaded;
  } catch {
    cached = null;
  }
  return cached;
}

/** Bản dựng này có mô-đun quảng cáo (bản dựng phát triển qua EAS); Expo Go thì không. */
export function adsAvailable(): boolean {
  return adsModule() !== null;
}

export type RewardedOutcome = 'earned' | 'closed' | 'failed' | 'unavailable';

/**
 * Hiện một quảng cáo có thưởng. Mã thiết bị gắn làm `user_id` và mã di sản (số) làm `custom_data` để Google gọi xác minh về máy chủ.
 * Trả `earned` khi khách xem đủ và đóng quảng cáo; việc mở khóa vẫn do máy chủ quyết định.
 */
export async function showRewardedAd(unitId: string, deviceKey: string, heritageId: number): Promise<RewardedOutcome> {
  const ads = adsModule();
  if (!ads) return 'unavailable';
  try {
    // Hộp đồng ý của Google (UMP) cho khách ở EU và UK; nội dung quảng cáo giới hạn mức phù hợp mọi lứa tuổi.
    await ads.AdsConsent?.gatherConsent().catch(() => undefined);
    await ads.default().setRequestConfiguration({ maxAdContentRating: ads.MaxAdContentRating.G });
    await ads.default().initialize();
  } catch {
    return 'failed';
  }
  return new Promise<RewardedOutcome>((resolve) => {
    const ad = ads.RewardedAd.createForAdRequest(unitId, { serverSideVerificationOptions: { userId: deviceKey, customData: String(heritageId) } });
    let earned = false;
    const offs: Array<() => void> = [];
    const finish = (outcome: RewardedOutcome) => {
      offs.forEach((off) => off());
      resolve(outcome);
    };
    offs.push(ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => void ad.show().catch(() => finish('failed'))));
    offs.push(ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => (earned = true)));
    offs.push(ad.addAdEventListener(ads.AdEventType.CLOSED, () => finish(earned ? 'earned' : 'closed')));
    offs.push(ad.addAdEventListener(ads.AdEventType.ERROR, () => finish('failed')));
    ad.load();
  });
}
