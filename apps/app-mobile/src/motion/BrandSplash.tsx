import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { APP_CHANNEL } from '../config/env';
import { DURATION, EASING } from './tokens';
import { useReducedMotion } from './useReducedMotion';

// Màn hình chờ trong app: nối liền với màn hình chờ gốc (cùng nền xanh than, cùng biểu tượng bản nền tối rộng 180 dp ở giữa) rồi chạy bản logo ngắn, dựng từ bốn lớp ảnh
// cùng khung (nóc, mái, hai trang sách) xếp chồng, cùng nhịp với logo chuyển động của web:
//   0–450 ms     hai trang sách mở ra từ gáy (phóng ngang từ 15% lên 100%, gáy nằm đúng giữa ảnh), hiện dần trong 200 ms đầu;
//   250–850 ms   mái đình rơi xuống, vượt nhẹ rồi về chỗ;
//   550–1050 ms  nóc rơi xuống cùng kiểu.
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
const MARK_HEIGHT = (MARK_WIDTH * 600) / 840;
/** Một đơn vị của khung vẽ 256 × 256 tính ra dp (phần nhìn thấy rộng 224 đơn vị). */
const UNIT = MARK_WIDTH / 224;
const PAGE_LEFT = require('../../assets/images/lop-sach-trai.png');
const PAGE_RIGHT = require('../../assets/images/lop-sach-phai.png');
const ROOF = require('../../assets/images/lop-mai.png');
const RIDGE = require('../../assets/images/lop-noc.png');

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
  const [pageGrow] = useState(() => new Animated.Value(0.15));
  const [pageFade] = useState(() => new Animated.Value(0));
  const [roofDrop] = useState(() => new Animated.Value(-28 * UNIT));
  const [roofFade] = useState(() => new Animated.Value(0));
  const [ridgeDrop] = useState(() => new Animated.Value(-20 * UNIT));
  const [ridgeFade] = useState(() => new Animated.Value(0));
  const [leave] = useState(() => new Animated.Value(0));
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  // Phần vào: khoảng 1,1 giây. Mái và nóc rơi xuống nhanh dần, vượt chỗ cũ chút ít (2 và 1,5 đơn vị) rồi về chỗ bằng đường cong expo-out.
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      pageGrow.setValue(1);
      pageFade.setValue(1);
      roofDrop.setValue(0);
      roofFade.setValue(1);
      ridgeDrop.setValue(0);
      ridgeFade.setValue(1);
      return;
    }
    const drop = (value: Animated.Value, overshoot: number, delay: number) =>
      Animated.sequence([
        Animated.timing(value, { toValue: overshoot * UNIT, duration: 360, delay, easing: EASING.drop, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 240, easing: EASING.enter, useNativeDriver: true }),
      ]);
    const enter = Animated.parallel([
      Animated.timing(pageGrow, { toValue: 1, duration: 450, easing: EASING.enter, useNativeDriver: true }),
      Animated.timing(pageFade, { toValue: 1, duration: 200, easing: Easing.linear, useNativeDriver: true }),
      drop(roofDrop, 2, 250),
      Animated.timing(roofFade, { toValue: 1, duration: 240, delay: 250, easing: Easing.linear, useNativeDriver: true }),
      drop(ridgeDrop, 1.5, 550),
      Animated.timing(ridgeFade, { toValue: 1, duration: 200, delay: 550, easing: Easing.linear, useNativeDriver: true }),
    ]);
    enter.start();
    return () => enter.stop();
  }, [reduced, pageGrow, pageFade, roofDrop, roofFade, ridgeDrop, ridgeFade]);

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
        <View style={styles.mark}>
          <Animated.Image source={PAGE_LEFT} accessible={false} resizeMode="contain" style={[styles.layer, { opacity: pageFade, transform: [{ scaleX: pageGrow }] }]} />
          <Animated.Image source={PAGE_RIGHT} accessible={false} resizeMode="contain" style={[styles.layer, { opacity: pageFade, transform: [{ scaleX: pageGrow }] }]} />
          <Animated.Image source={ROOF} accessible={false} resizeMode="contain" style={[styles.layer, { opacity: roofFade, transform: [{ translateY: roofDrop }] }]} />
          <Animated.Image source={RIDGE} accessible={false} resizeMode="contain" style={[styles.layer, { opacity: ridgeFade, transform: [{ translateY: ridgeDrop }] }]} />
        </View>
        <Text style={styles.name}>DiViet</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: SPLASH_BACKGROUND },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, alignItems: 'center', justifyContent: 'center' },
  mark: { width: MARK_WIDTH, height: MARK_HEIGHT },
  layer: { position: 'absolute', top: 0, left: 0, width: MARK_WIDTH, height: MARK_HEIGHT },
  name: { position: 'absolute', top: (FRAME_SIZE + MARK_HEIGHT) / 2 + 20, left: -60, width: FRAME_SIZE + 120, textAlign: 'center', color: NAME_COLOR, fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
