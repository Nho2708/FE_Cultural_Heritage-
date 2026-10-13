import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { HistoryProvider } from '../src/guest/HistoryProvider';
import { AppProvider, useApp } from '../src/state/AppProvider';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

// Gốc của app: bộ nhớ đệm truy vấn, vùng an toàn, trạng thái toàn app (nạp từ máy), bộ giao diện theo cấp học. Trong lúc nạp hiện màn hình chờ.

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#A4231F" />
    </View>
  );
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
        <Stack.Screen name="chon-che-do" options={{ headerShown: false }} />
        <Stack.Screen name="(khach)" options={{ headerShown: false }} />
        <Stack.Screen name="(hoc-sinh)" options={{ headerShown: false }} />
        <Stack.Screen name="dang-nhap" options={{ headerShown: false }} />
        <Stack.Screen name="doi-mat-khau" options={{ headerShown: false }} />
        <Stack.Screen name="di-san/[slug]/index" options={{ title: '' }} />
        <Stack.Screen name="di-san/[slug]/dong-thoi-gian" options={{ title: t('timeline.title') }} />
        <Stack.Screen name="di-san/[slug]/3d" options={{ title: t('model.title') }} />
        <Stack.Screen name="goi-y" options={{ title: t('home.recommended') }} />
        <Stack.Screen name="tim-kiem-di-san" options={{ title: t('search.title') }} />
        <Stack.Screen name="dong-thoi-gian-di-san" options={{ title: t('timeline.title') }} />
        <Stack.Screen name="ban-do-di-san" options={{ title: t('map.title') }} />
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
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppProvider fallback={<Splash />}>
          <ThemeProvider>
            <HistoryProvider>
              <Navigation />
            </HistoryProvider>
          </ThemeProvider>
        </AppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});
