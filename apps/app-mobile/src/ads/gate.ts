import { APP_CHANNEL } from '../config/env';

// Cổng quảng cáo có thưởng cho tóm tắt và nghe thuyết minh của khách. CHƯA làm AdMob: mô-đun quảng cáo (`react-native-google-mobile-ads`) cần bản dựng phát triển
// qua EAS và không chạy trong Expo Go. Phần này chỉ giữ chỗ cho cổng: giao diện đã hỏi `useAdGate()` trước khi mở tóm tắt và nghe, nên khi có bản dựng riêng chỉ cần
// thay phần hiện thực dưới đây bằng bản gọi AdMob (khởi tạo sau hộp đồng ý UMP, gửi mã thiết bị và mã di sản trong `customData`, chờ backend xác minh phần thưởng) mà không
// sửa màn hình. Chế độ Học sinh không bao giờ có quảng cáo.

export interface AdGate {
  /** Tóm tắt và nghe đang bị khóa, cần xem quảng cáo. */
  locked: boolean;
  /** Bản dựng này không có quảng cáo (Expo Go hoặc chưa tích hợp AdMob): hiện ghi chú thay cho lời mời xem quảng cáo. */
  placeholder: boolean;
  /** Yêu cầu xem quảng cáo cho một di sản; true khi đã nhận phần thưởng. */
  request: (slug: string) => Promise<boolean>;
}

const NO_ADS: AdGate = {
  locked: false,
  // Ghi chú "chạy trong Expo Go nên chưa có quảng cáo" chỉ đúng với Expo Go.
  placeholder: APP_CHANNEL === 'expo-go',
  request: async () => true,
};

/** Cổng cho di sản hiện tại. Hiện luôn mở sẵn vì chưa có quảng cáo. */
export function useAdGate(): AdGate {
  return NO_ADS;
}
