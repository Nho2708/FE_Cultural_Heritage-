import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { privacyOptionsStateOf, type PrivacyOptionsState } from './consent';
import { createRewardedLoader, type RewardedAdsApi, type RewardedOutcome } from './rewardedLoader';
import { parseTestDeviceIds } from './testDevices';

// Quảng cáo có thưởng của Google (AdMob) qua `react-native-google-mobile-ads`. Mô-đun này là mã gốc nên KHÔNG có trong Expo Go: ở đó `require` thất bại và app
// coi như không có quảng cáo (gửi `X-Ads-Unavailable` để máy chủ ở môi trường phát triển mở thẳng, hoặc hiện ghi chú cần bản dựng phát triển).
// Chỉ dùng đơn vị quảng cáo do máy chủ trả ở `GET /public/ads/config` (khi phát triển là đơn vị thử của Google); app không chứa mã đơn vị nào.
//
// Học sinh và trẻ em cũng dùng app, còn khách không khai tuổi, nên theo chính sách Gia đình của Google Play mọi yêu cầu quảng cáo
// đều được xử lý như cho trẻ em: quảng cáo không cá nhân hóa, nội dung mức G, Google không hỏi đồng ý quảng cáo cá nhân hóa (UMP)
// và app không có quyền đọc mã quảng cáo của máy (app.json chặn quyền AD_ID).
//
// Hỏi đồng ý (UMP) và khởi tạo thư viện chỉ làm một lần mỗi lần mở app, ngay khi vào chế độ Khách: bước này có khi mất vài chục giây nếu để tới lúc khách bấm xem.
// Tải trước và chiếu quảng cáo ở `rewardedLoader.ts`.
const CONSENT_OPTIONS = { tagForUnderAgeOfConsent: true };

interface AdsModule extends RewardedAdsApi {
  default: () => { initialize: () => Promise<unknown>; setRequestConfiguration: (config: Record<string, unknown>) => Promise<void> };
  AdsConsent?: {
    gatherConsent: (options?: typeof CONSENT_OPTIONS) => Promise<unknown>;
    requestInfoUpdate: (options?: typeof CONSENT_OPTIONS) => Promise<{ privacyOptionsRequirementStatus?: string }>;
    showPrivacyOptionsForm: () => Promise<unknown>;
  };
  MaxAdContentRating: { G: string };
  AgeRestrictedTreatment: { CHILD: string };
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

export type { PrivacyOptionsState } from './consent';
export type { RewardedOutcome } from './rewardedLoader';

/** Hỏi Google xem vùng của khách có yêu cầu tùy chọn quyền riêng tư (hộp đồng ý quảng cáo) không. Không hiện hộp nào. */
export async function privacyOptionsState(): Promise<PrivacyOptionsState> {
  const consent = adsModule()?.AdsConsent;
  if (!consent) return 'unavailable';
  try {
    return privacyOptionsStateOf((await consent.requestInfoUpdate(CONSENT_OPTIONS)).privacyOptionsRequirementStatus);
  } catch {
    return 'failed';
  }
}

/** Mở lại biểu mẫu tùy chọn quyền riêng tư của Google để khách đổi lựa chọn quảng cáo cá nhân hóa. Trả false khi không mở được. */
export async function showPrivacyOptions(): Promise<boolean> {
  const consent = adsModule()?.AdsConsent;
  if (!consent) return false;
  try {
    await consent.showPrivacyOptionsForm();
    return true;
  } catch {
    return false;
  }
}

let preparing: Promise<boolean> | null = null;

/** Hỏi đồng ý và khởi tạo thư viện quảng cáo, một lần cho cả phiên (lỗi thì lần gọi sau làm lại). Trả false khi không có quảng cáo. */
export function prepareAds(): Promise<boolean> {
  const ads = adsModule();
  if (!ads) return Promise.resolve(false);
  if (!preparing) {
    const attempt = (async () => {
      // Thông tin đồng ý của Google (UMP) gửi kèm cờ dưới tuổi đồng ý nên không hiện hộp hỏi; quảng cáo xử lý như cho trẻ em, mức G.
      await ads.AdsConsent?.gatherConsent(CONSENT_OPTIONS).catch(() => undefined);
      // Máy thử khai lúc dựng (EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS): Google chỉ trả quảng cáo thử cho các máy này, kể cả với đơn vị quảng cáo thật.
      const testDeviceIdentifiers = parseTestDeviceIds(process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS);
      await ads.default().setRequestConfiguration({
        ageRestrictedTreatment: ads.AgeRestrictedTreatment.CHILD,
        // Bản 17.2 của thư viện gửi "child" nhưng mã Android chỉ nhận "CHILD", nên trên Android dòng trên không có tác dụng;
        // hai cờ cũ dưới đây Android vẫn nhận, giữ tới khi thư viện sửa.
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
        maxAdContentRating: ads.MaxAdContentRating.G,
        ...(testDeviceIdentifiers.length > 0 ? { testDeviceIdentifiers } : {}),
      });
      await ads.default().initialize();
      return true;
    })().catch(() => {
      preparing = null;
      return false;
    });
    preparing = attempt;
  }
  return preparing;
}

let loader: ReturnType<typeof createRewardedLoader> | null = null;

function loaderOf(ads: AdsModule) {
  loader ??= createRewardedLoader(ads);
  return loader;
}

/** Tải sẵn quảng cáo cho di sản đang hiện lời mời, để khách bấm xem thì chiếu được ngay. Không có quảng cáo hay khởi tạo hỏng thì thôi. */
export function preloadRewardedAd(unitId: string, deviceKey: string, heritageId: number): void {
  const ads = adsModule();
  if (!ads) return;
  void prepareAds().then((ready) => {
    if (ready) loaderOf(ads).preload(unitId, deviceKey, heritageId);
  });
}

/**
 * Hiện một quảng cáo có thưởng (dùng quảng cáo đã tải sẵn nếu có). Mã thiết bị gắn làm `user_id` và mã di sản (số) làm `custom_data` để Google gọi xác minh về máy chủ.
 * Trả `earned` khi khách xem đủ và đóng quảng cáo; việc mở khóa vẫn do máy chủ quyết định.
 */
export async function showRewardedAd(unitId: string, deviceKey: string, heritageId: number): Promise<RewardedOutcome> {
  const ads = adsModule();
  if (!ads) return 'unavailable';
  if (!(await prepareAds())) return 'failed';
  return loaderOf(ads).show(unitId, deviceKey, heritageId);
}
