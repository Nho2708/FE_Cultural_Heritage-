import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { DURATION, EASING, STAGGER } from '../motion/tokens';
import { useReducedMotion } from '../motion/useReducedMotion';
import { BRAND } from './palette';

// Bốn hình minh họa của thẻ giới thiệu, vẽ bằng khối View theo màu logo (không ảnh, không thư viện hoạt hình). Mỗi hình chạy một lần khi thẻ hiện;
// bật giảm chuyển động thì hiện ngay trạng thái cuối. Hình chỉ để trang trí nên ẩn khỏi trình đọc màn hình (nghĩa nằm ở tiêu đề và đoạn chữ của thẻ).

export const ART_SIZE = 176;

export type ArtKind = 'discover' | 'narration' | 'model' | 'learn';

type Build = (values: Animated.Value[]) => Animated.CompositeAnimation;

/** Các giá trị chuyển động 0 → 1 chạy một lần theo `build`; giảm chuyển động thì đứng ngay ở 1 (trạng thái cuối). */
function useRunOnce(count: number, build: Build): Animated.Value[] {
  const reduced = useReducedMotion();
  const [values] = useState(() => Array.from({ length: count }, () => new Animated.Value(0)));
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      values.forEach((value) => value.setValue(1));
      return;
    }
    const animation = build(values);
    animation.start();
    return () => animation.stop();
  }, [reduced, values, build]);
  return values;
}

function Disc({ tone, children }: { tone: 'cream' | 'raised'; children: ReactNode }) {
  return (
    <View style={[styles.disc, { backgroundColor: tone === 'cream' ? BRAND.cream : BRAND.navyRaised }]}>
      <View style={styles.ring} />
      {children}
    </View>
  );
}

const dropIn: Build = ([value]) => Animated.timing(value!, { toValue: 1, duration: 600, easing: EASING.enter, useNativeDriver: true });

function Discover() {
  const fall = useRunOnce(1, dropIn)[0]!;
  return (
    <Disc tone="cream">
      <View style={[styles.mapLine, { top: 46, left: 20, width: 120, transform: [{ rotate: '-18deg' }] }]} />
      <View style={[styles.mapLine, { top: 92, left: 40, width: 120, transform: [{ rotate: '12deg' }] }]} />
      <View style={[styles.mapLine, { top: 128, left: 24, width: 100, transform: [{ rotate: '-8deg' }] }]} />
      <Animated.View style={[styles.pinShadow, { opacity: fall, transform: [{ scaleX: fall.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]} />
      <Animated.View
        style={[
          styles.pin,
          { opacity: fall.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }] },
        ]}
      >
        <View style={styles.pinTail} />
        <View style={styles.pinHead}>
          <View style={styles.pinDot} />
        </View>
      </Animated.View>
    </Disc>
  );
}

const BAR_HEIGHTS = [44, 80, 58] as const;

const growBars: Build = (values) =>
  Animated.stagger(
    STAGGER,
    values.map((value) => Animated.timing(value, { toValue: 1, duration: DURATION.reveal + 150, easing: EASING.enter, useNativeDriver: true })),
  );

function Narration() {
  const bars = useRunOnce(3, growBars);
  return (
    <Disc tone="raised">
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((height, index) => (
          <Animated.View key={height} style={[styles.bar, { height, transform: [{ scaleY: bars[index]!.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }] }]} />
        ))}
      </View>
    </Disc>
  );
}

