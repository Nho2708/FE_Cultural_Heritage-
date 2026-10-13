import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Hai nơi lưu trên máy: `prefs` cho lựa chọn thông thường (ngôn ngữ, chế độ, lịch sử của khách) và `secure` cho thứ nhạy cảm (mã thiết bị, phiên đăng nhập
// của học sinh) trong Keychain iOS / Keystore Android. Mọi đọc ghi đều bắt lỗi: lưu trữ hỏng thì app vẫn chạy với giá trị mặc định.

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const prefs: KeyValueStore = {
  async get(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Không lưu được: lựa chọn chỉ có tác dụng trong lần mở này.
    }
  },
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // bỏ qua
    }
  },
};

// Trình duyệt (bản web để thử build) không có Keychain nên dùng chung nơi lưu thường.
export const secure: KeyValueStore =
  Platform.OS === 'web'
    ? prefs
    : {
        async get(key) {
          try {
            return await SecureStore.getItemAsync(key);
          } catch {
            return null;
          }
        },
        async set(key, value) {
          try {
            await SecureStore.setItemAsync(key, value);
          } catch {
            // bỏ qua
          }
        },
        async remove(key) {
          try {
            await SecureStore.deleteItemAsync(key);
          } catch {
            // bỏ qua
          }
        },
      };

export const KEYS = {
  language: 'dsvhvn.app.ngon-ngu',
  mode: 'dsvhvn.app.che-do',
  introSeen: 'dsvhvn.app.gioi-thieu',
  location: 'dsvhvn.app.vi-tri',
  history: 'dsvhvn.app.lich-su',
  deviceId: 'dsvhvn.app.ma-thiet-bi',
  session: 'dsvhvn.app.phien',
  lessonPosition: 'dsvhvn.app.vi-tri-bai',
  recentLessons: 'dsvhvn.app.ma-gan-day',
  autoRead: 'dsvhvn.app.tu-doc',
  quizFlags: 'dsvhvn.app.danh-dau-cau',
} as const;
