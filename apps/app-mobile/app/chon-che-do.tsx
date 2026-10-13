import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Screen, Txt } from '../src/components/ui';
import { Reveal } from '../src/motion/Reveal';
import { useApp } from '../src/state/AppProvider';
import type { AppMode } from '../src/state/services';
import { useTheme } from '../src/theme/ThemeProvider';

// Chọn chế độ sử dụng: Khách tham quan (không đăng nhập, mã thiết bị ẩn danh, năm ngôn ngữ) hoặc Học sinh (mã học sinh + mật khẩu, chỉ tiếng Việt, không quảng cáo).
// Lần sau mở thẳng chế độ đã chọn; đổi trong Cài đặt.

export default function ChooseMode() {
  const { chooseMode } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pick = (mode: AppMode) => {
    chooseMode(mode);
    router.replace('/');
  };

  return (
    <Screen style={{ paddingTop: insets.top + 24 }}>
      {/* Huy hiệu thương hiệu: tên "Vietnam Heritage" không dịch theo ngôn ngữ. */}
      <Image
        source={require('../assets/images/huy-hieu.png')}
        accessibilityLabel="Vietnam Heritage"
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={{ gap: 8 }}>
        <Txt variant="heading" accessibilityRole="header">
          {t('mode.title')}
        </Txt>
        <Txt muted>{t('mode.subtitle')}</Txt>
      </View>
      {/* Hai thẻ vào lệch nhịp 60 ms (bật giảm chuyển động thì hiện ngay). */}
      <Reveal index={0}>
        <Card>
          <View style={[styles.card, { gap: theme.spacing.inline }]}>
            <Txt variant="title">{t('mode.guestTitle')}</Txt>
            <Txt>{t('mode.guestText')}</Txt>
            <Button label={t('mode.guestTitle')} onPress={() => pick('guest')} full />
          </View>
        </Card>
      </Reveal>
      <Reveal index={1}>
        <Card>
          <View style={[styles.card, { gap: theme.spacing.inline }]}>
            <Txt variant="title">{t('mode.studentTitle')}</Txt>
            <Txt>{t('mode.studentText')}</Txt>
            <Txt variant="caption" muted>
              {t('mode.studentLanguageNote')}
            </Txt>
            <Button label={t('mode.studentTitle')} variant="secondary" onPress={() => pick('student')} full />
          </View>
        </Card>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  logo: { width: 112, height: 112, alignSelf: 'center' },
});
