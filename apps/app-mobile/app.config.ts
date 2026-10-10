import type { ConfigContext, ExpoConfig } from 'expo/config';

// Mã ứng dụng AdMob trong app.json là mã thử do Google công bố. Bản dựng dùng tài khoản AdMob của nhóm đặt
// ADMOB_ANDROID_APP_ID, ADMOB_IOS_APP_ID lúc dựng (mã ứng dụng không phải bí mật, nhưng không viết cứng để bản dựng thử vẫn dùng mã thử).
const ADS_PLUGIN = 'react-native-google-mobile-ads';

export default ({ config }: ConfigContext): ExpoConfig => ({
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
