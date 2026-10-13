import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Người dùng có bật "giảm chuyển động" của hệ thống không. Trả `null` trong lúc hệ thống chưa trả lời (vài mili giây đầu) để màn hình chưa bắt đầu
 * chuyển động nào rồi mới đổi ý; sau đó là `true` hoặc `false` và tự cập nhật khi người dùng đổi cài đặt.
 */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {
        if (active) setReduced(false);
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => setReduced(value));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
