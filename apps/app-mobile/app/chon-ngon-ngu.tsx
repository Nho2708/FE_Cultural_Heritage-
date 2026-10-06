import { LANGUAGES } from '@dsvhvn/dung-chung/i18n';
import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notice, Screen, Txt } from '../src/components/ui';
import { useApp } from '../src/state/AppProvider';
import { useTheme } from '../src/theme/ThemeProvider';

// Lần mở đầu: chọn một trong năm ngôn ngữ. Ngôn ngữ của máy được chọn sẵn nếu thuộc năm ngôn ngữ, không thì tiếng Anh. Bản tiếng Hàn, Trung, Nhật là bản dịch máy
// nên có ghi chú. Đổi lại được trong Cài đặt của chế độ Khách.

export default function ChooseLanguage() {
  const { language, chooseLanguage, chosenLanguage, mode } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pick = (code: LanguageCode) => {
    chooseLanguage(code);
    // Vào từ Cài đặt thì quay lại; lần mở đầu thì sang bước chọn chế độ.
    if (router.canGoBack()) router.back();
    else router.replace(mode ? '/' : '/chon-che-do');
  };

  return (
    <Screen style={{ paddingTop: insets.top + 24 }}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { borderWidth: 2, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', gap: 2 },
});
