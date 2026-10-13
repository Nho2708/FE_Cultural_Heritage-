import { useEffect, useState, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { DURATION, EASING, STAGGER } from './tokens';
import { useReducedMotion } from './useReducedMotion';

/**
 * Phần tử hiện dần và nhích lên 14 dp một lần khi màn hình mở; các phần tử cùng nhóm đặt `index` tăng dần để lệch nhịp 60 ms.
 * Bật giảm chuyển động thì hiện ngay, không chuyển động.
 */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, { toValue: 1, duration: DURATION.reveal, delay: index * STAGGER, easing: EASING.enter, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduced, index, progress]);

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>{children}</Animated.View>
  );
}
