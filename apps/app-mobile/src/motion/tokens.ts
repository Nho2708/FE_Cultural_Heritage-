import { Easing } from 'react-native';

// Chuyển động của app lấy theo kế hoạch motion: đường cong "expo-out" cho mọi thứ xuất hiện, đường cong mờ dần, đường cong ra ngắn hơn lúc vào;
// thời lượng giao diện không quá 600 ms; lệch nhịp 60 ms giữa các phần tử.

export const EASING = {
  enter: Easing.bezier(0.19, 1, 0.22, 1),
  fade: Easing.bezier(0, 0, 0.25, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const DURATION = {
  /** Thẻ hoặc khối vào màn hình. */
  reveal: 350,
  /** Chuyển thẻ giới thiệu khi bật giảm chuyển động: chỉ mờ dần. */
  reducedFade: 150,
  /** Màn hình chờ trong app: phần ra sau khi nạp xong. */
  splashExit: 300,
} as const;

/** Lệch nhịp giữa các phần tử trong một nhóm (ms). */
export const STAGGER = 60;
