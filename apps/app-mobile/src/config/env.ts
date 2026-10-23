import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Cấu hình đọc lúc build từ biến môi trường của Expo (`EXPO_PUBLIC_*`, được thay thẳng vào mã). App không chứa khóa bí mật nào.
// Trên điện thoại thật phải dùng địa chỉ IP của máy chạy backend trong cùng mạng Wi-Fi; trình giả lập Android thấy máy chủ ở 10.0.2.2.

const DEFAULT_HOST = Platform.OS === 'android' && !Constants.isDevice ? '10.0.2.2' : 'localhost';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const API_BASE_URL = trimSlash(process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${DEFAULT_HOST}:5080/api/v1`);

/** Web học tập: nơi có các trang nhúng bản đồ và 3D mở trong WebView. */
export const WEB_BASE_URL = trimSlash(process.env.EXPO_PUBLIC_WEB_BASE_URL ?? `http://${DEFAULT_HOST}:5174`);

/** Trang Chính sách quyền riêng tư trên web học tập (Google Play yêu cầu có lối mở từ trong app); mở bằng trình duyệt của máy. */
export const PRIVACY_POLICY_URL = `${WEB_BASE_URL}/chinh-sach-quyen-rieng-tu`;

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

/** `expo-go` khi chạy trong Expo Go (không có quảng cáo), `apk` với bản dựng riêng. */
export const APP_CHANNEL: 'expo-go' | 'apk' = Constants.executionEnvironment === 'storeClient' ? 'expo-go' : 'apk';
