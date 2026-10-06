import type { HeritageType } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { HeritageTile, ListNotes } from '../../src/components/Heritage';
import { Button, Chip, EmptyState, ErrorState, Loading, Notice, Section, Txt, styles as ui } from '../../src/components/ui';
import { formatDistance } from '../../src/i18n/dates';
import { regionName, typeName } from '../../src/guest/format';
import { useHistory } from '../../src/guest/HistoryProvider';
import { useHome, useRecommendations } from '../../src/guest/queries';
import { useNearby } from '../../src/guest/useNearby';
import { useApp } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { localeOf } from '../../src/i18n/dates';

// Trang chủ của khách: ô tìm kiếm, "Gợi ý cho bạn" (theo lịch sử trên máy, chưa có lịch sử thì di sản nổi bật), "Gần bạn" khi khách cho dùng vị trí, khám phá theo loại và vùng.

const TILE_WIDTH = 240;

function isHeritageType(value: string): value is HeritageType {
  return ['TANGIBLE', 'INTANGIBLE', 'NATURAL', 'MIXED', 'DOCUMENTARY'].includes(value);
}

export default function GuestHome() {
  const { t } = useTranslation();
  const { language } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const home = useHome();
  const history = useHistory();
  const recommendations = useRecommendations(history.entries, home.data?.featured);
  const nearby = useNearby();
  const [keyword, setKeyword] = useState('');

  const open = (slug: string) => router.push({ pathname: '/di-san/[slug]', params: { slug } });
  const search = (params: { q?: string; loai?: string; vung?: string }) => router.push({ pathname: '/(khach)/tim-kiem', params });

  if (home.isLoading) return <Loading label={t('common.loading')} />;
  if (home.isError || !home.data) return <ErrorState message={t('common.offline')} retryLabel={t('common.retry')} onRetry={() => void home.refetch()} />;
  const data = home.data;

  return (
    <ScrollView
      style={{ backgroundColor: theme.color.background }}
      contentContainerStyle={{ padding: theme.spacing.inline, gap: theme.spacing.block, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => void home.refetch()} tintColor={theme.color.primary} />}
    >
      <View style={{ gap: 12 }}>
        <Txt variant="heading" accessibilityRole="header">
          {t('home.intro')}
        </Txt>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => {
            const value = keyword.trim();
            if (value.length >= 2) history.add({ kind: 'search', key: value, label: value, thumbnailUrl: null, heritageType: null, provinceName: null });
            search({ q: value });
          }}
          returnKeyType="search"
          placeholder={t('search.placeholder')}
          placeholderTextColor={theme.color.onSurfaceVariant}
          accessibilityLabel={t('search.title')}
          style={[
            local.input,
            { borderColor: theme.color.border, borderRadius: theme.radius.control, color: theme.color.onBackground, backgroundColor: theme.color.surface, minHeight: theme.touchTarget, fontSize: theme.text.bodySize },
          ]}
        />
        <Txt variant="caption" muted>
          {t('home.total', { count: data.totalHeritages, formatted: data.totalHeritages.toLocaleString(localeOf(language)) })}
        </Txt>
      </View>

      <Section title={recommendations.personal ? t('home.recommended') : t('home.recommendedEmpty')}>
        <ListNotes cards={recommendations.cards} />
        {recommendations.cards.length === 0 ? (
          <EmptyState message={t('common.noResults')} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.row}>
            {recommendations.cards.map((card) => (
              <HeritageTile key={card.slug} card={card} width={TILE_WIDTH} onPress={() => open(card.slug)} />
            ))}
          </ScrollView>
        )}
      </Section>

      <Section title={t('home.nearby')}>
        {nearby.status === 'off' || nearby.status === 'denied' || nearby.status === 'error' ? (
          <View style={{ gap: 10 }}>
            <Notice text={nearby.status === 'denied' ? t('home.nearbyDenied') : t('home.nearbyAsk')} />
            <Button label={t('home.nearbyAllow')} variant="secondary" onPress={() => void nearby.locate()} />
          </View>
        ) : nearby.isLoading ? (
          <Loading label={t('common.loading')} />
        ) : nearby.items.length === 0 ? (
          <EmptyState message={t('home.nearbyEmpty')} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.row}>
            {nearby.items.map(({ item, meters }) => (
              <HeritageTile
                key={item.slug}
                card={{ ...item, recognizedYear: null }}
                width={TILE_WIDTH}
                extra={t('home.nearbyDistance', { distance: formatDistance(meters, language) })}
                onPress={() => open(item.slug)}
              />
            ))}
          </ScrollView>
        )}
      </Section>

      <Section title={t('home.byType')}>
        <View style={ui.wrap}>
          {data.byType.map((item) => (
            <Chip
              key={item.value}
              label={`${isHeritageType(item.value) ? (typeName(item.value, language) ?? item.label) : item.label} (${item.count})`}
              onPress={() => search({ loai: item.value })}
            />
          ))}
        </View>
      </Section>

      <Section title={t('home.byRegion')}>
        <View style={ui.wrap}>
          {data.byRegion.map((item) => (
            <Chip key={item.value} label={`${regionName(item.value, language)} (${item.count})`} onPress={() => search({ vung: item.value })} />
          ))}
        </View>
      </Section>

      <Section title={t('home.featured')}>
        <ListNotes cards={data.featured} />
        <View style={{ gap: 12 }}>
          {data.featured.map((card) => (
            <HeritageTile key={card.slug} card={card} horizontal onPress={() => open(card.slug)} />
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

const local = StyleSheet.create({
  input: { borderWidth: 1.5, paddingHorizontal: 14 },
  row: { gap: 12, paddingRight: 16 },
});
