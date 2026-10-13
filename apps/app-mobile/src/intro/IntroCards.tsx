import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DURATION, EASING } from '../motion/tokens';
import { useReducedMotion } from '../motion/useReducedMotion';
import { IntroArt, type ArtKind } from './Illustrations';
import { BRAND } from './palette';

// Bốn thẻ giới thiệu ứng dụng. Không tự chuyển: người dùng vuốt ngang hoặc bấm "Tiếp". "Bỏ qua" có ở mọi thẻ; thẻ cuối có "Bắt đầu".
// Bật giảm chuyển động thì đổi thẻ chỉ mờ dần 150 ms (không trượt). Chữ nằm trong vùng cuộn nên cỡ chữ hệ thống 130% ở màn hình rộng 320 dp vẫn đọc đủ,
// còn nút và chấm bước luôn nằm dưới đáy màn hình.

export const INTRO_CARDS: ReadonlyArray<{ key: 'discover' | 'narration' | 'model' | 'learn'; art: ArtKind }> = [
  { key: 'discover', art: 'discover' },
  { key: 'narration', art: 'narration' },
  { key: 'model', art: 'model' },
  { key: 'learn', art: 'learn' },
];

const SWIPE_DISTANCE = 40;

export function IntroCards({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [nav, setNav] = useState({ index: 0, direction: 1, moved: false });
  const [transition] = useState(() => new Animated.Value(1));
  const { index } = nav;
  const total = INTRO_CARDS.length;
  const last = index === total - 1;
  const card = INTRO_CARDS[index]!;
  // Màn hình thấp thì thu nhỏ hình để chữ còn chỗ.
  const artSize = Math.min(176, Math.max(112, Math.round(height * 0.24)));

  const go = useCallback((step: number) => {
    setNav((current) => {
      const target = current.index + step;
      if (target < 0 || target >= INTRO_CARDS.length) return current;
      return { index: target, direction: step, moved: true };
    });
  }, []);

  useEffect(() => {
    // Thẻ đầu hiện sẵn, chưa có chuyển thẻ nào.
    if (!nav.moved) return;
    transition.setValue(0);
    const animation = Animated.timing(transition, {
      toValue: 1,
      duration: reduced ? DURATION.reducedFade : DURATION.reveal,
      easing: reduced ? EASING.fade : EASING.enter,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [nav, reduced, transition]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx <= -SWIPE_DISTANCE) go(1);
          else if (gesture.dx >= SWIPE_DISTANCE) go(-1);
        },
      }),
    [go],
  );

  const shift = reduced ? 0 : 28 * nav.direction;
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('intro.skip')} onPress={onClose} hitSlop={8} style={styles.skip}>
          <Text style={styles.skipText}>{t('intro.skip')}</Text>
        </Pressable>
      </View>

      <View style={styles.cardArea} {...pan.panHandlers}>
        <Animated.View
          key={card.key}
          style={[styles.flex, { opacity: transition, transform: [{ translateX: transition.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] }) }] }]}
        >
          <ScrollView contentContainerStyle={styles.cardContent} accessibilityRole="list">
            <IntroArt kind={card.art} size={artSize} />
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={styles.title}>
                {t(`intro.${card.key}.title`)}
              </Text>
              <Text style={styles.text}>{t(`intro.${card.key}.text`)}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={t('intro.step', { current: index + 1, total })} style={styles.dots}>
          {INTRO_CARDS.map((item, position) => (
            <View key={item.key} style={[styles.dot, position === index ? styles.dotActive : null]} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={last ? t('intro.start') : t('intro.next')}
          onPress={() => (last ? onClose() : go(1))}
          style={({ pressed }) => [styles.primary, pressed ? { opacity: 0.85 } : null]}
        >
          <Text style={styles.primaryText}>{last ? t('intro.start') : t('intro.next')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.navy },
  flex: { flex: 1 },
  header: { alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8 },
  skip: { minHeight: 48, minWidth: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: BRAND.cream, fontSize: 16, fontWeight: '600' },
  cardArea: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  cardContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, gap: 24 },
  copy: { gap: 12, alignItems: 'center', alignSelf: 'stretch' },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
  text: { color: BRAND.cream, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  footer: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.cream, opacity: 0.4 },
  dotActive: { width: 24, backgroundColor: BRAND.gold, opacity: 1 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: BRAND.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  primaryText: { color: BRAND.navy, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
