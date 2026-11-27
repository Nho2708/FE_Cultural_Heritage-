import { formatDateTime } from '@dsvhvn/dung-chung';
import type { StudentNotification } from '@dsvhvn/dung-chung/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Button, Card, EmptyState, ErrorState, Loading, Notice, Txt, styles as ui } from '../src/components/ui';
import { useStudentNotifications } from '../src/hocsinh/queries';
import { serverErrorText } from '../src/hocsinh/serverErrorText';
import { useAuth, useServices } from '../src/state/AppProvider';
import { useTheme } from '../src/theme/ThemeProvider';

// Thông báo của em: bài học, bài kiểm tra thầy cô giao cho lớp, mới nhất trước. Chạm một thông báo thì đánh dấu đã đọc và mở bài ngay, không phải gõ mã.

export default function Notifications() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { studentApi } = useServices();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const query = useStudentNotifications();
  const [failure, setFailure] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['student', session?.user.id ?? null, 'notifications'] });

  const open = async (item: StudentNotification) => {
    setFailure(null);
    try {
      if (!item.isRead) await studentApi.markNotificationRead(item.id);
      await refresh();
      if (item.quizId) router.push({ pathname: '/kiem-tra/[quizId]', params: { quizId: String(item.quizId) } });
      else if (item.lessonCode) router.push({ pathname: '/bai-hoc/[ma]', params: { ma: item.lessonCode } });
    } catch (error) {
      setFailure(serverErrorText(error, t('hs.common.error')));
    }
  };

  const readAll = async () => {
    setFailure(null);
    try {
      await studentApi.markAllNotificationsRead();
      await refresh();
    } catch (error) {
      setFailure(serverErrorText(error, t('hs.common.error')));
    }
  };

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState message={t('hs.common.error')} retryLabel={t('hs.common.retry')} onRetry={() => void query.refetch()} />;

  const { items, unreadCount } = query.data;
  return (
    <ScrollView
      style={{ backgroundColor: theme.color.background }}
      contentContainerStyle={{ padding: theme.spacing.inline, gap: 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.color.primary} />}
    >
      {failure ? <Notice tone="error" text={failure} /> : null}
      {unreadCount > 0 ? <Button label={t('hs.notifications.readAll')} variant="secondary" onPress={() => void readAll()} /> : null}
      {items.length === 0 ? <EmptyState message={t('hs.notifications.empty')} /> : null}
      {items.map((item) => (
        <Card key={item.id} onPress={() => void open(item)} accessibilityLabel={item.title}>
          <View style={{ padding: 14, gap: 4 }}>
            <View style={[ui.row, { gap: 8 }]}>
              {item.isRead ? null : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.color.primary }} />}
              <Txt variant="title" style={ui.grow}>
                {item.title}
              </Txt>
            </View>
            <Txt>{item.body}</Txt>
            {item.createdAt ? <Txt variant="caption">{formatDateTime(item.createdAt)}</Txt> : null}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
