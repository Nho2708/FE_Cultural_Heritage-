import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withAppBuildGradle, withGradleProperties } from 'expo/config-plugins';

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

// Khóa tải lên Google Play. Expo prebuild sinh android/app/build.gradle ký release bằng khóa gỡ lỗi; addUploadSigning thêm cấu hình ký
// "release" đọc tệp khóa và mật khẩu từ biến môi trường của máy dựng (scripts/dung-apk.ps1 -ChoGooglePlay đặt các biến này từ thư mục
// khóa nằm ngoài repo). Máy dựng không đặt biến thì vẫn ký bằng khóa gỡ lỗi như trước, đủ cho APK cài tay.
const UPLOAD_STORE_FILE_ENV = 'DIVIET_UPLOAD_STORE_FILE';

const RELEASE_SIGNING_CONFIG = [
  '        release {',
  `            if (System.getenv('${UPLOAD_STORE_FILE_ENV}')) {`,
  `                storeFile file(System.getenv('${UPLOAD_STORE_FILE_ENV}'))`,
  "                storePassword System.getenv('DIVIET_UPLOAD_STORE_PASSWORD')",
  "                keyAlias System.getenv('DIVIET_UPLOAD_KEY_ALIAS')",
  "                keyPassword System.getenv('DIVIET_UPLOAD_KEY_PASSWORD')",
  '            }',
  '        }',
];

const SIGNING_CONFIGS = /signingConfigs \{(\r?\n)/;
// Dòng ký của buildTypes.release (khối debug của buildTypes đứng trước và cũng ký bằng khóa gỡ lỗi).
const RELEASE_BUILD_TYPE_SIGNING = /(buildTypes \{[\s\S]*?\brelease \{[\s\S]*?)signingConfig signingConfigs\.debug/;

/** Thêm khóa tải lên vào build.gradle của app; gọi lại trên tệp đã thêm thì giữ nguyên. Không nhận ra khuôn tệp thì báo lỗi. */
export function addUploadSigning(gradle: string): string {
  if (gradle.includes(UPLOAD_STORE_FILE_ENV)) return gradle;
  if (!SIGNING_CONFIGS.test(gradle) || !RELEASE_BUILD_TYPE_SIGNING.test(gradle)) {
    throw new Error('android/app/build.gradle không có khối signingConfigs và buildTypes.release như Expo sinh ra; chưa thêm được khóa tải lên.');
  }
  return gradle
    .replace(SIGNING_CONFIGS, (line, newline: string) => line + RELEASE_SIGNING_CONFIG.join(newline) + newline)
    .replace(
      RELEASE_BUILD_TYPE_SIGNING,
      `$1signingConfig System.getenv('${UPLOAD_STORE_FILE_ENV}') ? signingConfigs.release : signingConfigs.debug`,
    );
}

const withUploadSigning = (config: ExpoConfig): ExpoConfig =>
  withAppBuildGradle(config, (gradle) => {
    gradle.modResults.contents = addUploadSigning(gradle.modResults.contents);
    return gradle;
  });

export default ({ config }: ConfigContext): ExpoConfig =>
  withUploadSigning(withAdsAndroidBackend({
    ...config,
    name: config.name ?? 'DiViet',
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
  }));
