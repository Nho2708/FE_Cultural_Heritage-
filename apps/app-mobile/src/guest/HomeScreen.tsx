import type { HeritageType } from '@dsvhvn/dung-chung/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { HeritageTile, ListNotes } from '../components/Heritage';
import { Card, Chip, ErrorState, Loading, Section, Txt, styles as ui } from '../components/ui';
import { localeOf } from '../i18n/dates';
import { publicHref } from '../navigation/publicRoutes';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';
import { regionName, typeName } from './format';
import { NearbySection, RecommendedSection } from './GuestSections';
import { useHistory } from './HistoryProvider';
import { useHome } from './queries';

// Trang chủ phần công khai: ô tìm kiếm, lối vào bản đồ và dòng thời gian, khám phá theo loại và vùng, di sản nổi bật. Khách thấy thêm "Gợi ý cho bạn" (theo lịch sử trên máy chủ, chưa có lịch sử thì di sản nổi bật)
// và "Gần bạn" (khi khách cho dùng vị trí). Học sinh vào từ tab Khám phá chỉ thấy phần chung, không có lịch sử, gợi ý theo lịch sử hay vị trí.

export type HomeAudience = 'guest' | 'student';

function isHeritageType(value: string): value is HeritageType {
  return ['TANGIBLE', 'INTANGIBLE', 'NATURAL', 'MIXED', 'DOCUMENTARY'].includes(value);
}

/** Lối vào một màn hình khác của phần công khai (bản đồ, dòng thời gian). */
function EntryCard({ icon, title, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={title}>
      <View style={[ui.row, local.entry]}>
        <Ionicons name={icon} size={30} color={theme.color.primary} />
        <View style={[ui.grow, { gap: 2 }]}>
          <Txt variant="title">{title}</Txt>
          <Txt variant="caption">{text}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.color.onSurfaceVariant} />
      </View>
    </Card>
  );
}

export function HomeScreen({ audience }: { audience: HomeAudience }) {
  const { t } = useTranslation();
  const { language } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const home = useHome();
  const history = useHistory();
  const [keyword, setKeyword] = useState('');
  const guest = audience === 'guest';

  const open = (slug: string) => router.push({ pathname: '/di-san/[slug]', params: { slug } });
  const search = (params: { q?: string; loai?: string; vung?: string }) => router.push(publicHref(audience, 'search', params));

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
            if (guest && value.length >= 2) history.add({ kind: 'search', key: value, label: value, thumbnailUrl: null, heritageType: null, provinceName: null });
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

      <View style={{ gap: 12 }}>
        <EntryCard icon="map-outline" title={t('map.title')} text={t('home.mapText')} onPress={() => router.push(publicHref(audience, 'map'))} />
        <EntryCard icon="hourglass-outline" title={t('timeline.title')} text={t('home.timelineText')} onPress={() => router.push(publicHref(audience, 'timeline'))} />
      </View>

      {guest ? <RecommendedSection featured={data.featured} /> : null}
      {guest ? <NearbySection /> : null}

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
  entry: { padding: 14, gap: 12 },
});
