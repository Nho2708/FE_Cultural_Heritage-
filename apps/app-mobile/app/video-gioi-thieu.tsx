import { embedIntroVideoUrl } from '@dsvhvn/dung-chung/embed';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, EmptyState } from '../src/components/ui';
import { WEB_BASE_URL } from '../src/config/env';
import { EmbedWebView } from '../src/embed/EmbedWebView';
import { useApp } from '../src/state/AppProvider';
import { DefaultThemeScope, useTheme } from '../src/theme/ThemeProvider';

// Xem video giới thiệu của khách: trang nhúng của web học tập (chỉ có trình phát video theo ngôn ngữ của app) mở trong WebView, nên video không nằm trong tệp
// cài đặt. App chưa có cơ chế kiểm mạng riêng: WebView báo lỗi tải trang khi mất mạng thì hiện câu "Cần kết nối mạng để xem video" cùng nút thử lại.

export default function IntroVideoPage() {
  return (
    <DefaultThemeScope>
      <IntroVideo />
    </DefaultThemeScope>
  );
}

function IntroVideo() {
  const { t } = useTranslation();
  const { language } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  // Đổi khóa để dựng lại WebView khi thử lại.
  const [attempt, setAttempt] = useState(0);

  if (failed) {
    return (
      <View style={[styles.fill, styles.failed, { backgroundColor: theme.color.background, padding: theme.spacing.inline, gap: theme.spacing.block }]}>
        <EmptyState message={t('intro.videoOffline')} />
        <Button
          label={t('common.retry')}
          onPress={() => {
            setFailed(false);
            setAttempt((count) => count + 1);
          }}
        />
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.color.background }]}>
      <EmbedWebView key={attempt} url={embedIntroVideoUrl(WEB_BASE_URL, language)} label={t('intro.videoTitle')} onFail={() => setFailed(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  failed: { justifyContent: 'center' },
});
