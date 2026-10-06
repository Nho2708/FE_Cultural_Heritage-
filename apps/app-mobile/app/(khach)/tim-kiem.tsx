import type { DiscoveryFilter, HeritagePeriod, HeritageType, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { HeritageTile, ListNotes } from '../../src/components/Heritage';
import { Button, Chip, EmptyState, ErrorState, Loading, Notice, Txt, styles as ui } from '../../src/components/ui';
import { ExtraFilters, LEVELS, PERIODS } from '../../src/guest/ExtraFilters';
import { regionName, typeName } from '../../src/guest/format';
import { useHistory } from '../../src/guest/HistoryProvider';
import { recentSearches } from '../../src/guest/historyCore';
import { keywordInvalid, useSearch } from '../../src/guest/queries';
import { useApp } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Tìm kiếm và lọc di sản (tìm không phân biệt dấu, do máy chủ xử lý), danh sách tải thêm từng trang. Từ khóa được ghi vào lịch sử trên máy khi khách bấm tìm.

const TYPES: HeritageType[] = ['TANGIBLE', 'INTANGIBLE', 'NATURAL', 'MIXED', 'DOCUMENTARY'];
const REGIONS = ['Bắc', 'Trung', 'Nam'] as const;

function asType(value: string | undefined): HeritageType | undefined {
  return TYPES.find((item) => item === value);
}

function asLevel(value: string | undefined): RecognitionLevel | undefined {
  return LEVELS.find((item) => item === value);
}

function asPeriod(value: string | undefined): HeritagePeriod | undefined {
  return PERIODS.find((item) => item === value);
}

function asProvince(value: string | undefined): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function asRegion(value: string | undefined): string | undefined {
  return REGIONS.find((item) => item === value);
}

function Separator() {
  return <View style={{ height: 12 }} />;
}

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  // Từ khóa đổi từ bên ngoài (trang chủ, lịch sử) thì dựng lại màn hình để ô nhập theo đúng từ khóa mới.
  return <SearchBody key={q ?? ''} />;
}

function SearchBody() {
  const params = useLocalSearchParams<{ q?: string; loai?: string; vung?: string; tinh?: string; cap?: string; thoiky?: string }>();
  const { t } = useTranslation();
  const { language } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const history = useHistory();
  const [draft, setDraft] = useState(params.q ?? '');
  // Từ khóa và bộ lọc nằm trên tham số của màn hình: nút Back và mở từ trang chủ luôn đúng.
  const keyword = params.q ?? '';
  const heritageType = asType(params.loai);
  const region = asRegion(params.vung);
  const provinceId = asProvince(params.tinh);
  const recognitionLevel = asLevel(params.cap);
  const period = asPeriod(params.thoiky);
  const [moreOpen, setMoreOpen] = useState(Boolean(provinceId || recognitionLevel || period));
  const setHeritageType = (value: HeritageType | undefined) => router.setParams({ loai: value });
  const setRegion = (value: string | undefined) => router.setParams({ vung: value });

  const filter: DiscoveryFilter = useMemo(
    () => ({ keyword: keyword.trim() || undefined, heritageType, region, provinceId, recognitionLevel, period }),
    [keyword, heritageType, region, provinceId, recognitionLevel, period],
  );
  const query = useSearch(filter);
  const cards = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.totalItems ?? 0;
  const recent = recentSearches(history.entries);
  const hasFilter = Boolean(keyword.trim() || heritageType || region || provinceId || recognitionLevel || period);

  const submit = () => {
    const value = draft.trim();
    router.setParams({ q: value || undefined });
    if (value.length >= 2) history.add({ kind: 'search', key: value, label: value, thumbnailUrl: null, heritageType: null, provinceName: null });
  };

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        returnKeyType="search"
        autoCorrect={false}
        placeholder={t('search.placeholder')}
        placeholderTextColor={theme.color.onSurfaceVariant}
        accessibilityLabel={t('search.title')}
        style={[
          local.input,
          { borderColor: theme.color.border, borderRadius: theme.radius.control, color: theme.color.onBackground, backgroundColor: theme.color.surface, minHeight: theme.touchTarget, fontSize: theme.text.bodySize },
        ]}
      />
      {keywordInvalid(draft) ? <Notice tone="error" text={t('search.keywordShort')} /> : null}
      {!hasFilter && recent.length > 0 ? (
        <View style={ui.wrap}>
          {recent.map((word) => (
            <Chip
              key={word}
              label={word}
              onPress={() => router.setParams({ q: word })}
            />
          ))}
        </View>
      ) : null}
      <Txt variant="label">{t('search.type')}</Txt>
      <View style={ui.wrap}>
        <Chip label={t('search.all')} selected={!heritageType} onPress={() => setHeritageType(undefined)} />
        {TYPES.map((type) => (
          <Chip key={type} label={typeName(type, language) ?? type} selected={heritageType === type} onPress={() => setHeritageType(heritageType === type ? undefined : type)} />
        ))}
      </View>
      <Txt variant="label">{t('search.region')}</Txt>
      <View style={ui.wrap}>
        <Chip label={t('search.all')} selected={!region} onPress={() => setRegion(undefined)} />
        {REGIONS.map((item) => (
          <Chip key={item} label={regionName(item, language)} selected={region === item} onPress={() => setRegion(region === item ? undefined : item)} />
        ))}
      </View>
      <Button label={moreOpen ? `− ${t('search.moreFilters')}` : `+ ${t('search.moreFilters')}`} variant="ghost" onPress={() => setMoreOpen((open) => !open)} />
      {moreOpen ? (
        <ExtraFilters
          language={language}
          provinceId={provinceId}
          level={recognitionLevel}
          period={period}
          onProvince={(id) => router.setParams({ tinh: id === undefined ? undefined : String(id) })}
          onLevel={(value) => router.setParams({ cap: value })}
          onPeriod={(value) => router.setParams({ thoiky: value })}
        />
      ) : null}
      {hasFilter ? (
        <View style={ui.row}>
          <Txt variant="caption" style={ui.grow}>
            {t('search.results', { count: total })}
          </Txt>
          <Button
            label={t('search.clearFilters')}
            variant="ghost"
            onPress={() => router.setParams({ q: undefined, loai: undefined, vung: undefined, tinh: undefined, cap: undefined, thoiky: undefined })}
          />
        </View>
      ) : null}
      <ListNotes cards={cards} />
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.color.background }}
      contentContainerStyle={{ padding: theme.spacing.inline, paddingBottom: 32 }}
      data={cards}
      keyExtractor={(card) => card.slug}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      renderItem={({ item }) => <HeritageTile card={item} horizontal onPress={() => router.push({ pathname: '/di-san/[slug]', params: { slug: item.slug } })} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      ListEmptyComponent={
        query.isLoading ? (
          <Loading label={t('common.loading')} />
        ) : query.isError ? (
          <ErrorState message={t('common.offline')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />
        ) : (
          <EmptyState message={t('common.noResults')} />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? <Button label={t('search.loadMore')} variant="secondary" loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} full /> : null
      }
    />
  );
}

const local = StyleSheet.create({
  input: { borderWidth: 1.5, paddingHorizontal: 14 },
});
