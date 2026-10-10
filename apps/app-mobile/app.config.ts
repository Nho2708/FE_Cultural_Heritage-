import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withGradleProperties } from 'expo/config-plugins';

// Mã ứng dụng AdMob trong app.json là mã thử do Google công bố. Bản dựng dùng tài khoản AdMob của nhóm đặt
// ADMOB_ANDROID_APP_ID, ADMOB_IOS_APP_ID lúc dựng (mã ứng dụng không phải bí mật, nhưng không viết cứng để bản dựng thử vẫn dùng mã thử).
const ADS_PLUGIN = 'react-native-google-mobile-ads';

// Gradle của thư viện quảng cáo đọc khóa gốc "react-native-google-mobile-ads" trong app.json; dự án Expo khai ở mục plugins nên
// khóa đó không có và Gradle dừng với lỗi "Cannot get property 'googleMobileAdsJson'". Đặt sẵn bản SDK Android (classic, mặc định của thư viện)
// trong gradle.properties thì Gradle bỏ qua bước đọc đó; mã ứng dụng vẫn do plugin Expo ghi vào AndroidManifest.
const withAdsAndroidBackend = (config: ExpoConfig): ExpoConfig =>
  withGradleProperties(config, (gradle) => {
    gradle.modResults = gradle.modResults.filter((item) => !(item.type === 'property' && item.key === 'RNGMA_ANDROID_BACKEND'));
    gradle.modResults.push({ type: 'property', key: 'RNGMA_ANDROID_BACKEND', value: 'classic' });
    return gradle;
  });

export default ({ config }: ConfigContext): ExpoConfig =>
  withAdsAndroidBackend({
    ...config,
    name: config.name ?? 'Học di sản',
    slug: config.slug ?? 'hoc-di-san',
    plugins: (config.plugins ?? []).map((plugin) => {
      if (!Array.isArray(plugin) || plugin[0] !== ADS_PLUGIN) return plugin;
      const options = (plugin[1] ?? {}) as Record<string, string>;
      return [
        ADS_PLUGIN,
        {
          ...options,
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || options.androidAppId,
          iosAppId: process.env.ADMOB_IOS_APP_ID || options.iosAppId,
        },
      ];
    }),
  });
