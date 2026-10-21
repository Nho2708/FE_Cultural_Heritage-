import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text } from 'react-native';
import { APP_CHANNEL } from '../config/env';
import { BRAND } from '../intro/palette';
import { DURATION, EASING } from './tokens';
import { useReducedMotion } from './useReducedMotion';

// Màn hình chờ trong app: nối liền với màn hình chờ gốc (cùng nền xanh than, cùng huy hiệu rộng 180 dp ở giữa) rồi chạy bản logo ngắn: đĩa phóng từ 92% lên 100%
// và mờ dần vào, huy hiệu nhích lên. Không có thời gian chờ giả: nạp xong sớm thì phần ra (mờ dần 300 ms) chạy ngay. Bật giảm chuyển động thì huy hiệu đứng yên.
// Huy hiệu không còn chữ nên tên "DiViet" viết dưới huy hiệu (đặt tuyệt đối, huy hiệu vẫn nằm đúng chỗ của màn hình chờ gốc).
// Phủ lên toàn app (app dựng ngay bên dưới) và tự gỡ khi mờ xong.

export const SPLASH_BACKGROUND = '#292B38';
// Android 12 trở lên chỉ hiện biểu tượng màn hình chờ gốc trong vùng 192 dp (máy Xiaomi cắt vuông), nên huy hiệu tròn để 180 dp cho vành vàng không bị cụt;
// phải khớp imageWidth của expo-splash-screen trong app.json.
const EMBLEM_SIZE = 180;
const EMBLEM = require('../../assets/images/splash-icon.png');

// Giữ màn hình chờ gốc cho tới khi màn hình chờ trong app đã vẽ xong khung đầu, để không nháy nền trống giữa hai màn.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
// Expo Go dùng màn hình chờ riêng của nó và báo cảnh báo khi app đặt tuỳ chọn này, nên chỉ đặt ở bản dựng thật.
if (APP_CHANNEL !== 'expo-go') {
  try {
    SplashScreen.setOptions({ duration: 300, fade: true });
  } catch {
    // Web không có tuỳ chọn này.
  }
}

function hideNativeSplash() {
  void SplashScreen.hideAsync().catch(() => undefined);
}

export function BrandSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [fade] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.92));
  const [rise] = useState(() => new Animated.Value(10));
  const [leave] = useState(() => new Animated.Value(0));
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  // Phần vào: 1,2 giây gồm đĩa phóng lên + mờ dần vào và huy hiệu nhích lên (đường cong expo-out).
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      fade.setValue(1);
      scale.setValue(1);
      rise.setValue(0);
      return;
    }
    const enter = Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 300, easing: EASING.fade, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 700, delay: 100, easing: EASING.enter, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 800, delay: 200, easing: EASING.enter, useNativeDriver: true }),
    ]);
    enter.start();
    return () => enter.stop();
  }, [reduced, fade, scale, rise]);

  // Phần ra: ngay khi nạp xong, không đợi phần vào chạy hết.
  useEffect(() => {
    if (!ready || reduced === null) return;
    if (reduced) {
      finish();
      return;
    }
    const exit = Animated.timing(leave, { toValue: 1, duration: DURATION.splashExit, easing: EASING.exit, useNativeDriver: true });
    exit.start(({ finished }) => {
      if (finished) finish();
    });
    return () => exit.stop();
  }, [ready, reduced, leave, finish]);

  // Phòng khi khung đầu không được vẽ: không để màn hình chờ gốc che app mãi.
  useEffect(() => {
    const timer = setTimeout(hideNativeSplash, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      accessibilityElementsHidden={ready}
      importantForAccessibility={ready ? 'no-hide-descendants' : 'auto'}
      style={[styles.overlay, { opacity: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
    >
      <StatusBar style="light" />
      <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }, { scale }] }} onLayout={hideNativeSplash}>
        <Image source={EMBLEM} accessible={false} style={styles.emblem} resizeMode="contain" />
        <Text style={styles.name}>DiViet</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: SPLASH_BACKGROUND },
  emblem: { width: EMBLEM_SIZE, height: EMBLEM_SIZE },
  name: { position: 'absolute', top: EMBLEM_SIZE + 20, left: -60, width: EMBLEM_SIZE + 120, textAlign: 'center', color: BRAND.cream, fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
