// Bản không quảng cáo (EXPO_PUBLIC_ADS_DISABLED=true lúc dựng, xem app.config.ts) bỏ mã gốc của thư viện quảng cáo khỏi tự liên kết,
// để tệp AAB đưa lên Google Play không chứa bộ SDK quảng cáo của Google. Bản dựng thường vẫn liên kết đầy đủ.
const adsDisabled = process.env.EXPO_PUBLIC_ADS_DISABLED === 'true';

module.exports = {
  dependencies: adsDisabled ? { 'react-native-google-mobile-ads': { platforms: { android: null, ios: null } } } : {},
};
