import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { APP_CHANNEL } from '../config/env';
import { LOGO_MARK_RATIO, LogoMark } from './LogoMark';
import { DURATION, EASING } from './tokens';
import { useReducedMotion } from './useReducedMotion';

// Màn hình chờ trong app: nối liền với màn hình chờ gốc (cùng nền xanh than, cùng biểu tượng bản nền tối rộng 180 dp ở giữa) rồi chạy bản logo ngắn
// (bốn lớp ảnh: sách mở, mái rơi, nóc rơi; xem LogoMark).
// Không có thời gian chờ giả: nạp xong sớm thì phần ra (mờ dần 300 ms) chạy ngay. Bật giảm chuyển động thì biểu tượng đứng yên.
// Biểu tượng không có chữ nên tên "DiViet" viết dưới biểu tượng (đặt tuyệt đối, biểu tượng vẫn nằm đúng chỗ của màn hình chờ gốc).
// Phủ lên toàn app (app dựng ngay bên dưới) và tự gỡ khi mờ xong.

// Nền xanh than ở cả giao diện sáng và tối của điện thoại: nền kem bị giao diện tối của MIUI tự làm sẫm thành nâu, quyển sách xanh than chìm vào nền.
export const SPLASH_BACKGROUND = '#292B38';
/** Kem của logo, màu sách trên nền tối. */
const NAME_COLOR = '#F4ECDD';
// Khung 180 dp phải khớp imageWidth của expo-splash-screen trong app.json; trong ảnh màn hình chờ gốc (1024 px) biểu tượng rộng 946 px.
// Android 12 trở lên chỉ hiện biểu tượng màn hình chờ gốc trong vùng 192 dp, nên để 180 dp cho mái đao không bị cụt.
const FRAME_SIZE = 180;
const MARK_WIDTH = (FRAME_SIZE * 946) / 1024;
const MARK_HEIGHT = MARK_WIDTH * LOGO_MARK_RATIO;

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
  const [leave] = useState(() => new Animated.Value(0));
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

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
      <View style={styles.frame} onLayout={hideNativeSplash}>
        <LogoMark width={MARK_WIDTH} />
        <Text style={styles.name}>DiViet</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: SPLASH_BACKGROUND },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, alignItems: 'center', justifyContent: 'center' },
  name: { position: 'absolute', top: (FRAME_SIZE + MARK_HEIGHT) / 2 + 20, left: -60, width: FRAME_SIZE + 120, textAlign: 'center', color: NAME_COLOR, fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
