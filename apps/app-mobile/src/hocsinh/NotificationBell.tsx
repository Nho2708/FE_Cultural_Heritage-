import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useStudentNotifications } from './queries';

// Nút Thông báo trên thanh tiêu đề của chế độ Học sinh: số thông báo chưa đọc, chạm mở màn hình Thông báo.

export function NotificationBell() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const unread = useStudentNotifications().data?.unreadCount ?? 0;
  return (
    <Pressable
      onPress={() => router.push('/thong-bao')}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('hs.notifications.bellUnread', { count: unread }) : t('hs.notifications.title')}
      hitSlop={8}
      style={{ marginRight: 14, padding: 6 }}
    >
      <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={24} color={theme.color.onBackground} />
      {unread > 0 ? (
        <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: theme.color.primary }}>
          <Text allowFontScaling={false} style={{ color: theme.color.onPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
