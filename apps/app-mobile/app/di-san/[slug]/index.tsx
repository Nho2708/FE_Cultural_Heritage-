import { ApiError } from '@dsvhvn/dung-chung/api';
import { citationsOf, creditLine, parseContent, parseInline, sourceSummary } from '@dsvhvn/dung-chung/heritage-text';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, ErrorState, Loading, Notice, Section, Txt, Badge, styles as ui } from '../../../src/components/ui';
import { Photo } from '../../../src/components/Heritage';
import { SummaryPanel, type SummaryTab } from '../../../src/components/SummaryPanel';
import { cardLine, externalUrl, levelName, provinceName, typeName } from '../../../src/guest/format';
import { useHistory } from '../../../src/guest/HistoryProvider';
import { useHeritageDetail } from '../../../src/guest/queries';
import { localizeDateText } from '../../../src/i18n/dates';
import { publicHref } from '../../../src/navigation/publicRoutes';
import { useApp } from '../../../src/state/AppProvider';
import { DefaultThemeScope, useTheme } from '../../../src/theme/ThemeProvider';

// Chi tiết di sản (khách và học sinh đều xem được): ảnh, mô tả, tóm tắt, nghe thuyết minh, xem 3D, dòng thời gian, bản đồ, hình ảnh và nguồn tham khảo.
// Mở trang thì ghi "đã xem" vào lịch sử trên máy.

/** Bộ giao diện mặc định cho cả khách và học sinh (kể cả khi học sinh mở từ thẻ di sản của bài học). */
export default function HeritageDetailPage() {
  return (
    <DefaultThemeScope>
      <HeritageDetail />
    </DefaultThemeScope>
  );
}

function HeritageDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { language, mode } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const history = useHistory();
  const detail = useHeritageDetail(slug);
  const [panel, setPanel] = useState<SummaryTab | null>(null);
  const recorded = useRef<string | null>(null);

  const data = detail.data;

  // Chỉ khách có lịch sử; mỗi lần mở trang ghi một lần.
  useEffect(() => {
    if (mode !== 'guest' || !data || recorded.current === data.slug) return;
    recorded.current = data.slug;
    history.add({ kind: 'view', key: data.slug, label: data.name, thumbnailUrl: data.thumbnailUrl, heritageType: data.heritageType, provinceName: data.province?.name ?? null });
  }, [data, history, mode]);

  if (detail.isLoading) return <Loading label={t('common.loading')} />;
  if (detail.isError || !data) {
    if (detail.error instanceof ApiError && detail.error.status === 404) {
      return (
        <View style={ui.center}>
          <Txt variant="heading" style={ui.centerText}>
            {t('detail.notFound')}
          </Txt>
          <Txt muted style={ui.centerText}>
            {t('detail.notFoundText')}
          </Txt>
          <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} style={ui.centerButton} />
        </View>
      );
    }
    return <ErrorState message={t('common.offline')} retryLabel={t('common.retry')} onRetry={() => void detail.refetch()} />;
  }

  const localization = data.localization;
  const requestedName = localization ? t(`language.names.${localization.requestedLanguage}`) : '';
  const hero = data.media.find((item) => item.isThumbnail) ?? data.media.find((item) => item.mediaType === 'IMAGE');
  const images = data.media.filter((item) => item.mediaType === 'IMAGE' && item.url);
  const blocks = parseContent(data.content);
  const citations = citationsOf(data.references);
  const sources = sourceSummary(citations, t('detail.references'));
  const subtitle = cardLine({ provinceName: data.province?.name ?? null, recognitionLevel: data.recognitionLevel, recognizedYear: data.recognizedYear }, language);
  const dateWords = { eraBefore: t('detail.eraBefore'), present: t('detail.present') };
  const canMap = data.latitude !== null && data.longitude !== null;
  const heroCredit = hero ? creditLine(hero, t('common.photoCredit')) : null;
  const type = typeName(data.heritageType, language);
  const level = levelName(data.recognitionLevel, language);

  return (
    <ScrollView style={{ backgroundColor: theme.color.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: data.name }} />
      <Photo url={hero?.url ?? data.thumbnailUrl} width={960} height={220} />
      {heroCredit ? (
        <Txt variant="caption" muted style={local.credit}>
          {heroCredit}
        </Txt>
      ) : null}

      <View style={{ padding: theme.spacing.inline, gap: theme.spacing.block }}>
        <View style={{ gap: 8 }}>
          <Txt variant="heading" accessibilityRole="header">
            {data.name}
          </Txt>
          {subtitle ? <Txt muted>{subtitle}</Txt> : null}
          <View style={ui.wrap}>
            {type ? <Badge label={type} /> : null}
            {level ? <Badge label={level} tone="success" /> : null}
            {localization?.isMachineTranslated ? <Badge label={t('language.machineLabel')} tone="warning" /> : null}
          </View>
          {localization?.isFallback ? <Notice text={t('language.fallbackPage', { language: requestedName })} /> : null}
          {localization?.isMachineTranslated ? <Notice text={t('language.machineHint')} /> : null}
          {data.shortDescription ? <Txt>{data.shortDescription}</Txt> : null}
        </View>

        <View style={ui.wrap}>
          {data.hasSummary ? <Button label={t('detail.summary')} onPress={() => setPanel(panel === 'read' ? null : 'read')} /> : null}
          {data.hasSummary ? (
            <Button label={t('detail.listen')} variant="secondary" onPress={() => setPanel(panel === 'listen' ? null : 'listen')} />
          ) : null}
          {data.hasModel ? (
            <Button label={t('detail.view3d')} variant="secondary" onPress={() => router.push({ pathname: '/di-san/[slug]/3d', params: { slug: data.slug } })} />
          ) : null}
          {data.hasTimeline ? (
            <Button label={t('detail.timeline')} variant="secondary" onPress={() => router.push({ pathname: '/di-san/[slug]/dong-thoi-gian', params: { slug: data.slug } })} />
          ) : null}
          {canMap ? (
            <Button
              label={t('detail.onMap')}
              variant="secondary"
              onPress={() => router.push(publicHref(mode, 'map', { chon: data.slug }))}
            />
          ) : null}
        </View>

        {panel ? (
          <SummaryPanel
            key={`${data.slug}-${panel}`}
            slug={data.slug}
            initialTab={panel}
            onListen={() =>
              mode === 'guest' &&
              history.add({ kind: 'listen', key: data.slug, label: data.name, thumbnailUrl: data.thumbnailUrl, heritageType: data.heritageType, provinceName: data.province?.name ?? null })
            }
          />
        ) : null}

        <Section>
          {blocks.length === 0 ? (
            <EmptyState message={t('detail.noContent')} />
          ) : (
            blocks.map((block, index) => {
              if (block.kind === 'heading') {
                return (
                  <Txt key={index} variant={block.level === 2 ? 'heading' : 'title'} accessibilityRole="header" style={block.level === 2 ? { fontSize: theme.text.headingSize - 4, lineHeight: theme.text.headingLineHeight - 4 } : undefined}>
                    {block.text}
                  </Txt>
                );
              }
              if (block.kind === 'list') {
                return (
                  <View key={index} style={{ gap: 6 }}>
                    {block.items.map((item, i) => (
                      <View key={i} style={ui.row}>
                        <Txt>{'•'}</Txt>
                        <Inline text={item} />
                      </View>
                    ))}
                  </View>
                );
              }
              return <Inline key={index} text={block.text} />;
            })
          )}
        </Section>

        <Section title={t('detail.address')}>
          <Txt>{[data.address, provinceName(data.province?.name, language)].filter(Boolean).join(', ') || '-'}</Txt>
          {data.recognizedYear ? (
            <Txt variant="caption">
              {t('detail.recognizedYear')}: {data.recognizedYear}
            </Txt>
          ) : null}
        </Section>

        {data.timeline.length > 0 ? (
          <Section title={t('detail.phases')}>
            <Card>
              {data.timeline.map((phase) => (
                <View key={phase.id} style={local.phase}>
                  <Txt variant="label" style={ui.grow}>
                    {phase.name}
                  </Txt>
                  <Txt variant="caption">{localizeDateText(phase.rangeLabel, dateWords, language)}</Txt>
                </View>
              ))}
            </Card>
          </Section>
        ) : null}

        {images.length > 1 ? (
          <Section title={t('detail.gallery')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {images.map((image) => (
                <View key={image.id} style={{ width: 260, gap: 4 }}>
                  <Photo url={image.previewUrl ?? image.url} width={500} height={160} style={{ borderRadius: theme.radius.card }} />
                  <Txt variant="caption" numberOfLines={3}>
                    {[image.caption, creditLine(image, t('common.photoCredit'))].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
              ))}
            </ScrollView>
          </Section>
        ) : null}

        {citations.length > 0 ? (
          <Section title={t('detail.references')}>
            {citations.map((citation) => {
              const link = externalUrl(citation.url);
              return (
                <View key={citation.id} style={{ gap: 2 }}>
                  <Txt>
                    {citation.index}. {citation.name}
                    {citation.agency ? ` — ${citation.agency}` : ''}
                  </Txt>
                  {link ? (
                    <Txt variant="caption" color={theme.color.link} accessibilityRole="link" onPress={() => void Linking.openURL(link)}>
                      {link}
                    </Txt>
                  ) : null}
                </View>
              );
            })}
            {sources ? (
              <Txt variant="caption" muted>
                {sources}
              </Txt>
            ) : null}
          </Section>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** Đoạn chữ có chữ đậm kiểu **chữ đậm**. */
function Inline({ text }: { text: string }) {
  const theme = useTheme();
  const base = { fontSize: theme.text.bodySize, lineHeight: theme.text.bodyLineHeight, color: theme.color.onBackground, flexShrink: 1 } as const;
  return (
    <Text style={base}>
      {parseInline(text).map((run, index) => (
        <Text key={index} style={run.bold ? { fontWeight: '700' } : undefined}>
          {run.text}
        </Text>
      ))}
    </Text>
  );
}

const local = StyleSheet.create({
  credit: { paddingHorizontal: 16, paddingTop: 4 },
  phase: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' },
});
