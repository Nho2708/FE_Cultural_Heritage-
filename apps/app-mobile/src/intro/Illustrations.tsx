import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps } from 'react';
import { Animated, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { LogoMark } from '../motion/LogoMark';
import { DURATION, EASING } from '../motion/tokens';
import { useReducedMotion } from '../motion/useReducedMotion';
import { BRAND } from './palette';

// Hình của thẻ giới thiệu: thẻ chào mừng là biểu tượng DiViet chạy một lần; bốn thẻ còn lại là ảnh di sản thật bo góc kèm huy hiệu tròn màu đỏ son
// ở góc dưới (biểu tượng chức năng). Ảnh và biểu tượng chỉ để trang trí nên ẩn khỏi trình đọc màn hình, nghĩa nằm ở tiêu đề và đoạn chữ của thẻ.
// Ảnh hiện dần và thu nhẹ về đúng cỡ một lần khi thẻ hiện, huy hiệu bật vào sau 120 ms; bật giảm chuyển động thì hiện ngay trạng thái cuối.
// Nguồn và giấy phép của bốn ảnh ghi ở assets/images/gioi-thieu/nguon.md.

export type PhotoKind = 'discover' | 'narration' | 'model' | 'learn';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const INTRO_PHOTOS: Record<PhotoKind, { source: ImageSourcePropType; icon: IconName }> = {
  // Đèn lồng bên sông Hoài, Hội An.
  discover: { source: require('../../assets/images/gioi-thieu/den-long-hoi-an.jpg'), icon: 'location' },
  // Tháp Phước Duyên, chùa Thiên Mụ, Huế.
  narration: { source: require('../../assets/images/gioi-thieu/thap-phuoc-duyen-chua-thien-mu.jpg'), icon: 'headset' },
  // Cổng nam Thành nhà Hồ.
  model: { source: require('../../assets/images/gioi-thieu/cong-nam-thanh-nha-ho.jpg'), icon: 'cube' },
  // Khuê Văn Các, Văn Miếu – Quốc Tử Giám.
  learn: { source: require('../../assets/images/gioi-thieu/khue-van-cac-van-mieu.jpg'), icon: 'school' },
};

const BADGE_SIZE = 56;

/** Ảnh vuông `size` dp của một thẻ, huy hiệu chồm ra ngoài mép dưới nửa cỡ của nó. */
export function IntroPhoto({ kind, size }: { kind: PhotoKind; size: number }) {
  const reduced = useReducedMotion();
  const [photo] = useState(() => new Animated.Value(0));
  const [badge] = useState(() => new Animated.Value(0));
  const { source, icon } = INTRO_PHOTOS[kind];

  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      photo.setValue(1);
      badge.setValue(1);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(photo, { toValue: 1, duration: DURATION.reveal + 250, easing: EASING.enter, useNativeDriver: true }),
      Animated.timing(badge, { toValue: 1, duration: DURATION.reveal + 100, delay: 120, easing: EASING.enter, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduced, photo, badge]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size + BADGE_SIZE / 2 }}>
      <Animated.View
        style={[
          styles.photoFrame,
          { width: size, height: size, opacity: photo, transform: [{ scale: photo.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }] },
        ]}
      >
        <Image source={source} accessible={false} resizeMode="cover" style={styles.photo} />
      </Animated.View>
      <Animated.View
        style={[styles.badge, { top: size - BADGE_SIZE / 2, opacity: badge, transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}
      >
        <Ionicons name={icon} size={26} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

/** Biểu tượng DiViet của thẻ chào mừng, rộng `width` dp. */
export function WelcomeMark({ width }: { width: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LogoMark width={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  photoFrame: { borderRadius: 28, overflow: 'hidden', backgroundColor: BRAND.navyRaised },
  photo: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    left: 20,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 4,
    borderColor: BRAND.navy,
    backgroundColor: BRAND.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
