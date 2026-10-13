import { formatDate } from '@dsvhvn/dung-chung';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Card, Divider, Section, Txt } from '../components/ui';
import { useAuth } from '../state/AppProvider';
import { prefs } from '../storage/keyValue';
import { useTheme } from '../theme/ThemeProvider';
import { readRecentLessons, type RecentLesson } from './recentLessons';

// "Mã em đã mở gần đây trên máy này" ở màn hình Nhập mã: chạm một mã để mở lại bài, không phải gõ. Đọc lại mỗi khi màn hình hiện ra (em vừa mở một bài khác rồi quay lại).

export function RecentCodes() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [items, setItems] = useState<RecentLesson[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (userId === undefined) return undefined;
      let cancelled = false;
      void readRecentLessons(prefs, userId).then((list) => {
        if (!cancelled) setItems(list);
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  if (items.length === 0) return null;
  return (
    <Section title={t('hs.code.recent')}>
      <Card>
        {items.map((item, index) => (
          <View key={item.code}>
            {index > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.code} ${item.title}`} onPress={() => router.push({ pathname: '/bai-hoc/[ma]', params: { ma: item.code } })}>
              <View style={{ padding: 14, gap: 2, minHeight: theme.touchTarget }}>
                <Txt variant="label" color={theme.color.primary}>
                  {item.code}
                </Txt>
                <Txt numberOfLines={2}>{item.title}</Txt>
                <Txt variant="caption">{t('hs.code.lastOpened', { date: formatDate(item.openedAt) })}</Txt>
              </View>
            </Pressable>
          </View>
        ))}
      </Card>
    </Section>
  );
}
