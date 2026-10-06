import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Card, EmptyState, ErrorState, Loading, Screen, Section, Txt, styles as ui } from '../../src/components/ui';
import { percentText, starsText } from '../../src/hocsinh/format';
import { useStudentHistory, useStudentProgress } from '../../src/hocsinh/queries';
import { useTheme } from '../../src/theme/ThemeProvider';

// Tiến độ của em: bài kiểm tra đã nộp, bài học hoàn thành, sao, mức thành thạo theo di sản, huy hiệu và các lượt đã nộp. Cấp 1 chỉ hiện sao và huy hiệu (không hiện phần trăm).

export default function Progress() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const progress = useStudentProgress();
  const history = useStudentHistory(1);
  const level = theme.level ?? 2;

  if (progress.isLoading) return <Loading label={t('hs.common.loading')} />;
  if (progress.isError || !progress.data) return <ErrorState message={t('hs.common.error')} retryLabel={t('hs.common.retry')} onRetry={() => void progress.refetch()} />;
  const data = progress.data;

  return (
    <Screen>
      <Txt variant="heading" accessibilityRole="header">
        {t('hs.progress.title')}
      </Txt>
      <View style={ui.wrap}>
        <Badge label={`${t('hs.progress.quizzes')}: ${data.quizzesSubmitted}/${data.quizzesPublished}`} />
        <Badge label={`${t('hs.progress.lessons')}: ${data.lessonsCompleted}/${data.lessonsWithQuiz}`} />
        {data.totalStars !== null ? <Badge label={`${t('hs.progress.stars')}: ${data.totalStars}`} tone="success" /> : null}
      </View>

      <Section title={t('hs.progress.mastery')}>
        {data.mastery.length === 0 ? (
          <EmptyState message={t('hs.progress.noMastery')} />
        ) : (
          data.mastery.map((item) => (
            <Card key={item.heritageId}>
              <View style={[ui.row, { padding: 12 }]}>
                <View style={ui.grow}>
                  <Txt variant="label">{item.name}</Txt>
                  <Txt variant="caption">{item.label}</Txt>
                </View>
                <Txt variant="title" color={theme.color.primary}>
                  {level === 1 ? starsText(item.stars) : percentText(item.percent)}
                </Txt>
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section title={t('hs.progress.badges')}>
        {data.badges.length === 0 ? (
          <EmptyState message={t('hs.progress.noBadges')} />
        ) : (
          data.badges.map((badge) => (
            <Card key={badge.code}>
              <View style={{ padding: 12, gap: 2 }}>
                <Txt variant="label">
                  {badge.name} {badge.count > 1 ? `×${badge.count}` : ''}
                </Txt>
                <Txt variant="caption">{badge.description}</Txt>
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section title={t('hs.progress.history')}>
        {(history.data?.items ?? []).length === 0 ? (
          <EmptyState message={t('hs.progress.noHistory')} />
        ) : (
          history.data?.items.map((row) => (
            <Card key={row.attemptId} onPress={() => router.push({ pathname: '/ket-qua/[luot]', params: { luot: String(row.attemptId) } })} accessibilityLabel={row.quizName ?? ''}>
              <View style={[ui.row, { padding: 12 }]}>
                <View style={ui.grow}>
                  <Txt variant="label">{row.quizName}</Txt>
                  <Txt variant="caption">{row.lessonTitle}</Txt>
                </View>
                <Txt variant="title" color={theme.color.primary}>
                  {level === 1 ? starsText(row.stars) : percentText(row.percent)}
                </Txt>
              </View>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
