import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { useApp, useAuth } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Chế độ Học sinh: bốn tab (Trang học, Nhập mã, Tiến độ, Của em), bố cục và màu theo cấp học của lớp. Chưa đăng nhập hoặc phiên đã hết thì về màn hình Đăng nhập;
// còn bị buộc đổi mật khẩu thì về màn hình Đổi mật khẩu (không đi tiếp được).

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
  };
}

export default function StudentLayout() {
  const { mode } = useApp();
  const { session } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  if (mode !== 'student') return <Redirect href="/" />;
  if (!session) return <Redirect href="/dang-nhap" />;
  if (session.user.mustChangePassword) return <Redirect href="/doi-mat-khau" />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.background },
        headerTitleStyle: { color: theme.color.onBackground, fontWeight: '700', fontSize: theme.text.bodySize + 2 },
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.color.surface, borderTopColor: theme.color.border, minHeight: theme.touchTarget + 12 },
        tabBarLabelStyle: { fontSize: theme.level === 1 ? 14 : 12, fontWeight: '700' },
        sceneStyle: { backgroundColor: theme.color.background },
      }}
    >
      <Tabs.Screen name="hoc" options={{ title: t('hs.tabs.learn'), tabBarIcon: icon('school-outline', 'school') }} />
      <Tabs.Screen name="nhap-ma" options={{ title: t('hs.tabs.code'), tabBarIcon: icon('key-outline', 'key') }} />
      <Tabs.Screen name="tien-do" options={{ title: t('hs.tabs.progress'), tabBarIcon: icon('star-outline', 'star') }} />
      <Tabs.Screen name="cua-em" options={{ title: t('hs.tabs.account'), tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
