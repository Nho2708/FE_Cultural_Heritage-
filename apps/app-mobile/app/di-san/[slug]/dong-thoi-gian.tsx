import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Card, EmptyState, ErrorState, Loading, Notice, Screen, Txt, styles as ui } from '../../../src/components/ui';
import { Photo } from '../../../src/components/Heritage';
import { useTimeline } from '../../../src/guest/queries';
import { localizeDateText } from '../../../src/i18n/dates';
import { useApp } from '../../../src/state/AppProvider';
import { DefaultThemeScope, useTheme } from '../../../src/theme/ThemeProvider';

// Dòng thời gian của một di sản: các giai đoạn, mỗi giai đoạn có các sự kiện kèm ngày tháng (chữ "TCN" và "nay" đổi theo ngôn ngữ đang chọn).

export default function TimelinePage() {
  return (
    <DefaultThemeScope>
      <TimelineScreen />
    </DefaultThemeScope>
  );
}

function TimelineScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { language } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const timeline = useTimeline(slug);
  const words = { eraBefore: t('detail.eraBefore'), present: t('detail.present') };

  if (timeline.isLoading) return <Loading label={t('common.loading')} />;
  if (timeline.isError || !timeline.data) return <ErrorState message={t('common.offline')} retryLabel={t('common.retry')} onRetry={() => void timeline.refetch()} />;
  const data = timeline.data;
  const localization = data.localization;

  return (
    <Screen>
      <Txt variant="heading" accessibilityRole="header">
        {data.name}
      </Txt>
      {localization?.isFallback ? <Notice text={t('language.fallbackPage', { language: t(`language.names.${localization.requestedLanguage}`) })} /> : null}
      {localization?.isMachineTranslated ? <Notice text={t('language.machineHint')} /> : null}
      {data.phases.length === 0 ? <EmptyState message={t('timeline.empty')} /> : null}
      {data.phases.map((phase) => (
        <Card key={phase.id}>
          <View style={{ padding: 14, gap: theme.spacing.inline }}>
            <View style={{ gap: 4 }}>
              <Txt variant="title" accessibilityRole="header">
                {phase.name}
              </Txt>
              <Badge label={localizeDateText(phase.rangeLabel, words, language)} />
              {phase.description ? <Txt muted>{phase.description}</Txt> : null}
            </View>
            {phase.events.map((event) => (
              <View key={event.id} style={[ui.row, { alignItems: 'flex-start', gap: 12 }]}>
                <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: theme.color.primary }} />
                <View style={[ui.grow, { gap: 4 }]}>
                  <Txt variant="label" color={theme.color.primary}>
                    {localizeDateText(event.dateLabel, words, language)}
                  </Txt>
                  <Txt variant="title">{event.name}</Txt>
                  {event.description ? <Txt>{event.description}</Txt> : null}
                  {event.media[0]?.url ? <Photo url={event.media[0].previewUrl ?? event.media[0].url} width={500} height={140} style={{ borderRadius: theme.radius.card }} /> : null}
                </View>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
