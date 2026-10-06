import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { useApp } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Chế độ Khách tham quan: bốn tab (Trang chủ, Tìm kiếm, Bản đồ, Lịch sử và cài đặt). Không cần đăng nhập; vào nhầm khi đang ở chế độ Học sinh thì về điểm vào.

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
  };
}

export default function GuestLayout() {
  const { mode } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  if (mode !== 'guest') return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.background },
        headerTitleStyle: { color: theme.color.onBackground, fontWeight: '700' },
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.color.surface, borderTopColor: theme.color.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.color.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="tim-kiem" options={{ title: t('tabs.search'), tabBarIcon: icon('search-outline', 'search') }} />
      <Tabs.Screen name="ban-do" options={{ title: t('tabs.map'), tabBarIcon: icon('map-outline', 'map') }} />
      <Tabs.Screen name="lich-su" options={{ title: t('tabs.history'), tabBarIcon: icon('time-outline', 'time') }} />
    </Tabs>
  );
}