function Tier({ roof, body, children, progress }: { roof: number; body: { width: number; height: number }; children?: ReactNode; progress: Animated.Value }) {
  return (
    <Animated.View style={{ alignItems: 'center', opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <View style={[styles.roof, { width: roof }]}>
        <View style={[styles.roofLine, { width: roof - 26 }]} />
      </View>
      <View style={[styles.body, body]}>{children}</View>
    </Animated.View>
  );
}

// Mọc từ bậc thềm lên: tầng dưới trước, mỗi tầng lệch 120 ms.
const raiseTiers: Build = (values) =>
  Animated.stagger(
    STAGGER * 2,
    values.map((value) => Animated.timing(value, { toValue: 1, duration: DURATION.reveal + 100, easing: EASING.enter, useNativeDriver: true })),
  );

function Pavilion() {
  const [bottom, middle, top] = useRunOnce(3, raiseTiers);
  return (
    <Disc tone="cream">
      <View style={styles.pavilion}>
        <Tier roof={78} body={{ width: 50, height: 20 }} progress={top!} />
        <Tier roof={112} body={{ width: 86, height: 24 }} progress={middle!} />
        <Tier roof={148} body={{ width: 126, height: 36 }} progress={bottom!}>
          <View style={[styles.window, { left: 10 }]} />
          <View style={styles.gate} />
          <View style={[styles.window, { right: 10 }]} />
        </Tier>
        <View style={[styles.step, { width: 118 }]} />
        <View style={[styles.step, { width: 96 }]} />
      </View>
    </Disc>
  );
}

const popStar: Build = ([star, ticket]) =>
  Animated.sequence([
    Animated.timing(ticket!, { toValue: 1, duration: DURATION.reveal, easing: EASING.enter, useNativeDriver: true }),
    Animated.timing(star!, { toValue: 1, duration: 450, easing: EASING.enter, useNativeDriver: true }),
  ]);

function Learn() {
  const [star, ticket] = useRunOnce(2, popStar);
  return (
    <Disc tone="raised">
      <Animated.View style={[styles.ticket, { opacity: ticket!, transform: [{ translateY: ticket!.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
        {[0, 1, 2, 3].map((cell) => (
          <View key={cell} style={styles.codeCell} />
        ))}
      </Animated.View>
      <Animated.View style={[styles.star, { opacity: star!, transform: [{ scale: star!.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.2, 1.18, 1] }) }] }]}>
        <Text allowFontScaling={false} style={styles.starGlyph}>
          ★
        </Text>
      </Animated.View>
    </Disc>
  );
}

/** Hình của một thẻ, thu nhỏ theo `size` (dp) để vừa màn hình thấp. */
export function IntroArt({ kind, size = ART_SIZE }: { kind: ArtKind; size?: number }) {
  const scale = size / ART_SIZE;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: ART_SIZE, height: ART_SIZE, transform: [{ scale }] }}>
        {kind === 'discover' ? <Discover /> : kind === 'narration' ? <Narration /> : kind === 'model' ? <Pavilion /> : <Learn />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { width: ART_SIZE, height: ART_SIZE, borderRadius: ART_SIZE / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { ...StyleSheet.absoluteFill, borderRadius: ART_SIZE / 2, borderWidth: 5, borderColor: BRAND.gold },
  mapLine: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: BRAND.gold, opacity: 0.55 },
  pinShadow: { position: 'absolute', bottom: 38, width: 40, height: 10, borderRadius: 20, backgroundColor: BRAND.navy, opacity: 0.25 },
  pin: { position: 'absolute', bottom: 40, width: 46, height: 66, alignItems: 'center' },
  pinHead: { position: 'absolute', top: 0, width: 46, height: 46, borderRadius: 23, backgroundColor: BRAND.red, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: BRAND.cream },
  pinTail: { position: 'absolute', top: 28, width: 28, height: 28, backgroundColor: BRAND.red, transform: [{ rotate: '45deg' }], borderBottomRightRadius: 4 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 90 },
  bar: { width: 16, borderRadius: 8, backgroundColor: BRAND.gold },
  pavilion: { alignItems: 'center', marginTop: 10 },
  roof: { height: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: BRAND.navy, alignItems: 'center', justifyContent: 'center' },
  roofLine: { height: 2, backgroundColor: BRAND.gold },
  body: { backgroundColor: BRAND.red, alignItems: 'center', justifyContent: 'flex-end' },
  gate: { width: 30, height: 26, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: BRAND.cream },
  window: { position: 'absolute', bottom: 0, width: 14, height: 24, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: BRAND.navy },
  step: { height: 3, marginTop: 4, borderRadius: 2, backgroundColor: BRAND.gold },
  ticket: { position: 'absolute', bottom: 38, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, backgroundColor: BRAND.cream },
  codeCell: { width: 20, height: 24, borderRadius: 5, backgroundColor: BRAND.navy },
  star: { position: 'absolute', top: 14, alignItems: 'center', justifyContent: 'center' },
  starGlyph: { fontSize: 74, lineHeight: 86, color: BRAND.gold, includeFontPadding: false },
});
