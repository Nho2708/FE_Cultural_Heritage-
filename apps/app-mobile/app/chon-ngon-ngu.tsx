import { LANGUAGES } from '@dsvhvn/dung-chung/i18n';
import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notice, Screen, Txt } from '../src/components/ui';
import { BRAND } from '../src/intro/palette';
import { useApp } from '../src/state/AppProvider';
import { useTheme } from '../src/theme/ThemeProvider';

// Lần mở đầu: chọn một trong năm ngôn ngữ. Ngôn ngữ của máy được chọn sẵn nếu thuộc năm ngôn ngữ, không thì tiếng Anh. Bản tiếng Hàn, Trung, Nhật là bản dịch máy
// nên có ghi chú. Đổi lại được trong Cài đặt của chế độ Khách.
// Đầu màn hình là dải xanh than nối tiếp màn hình chờ: biểu tượng bản nền tối, tên "DiViet" (không dịch) và khẩu hiệu theo ngôn ngữ đang dùng.

export default function ChooseLanguage() {
  const { language, chooseLanguage, chosenLanguage } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pick = (code: LanguageCode) => {
    chooseLanguage(code);
    // Vào từ Cài đặt thì quay lại; lần mở đầu thì để điểm vào chọn bước kế (thẻ giới thiệu rồi chọn chế độ).
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen flush>
      <StatusBar style="light" />
      <View style={[styles.brand, { paddingTop: insets.top + 28 }]}>
        <Image source={require('../assets/images/bieu-tuong-nen-toi.png')} accessible={false} resizeMode="contain" style={styles.logo} />
        <View style={styles.brandText}>
          <Text maxFontSizeMultiplier={1.3} style={styles.brandName}>
            DiViet
          </Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>
      </View>
      <View style={[styles.body, { paddingHorizontal: theme.spacing.inline, gap: theme.spacing.block }]}>
        <View style={{ gap: 8 }}>
          <Txt variant="heading" accessibilityRole="header">
            {t('language.title')}
          </Txt>
          <Txt muted>{t('language.subtitle')}</Txt>
        </View>
        <View style={{ gap: 10 }}>
          {LANGUAGES.map((option) => {
            const selected = (chosenLanguage ?? language) === option.code;
            return (
              <Pressable
                key={option.code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.nativeName}
                onPress={() => pick(option.code)}
                style={[
                  styles.option,
                  {
                    minHeight: Math.max(56, theme.touchTarget + 8),
                    borderRadius: theme.radius.card,
                    borderColor: selected ? theme.color.primary : theme.color.border,
                    backgroundColor: selected ? theme.color.primaryContainer : theme.color.surface,
                  },
                ]}
              >
                <Txt variant="title">{option.nativeName}</Txt>
                {option.isMachineOnly ? (
                  <Txt variant="caption" muted>
                    {t('language.machineLabel')}
                  </Txt>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Notice text={t('language.machineNote')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    backgroundColor: BRAND.navy,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 14,
  },
  logo: { width: 120, height: 85 },
  brandText: { alignItems: 'center', gap: 4 },
  brandName: { color: BRAND.cream, fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  tagline: { color: BRAND.cream, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  body: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  option: { borderWidth: 2, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', gap: 2 },
});
