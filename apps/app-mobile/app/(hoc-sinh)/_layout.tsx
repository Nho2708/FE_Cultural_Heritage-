import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuardRedirect } from '../../src/components/GuardRedirect';
import { entryHref } from '../../src/navigation/entry';
import { STUDENT_TABS } from '../../src/navigation/tabs';
import { useApp, useAuth } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Chế độ Học sinh: năm tab (Trang học, Nhập mã, Khám phá, Tiến độ, Của em), bố cục và màu theo cấp học của lớp. Chưa đăng nhập hoặc phiên đã hết thì về màn hình Đăng nhập;
// còn bị buộc đổi mật khẩu thì về màn hình Đổi mật khẩu (không đi tiếp được).

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
  };
}

export default function StudentLayout() {
  const { chosenLanguage, mode } = useApp();
  const { session } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const entry = entryHref({ chosenLanguage, mode, hasSession: Boolean(session), mustChangePassword: Boolean(session?.user.mustChangePassword) });
  if (mode !== 'student' || !session || session.user.mustChangePassword) return <GuardRedirect href={entry} />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.background },
        headerTitleStyle: { color: theme.color.onBackground, fontWeight: '700', fontSize: theme.text.bodySize + 2 },
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.color.surface, borderTopColor: theme.color.border, height: Math.max(68, theme.touchTarget + 22) + insets.bottom, paddingBottom: insets.bottom + 8, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: theme.level === 1 ? 14 : 12, lineHeight: theme.level === 1 ? 17 : 15, fontWeight: "700" },
        sceneStyle: { backgroundColor: theme.color.background },
      }}
    >
      {STUDENT_TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.title), tabBarLabel: tab.label ? t(tab.label) : undefined, tabBarIcon: icon(tab.icon, tab.focusedIcon) }} />
      ))}
    </Tabs>
  );
}
