import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DURATION, EASING } from '../motion/tokens';
import { useReducedMotion } from '../motion/useReducedMotion';
import { IntroPhoto, WelcomeMark, type PhotoKind } from './Illustrations';
import { BRAND } from './palette';

// Năm thẻ giới thiệu ứng dụng: thẻ chào mừng (biểu tượng DiViet chạy một lần, tên, khẩu hiệu) rồi bốn thẻ chức năng, mỗi thẻ một ảnh di sản thật.
// Không tự chuyển: người dùng vuốt ngang hoặc bấm "Tiếp". "Bỏ qua" có ở mọi thẻ; thẻ cuối có "Bắt đầu".
// Bật giảm chuyển động thì đổi thẻ chỉ mờ dần 150 ms (không trượt). Chữ nằm trong vùng cuộn nên cỡ chữ hệ thống 130% ở màn hình rộng 320 dp vẫn đọc đủ,
// còn nút và chấm bước luôn nằm dưới đáy màn hình. Ảnh và biểu tượng thu nhỏ theo chiều cao màn hình để chữ còn chỗ.

export const INTRO_CARDS: ReadonlyArray<'welcome' | PhotoKind> = ['welcome', 'discover', 'narration', 'model', 'learn'];

const SWIPE_DISTANCE = 40;

export function IntroCards({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [nav, setNav] = useState({ index: 0, direction: 1, moved: false });
  const [transition] = useState(() => new Animated.Value(1));
  const { index } = nav;
  const total = INTRO_CARDS.length;
  const last = index === total - 1;
  const card = INTRO_CARDS[index]!;
  // Ảnh vuông vừa bề ngang (trừ lề 24 dp hai bên), không quá 340 dp; chiều cao chừa đủ cho nút "Bỏ qua", chân trang, huy hiệu và khoảng 200 dp chữ
  // (tăng theo cỡ chữ hệ thống), nhỏ nhất 120 dp. Biểu tượng chào mừng thu theo chiều cao màn hình.
  const reserved = insets.top + insets.bottom + 56 + 112 + 48 + 200 * Math.max(1, fontScale);
  const photoSize = Math.round(Math.max(120, Math.min(Math.min(width, 520) - 48, 340, height - reserved)));
  const markWidth = Math.round(Math.min(220, Math.max(140, height * 0.26)));

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
          key={card}
          style={[styles.flex, { opacity: transition, transform: [{ translateX: transition.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] }) }] }]}
        >
          <ScrollView contentContainerStyle={styles.cardContent} accessibilityRole="list">
            {card === 'welcome' ? (
              <>
                <WelcomeMark width={markWidth} />
                <View style={styles.copy}>
                  {/* Tên DiViet không dịch theo ngôn ngữ. */}
                  <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.wordmark}>
                    DiViet
                  </Text>
                  <Text style={styles.tagline}>{t('tagline')}</Text>
                  <Text style={styles.text}>{t('intro.welcome.text')}</Text>
                </View>
              </>
            ) : (
              <>
                <IntroPhoto kind={card} size={photoSize} />
                <View style={styles.copy}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {t(`intro.${card}.title`)}
                  </Text>
                  <Text style={styles.text}>{t(`intro.${card}.text`)}</Text>
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={t('intro.step', { current: index + 1, total })} style={styles.dots}>
          {INTRO_CARDS.map((item, position) => (
            <View key={item} style={[styles.dot, position === index ? styles.dotActive : null]} />
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
  cardContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, gap: 20 },
  copy: { gap: 12, alignItems: 'center', alignSelf: 'stretch' },
  wordmark: { color: BRAND.cream, fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  tagline: { color: BRAND.redLight, fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center', marginTop: -4 },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
  text: { color: BRAND.cream, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  footer: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.cream, opacity: 0.4 },
  dotActive: { width: 24, backgroundColor: BRAND.redLight, opacity: 1 },
  primary: { minHeight: 52, borderRadius: 14, backgroundColor: BRAND.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
