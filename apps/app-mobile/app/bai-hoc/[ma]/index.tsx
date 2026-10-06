import { ApiError } from '@dsvhvn/dung-chung/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Button, Loading, Txt, styles as ui } from '../../../src/components/ui';
import { useLessonByCode } from '../../../src/hocsinh/queries';
import { LevelOneLesson, LevelThreeLesson, LevelTwoLesson, type LessonPosition } from '../../../src/hocsinh/LevelLessons';
import { KEYS, prefs } from '../../../src/storage/keyValue';
import { useTheme } from '../../../src/theme/ThemeProvider';

// Bài học theo cấp: mở bằng mã bài học (cùng API với web học tập). Bố cục, luồng học và cách đọc khác nhau ở ba cấp; cấp 1 nhớ bước em đang dừng trên máy này.

function positionKey(code: string) {
  return `${KEYS.lessonPosition}.${code}`;
}

export default function LessonScreen() {
  const { ma } = useLocalSearchParams<{ ma: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const lesson = useLessonByCode(ma);
  const level = lesson.data?.schoolLevel ?? theme.level ?? 2;
  // Vị trí đã nhớ của cấp 1: nạp xong mới dựng bố cục để mở đúng bước đang dừng.
  const [saved, setSaved] = useState<LessonPosition | null | undefined>(undefined);

  useEffect(() => {
    if (!ma || level !== 1) return;
    let cancelled = false;
    void prefs.get(positionKey(ma)).then((raw) => {
      if (cancelled) return;
      try {
        const value: unknown = raw ? JSON.parse(raw) : null;
        const position = value as Partial<LessonPosition> | null;
        setSaved(position && typeof position.step === 'number' && typeof position.part === 'number' ? { step: position.step, part: position.part } : null);
      } catch {
        setSaved(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ma, level]);

  if (lesson.isLoading || (level === 1 && saved === undefined && lesson.data)) return <Loading label={t('hs.common.loading')} />;
  if (lesson.isError || !lesson.data) {
    const message = lesson.error instanceof ApiError ? lesson.error.message : t('hs.common.error');
    return (
      <View style={ui.center}>
        <Txt style={ui.centerText}>{message}</Txt>
        <Button label={t('hs.lesson.backHome')} variant="secondary" onPress={() => router.replace('/(hoc-sinh)/hoc')} style={ui.centerButton} />
        {!(lesson.error instanceof ApiError && lesson.error.status === 404) ? <Button label={t('hs.common.retry')} variant="ghost" onPress={() => void lesson.refetch()} style={ui.centerButton} /> : null}
      </View>
    );
  }
  const data = lesson.data;

  return (
    <ScrollView style={{ backgroundColor: theme.color.background }} contentContainerStyle={{ padding: theme.spacing.inline, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: t('hs.lesson.title') }} />
      {level === 1 ? (
        <LevelOneLesson lesson={data} initial={saved ?? undefined} onPositionChange={(position) => void prefs.set(positionKey(data.accessCode), JSON.stringify(position))} />
      ) : level === 2 ? (
        <LevelTwoLesson lesson={data} />
      ) : (
        <LevelThreeLesson lesson={data} />
      )}
    </ScrollView>
  );
}
