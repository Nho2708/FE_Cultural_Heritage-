import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { EASING } from './tokens';
import { useReducedMotion } from './useReducedMotion';

// Biểu tượng DiViet bản nền tối (mái đình che quyển sách mở) chạy một lần, dựng từ bốn lớp ảnh cùng khung 840 × 600 (nóc, mái, hai trang sách) xếp chồng,
// cùng nhịp với logo chuyển động của web:
//   0–450 ms     hai trang sách mở ra từ gáy (phóng ngang từ 15% lên 100%, gáy nằm đúng giữa ảnh), hiện dần trong 200 ms đầu;
//   250–850 ms   mái đình rơi xuống, vượt nhẹ rồi về chỗ;
//   550–1050 ms  nóc rơi xuống cùng kiểu.
// Bật giảm chuyển động thì biểu tượng đứng yên ở trạng thái cuối. Dùng ở màn hình chờ trong app và thẻ chào mừng của phần giới thiệu.
// Ảnh chỉ để trang trí: các lớp không đọc được bằng trình đọc màn hình, nơi dùng tự viết tên "DiViet" bằng chữ.

/** Tỉ lệ cao trên rộng của khung bốn lớp ảnh. */
export const LOGO_MARK_RATIO = 600 / 840;

const PAGE_LEFT = require('../../assets/images/lop-sach-trai.png');
const PAGE_RIGHT = require('../../assets/images/lop-sach-phai.png');
const ROOF = require('../../assets/images/lop-mai.png');
const RIDGE = require('../../assets/images/lop-noc.png');

export function LogoMark({ width }: { width: number }) {
  const reduced = useReducedMotion();
  const height = width * LOGO_MARK_RATIO;
  /** Một đơn vị của khung vẽ 256 × 256 tính ra dp (phần nhìn thấy rộng 224 đơn vị). */
  const unit = width / 224;
  const [pageGrow] = useState(() => new Animated.Value(0.15));
  const [pageFade] = useState(() => new Animated.Value(0));
  const [roofDrop] = useState(() => new Animated.Value(-28 * unit));
  const [roofFade] = useState(() => new Animated.Value(0));
  const [ridgeDrop] = useState(() => new Animated.Value(-20 * unit));
  const [ridgeFade] = useState(() => new Animated.Value(0));

  // Khoảng 1,1 giây. Mái và nóc rơi xuống nhanh dần, vượt chỗ cũ chút ít (2 và 1,5 đơn vị) rồi về chỗ bằng đường cong expo-out.
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
        Animated.timing(value, { toValue: overshoot * unit, duration: 360, delay, easing: EASING.drop, useNativeDriver: true }),
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
  }, [reduced, unit, pageGrow, pageFade, roofDrop, roofFade, ridgeDrop, ridgeFade]);

  const layer = { width, height };
  return (
    <View style={{ width, height }}>
      <Animated.Image source={PAGE_LEFT} accessible={false} resizeMode="contain" style={[styles.layer, layer, { opacity: pageFade, transform: [{ scaleX: pageGrow }] }]} />
      <Animated.Image source={PAGE_RIGHT} accessible={false} resizeMode="contain" style={[styles.layer, layer, { opacity: pageFade, transform: [{ scaleX: pageGrow }] }]} />
      <Animated.Image source={ROOF} accessible={false} resizeMode="contain" style={[styles.layer, layer, { opacity: roofFade, transform: [{ translateY: roofDrop }] }]} />
      <Animated.Image source={RIDGE} accessible={false} resizeMode="contain" style={[styles.layer, layer, { opacity: ridgeFade, transform: [{ translateY: ridgeDrop }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0 },
});
