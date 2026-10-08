import { getRandomValues } from 'expo-crypto';
import { Platform } from 'react-native';
import { createDeviceKey, MESSAGES } from '@dsvhvn/dung-chung';
import {
  createAdsApi,
  createApiClient,
  createDiscoveryApi,
  createGuestApi,
  createStudentApi,
  sessionEndNotice,
  type AdsApi,
  type ApiClient,
  type ClientPlatform,
  type DiscoveryApi,
  type GuestApi,
  type StudentApi,
  type StudentProfile,
} from '@dsvhvn/dung-chung/api';
import { isProfileLike, SessionStore } from '@dsvhvn/dung-chung/auth';
import { adsAvailable } from '../ads/rewarded';
import { API_BASE_URL, APP_CHANNEL, APP_VERSION } from '../config/env';
import { KEYS, prefs, secure } from '../storage/keyValue';
import { PersistentStorage } from '../storage/persistentStorage';

// Các dịch vụ dùng chung của app, dựng một lần lúc khởi động: lớp gọi API (cùng `/api/v1` với web), phiên đăng nhập của học sinh lưu bằng SecureStore
// và mã thiết bị ẩn danh của khách. Chỉ có access token, không có refresh token: máy chủ trả 401 thì kết thúc phiên trên máy này.

export type AppMode = 'guest' | 'student';

export interface Services {
  apiClient: ApiClient;
  discoveryApi: DiscoveryApi;
  guestApi: GuestApi;
  adsApi: AdsApi;
  studentApi: StudentApi;
  sessionStore: SessionStore<StudentProfile>;
  /** Mã thiết bị ẩn danh (UUID ngẫu nhiên), chỉ gửi ở chế độ Khách. */
  deviceId: string;
  /** Nền tảng gửi ở `X-Client-Platform` (ứng dụng gốc: ANDROID hoặc IOS; bản web để thử build coi là WEB). */
  platform: ClientPlatform;
}

function isStudentProfile(value: unknown): value is StudentProfile {
  return isProfileLike(value) && value.role === 'STUDENT';
}

/** Mã thiết bị: sinh ở lần mở đầu và giữ trong SecureStore. Không phải tài khoản và không gắn với người dùng nào. */
async function loadDeviceId(): Promise<string> {
  const stored = await secure.get(KEYS.deviceId);
  if (stored) return stored;
  const created = createDeviceKey(getRandomValues);
  await secure.set(KEYS.deviceId, created);
  return created;
}

export async function createServices(getMode: () => AppMode | null): Promise<Services> {
  const [deviceId, storage] = await Promise.all([loadDeviceId(), PersistentStorage.load(secure, [KEYS.session])]);
  const sessionStore = new SessionStore<StudentProfile>({
    storage: storage as unknown as Storage,
    key: KEYS.session,
    isUser: isStudentProfile,
    expiredNotice: MESSAGES.sessionExpired,
  });

  const platform: ClientPlatform = Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
  const apiClient = createApiClient({
    baseUrl: API_BASE_URL,
    getAccessToken: () => sessionStore.getSession()?.accessToken ?? null,
    onUnauthorized: (response) => {
      if (sessionStore.getSession()?.accessToken === response.token) sessionStore.clear(sessionEndNotice(response));
    },
    // Ứng dụng gốc không qua CORS nên gửi được header riêng; trình duyệt (bản web để thử build) thì bỏ để khỏi cần cấu hình CORS thêm.
    extraHeaders: () => {
      if (Platform.OS === 'web') return {};
      const headers: Record<string, string> = { 'X-App-Version': APP_VERSION, 'X-App-Channel': APP_CHANNEL };
      // Chế độ Khách gửi mã thiết bị (UUID v4 ẩn danh) và nền tảng: máy chủ tự ghi lịch sử và áp cổng quảng cáo theo thiết bị. Học sinh không gửi mã này.
      if (getMode() === 'guest') {
        headers['X-Device-Key'] = deviceId;
        headers['X-Client-Platform'] = platform;
        // Bản không có mô-đun quảng cáo (Expo Go) khai báo để máy chủ ở môi trường phát triển mở thẳng; môi trường thật bỏ qua tiêu đề này.
        if (!adsAvailable()) headers['X-Ads-Unavailable'] = 'true';
      }
      return headers;
    },
  });

  return { apiClient, discoveryApi: createDiscoveryApi(apiClient), guestApi: createGuestApi(apiClient), adsApi: createAdsApi(apiClient), studentApi: createStudentApi(apiClient), sessionStore, deviceId, platform };
}

export async function readStoredMode(): Promise<AppMode | null> {
  const value = await prefs.get(KEYS.mode);
  return value === 'guest' || value === 'student' ? value : null;
}
