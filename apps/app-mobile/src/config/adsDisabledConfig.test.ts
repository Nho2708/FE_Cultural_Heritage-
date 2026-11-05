import type { ExpoConfig } from 'expo/config';
import buildConfig, { adsDisabled } from '../../app.config';

// Bản không quảng cáo (bản đưa lên Google Play) bỏ plugin quảng cáo; bản thường giữ plugin và nhận mã ứng dụng AdMob lúc dựng.

const ADS_PLUGIN = 'react-native-google-mobile-ads';
const BASE = {
  name: 'DiViet',
  slug: 'hoc-di-san',
  plugins: ['expo-router', [ADS_PLUGIN, { androidAppId: 'ca-app-pub-3940256099942544~3347511713', iosAppId: 'ca-app-pub-3940256099942544~1458002511' }]],
} as unknown as ExpoConfig;

const pluginNames = (config: ExpoConfig) => (config.plugins ?? []).map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));

describe('cấu hình bản không quảng cáo', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('chỉ nhận đúng giá trị true', () => {
    expect(adsDisabled({ EXPO_PUBLIC_ADS_DISABLED: 'true' })).toBe(true);
    expect(adsDisabled({ EXPO_PUBLIC_ADS_DISABLED: 'false' })).toBe(false);
    expect(adsDisabled({})).toBe(false);
  });

  it('bỏ plugin quảng cáo khi dựng bản không quảng cáo', () => {
    process.env.EXPO_PUBLIC_ADS_DISABLED = 'true';
    process.env.ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~1111111111';
    const config = buildConfig({ config: BASE } as never);
    expect(pluginNames(config)).toEqual(['expo-router']);
  });

  it('bản thường giữ plugin quảng cáo và dùng mã ứng dụng AdMob lúc dựng', () => {
    delete process.env.EXPO_PUBLIC_ADS_DISABLED;
    process.env.ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~1111111111';
    const config = buildConfig({ config: BASE } as never);
    expect(pluginNames(config)).toEqual(['expo-router', ADS_PLUGIN]);
    const ads = (config.plugins ?? []).find((plugin) => Array.isArray(plugin) && plugin[0] === ADS_PLUGIN) as [string, Record<string, string>];
    expect(ads[1].androidAppId).toBe('ca-app-pub-3940256099942544~1111111111');
  });
});
