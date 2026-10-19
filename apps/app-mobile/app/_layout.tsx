import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { HistoryProvider } from '../src/guest/HistoryProvider';
import { BrandSplash, SPLASH_BACKGROUND } from '../src/motion/BrandSplash';
import { AppProvider, useApp } from '../src/state/AppProvider';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

// Gốc của app: bộ nhớ đệm truy vấn, vùng an toàn, trạng thái toàn app (nạp từ máy), bộ giao diện theo cấp học. Trong lúc nạp hiện màn hình chờ
// (huy hiệu trên nền xanh than, nối liền với màn hình chờ gốc); nạp xong thì màn hình chờ mờ dần 300 ms phía trên app.

/** Báo cho gốc biết app đã nạp xong (nằm trong AppProvider nên chỉ được dựng sau khi trạng thái đã nạp). */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

function Navigation() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { mode } = useApp();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.color.background },
          headerTintColor: theme.color.primary,
          headerTitleStyle: { color: theme.color.onBackground, fontWeight: '700' },
          headerBackTitle: t('common.back'),
          contentStyle: { backgroundColor: theme.color.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="chon-ngon-ngu" options={{ headerShown: false }} />
        <Stack.Screen name="gioi-thieu" options={{ headerShown: false }} />
        <Stack.Screen name="chon-che-do" options={{ headerShown: false }} />
        <Stack.Screen name="(khach)" options={{ headerShown: false }} />
        <Stack.Screen name="(hoc-sinh)" options={{ headerShown: false }} />
        <Stack.Screen name="dang-nhap" options={{ headerShown: false }} />
        <Stack.Screen name="doi-mat-khau" options={{ headerShown: false }} />
        <Stack.Screen name="di-san/[slug]/index" options={{ title: '' }} />
        <Stack.Screen name="di-san/[slug]/dong-thoi-gian" options={{ title: t('timeline.title') }} />
        <Stack.Screen name="di-san/[slug]/3d" options={{ title: t('model.title') }} />
        <Stack.Screen name="di-san/[slug]/chi-duong" options={{ title: t('directions.title') }} />
        <Stack.Screen name="goi-y" options={{ title: t('home.recommended') }} />
        <Stack.Screen name="tim-kiem-di-san" options={{ title: t('search.title') }} />
        <Stack.Screen name="dong-thoi-gian-di-san" options={{ title: t('timeline.title') }} />
        <Stack.Screen name="ban-do-di-san" options={{ title: t('map.title') }} />
        <Stack.Screen name="video-gioi-thieu" options={{ title: t('intro.videoTitle') }} />
        <Stack.Screen name="bai-hoc/[ma]/index" options={{ title: mode === 'student' ? t('hs.lesson.title') : '' }} />
        <Stack.Screen name="kiem-tra/[quizId]" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="ket-qua/[luot]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  const [ready, setReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const markReady = useCallback(() => setReady(true), []);
  const hideSplash = useCallback(() => setSplashVisible(false), []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.root}>
          <AppProvider fallback={null}>
            <ThemeProvider>
              <HistoryProvider>
                <Navigation />
              </HistoryProvider>
            </ThemeProvider>
            <ReadySignal onReady={markReady} />
          </AppProvider>
          {splashVisible ? <BrandSplash ready={ready} onDone={hideSplash} /> : null}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SPLASH_BACKGROUND },
});
