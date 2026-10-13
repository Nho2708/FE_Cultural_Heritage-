import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuardRedirect } from '../../src/components/GuardRedirect';
import { entryHref } from '../../src/navigation/entry';
import { GUEST_TABS } from '../../src/navigation/tabs';
import { useApp, useAuth } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Chế độ Khách tham quan: năm tab (Trang chủ, Tìm kiếm, Bản đồ, Dòng thời gian, Lịch sử và cài đặt). Không cần đăng nhập; vào nhầm khi đang ở chế độ Học sinh thì về điểm vào.

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
  };
}

export default function GuestLayout() {
  const { chosenLanguage, mode } = useApp();
  const { session } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (mode !== 'guest') return <GuardRedirect href={entryHref({ chosenLanguage, mode, hasSession: Boolean(session), mustChangePassword: Boolean(session?.user.mustChangePassword) })} />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.background },
        headerTitleStyle: { color: theme.color.onBackground, fontWeight: '700' },
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.color.surface, borderTopColor: theme.color.border, height: 68 + insets.bottom, paddingBottom: insets.bottom + 8, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 15, fontWeight: "600" },
        sceneStyle: { backgroundColor: theme.color.background },
      }}
    >
      {GUEST_TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.title), tabBarLabel: tab.label ? t(tab.label) : undefined, tabBarIcon: icon(tab.icon, tab.focusedIcon) }} />
      ))}
    </Tabs>
  );
}
