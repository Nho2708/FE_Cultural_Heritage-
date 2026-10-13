import type { HeritageType } from '@dsvhvn/dung-chung/api';
import { embedMapUrl, type EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { WEB_BASE_URL } from '../config/env';
import { Button, Chip, ErrorState, Txt } from '../components/ui';
import { EmbedWebView, type EmbedWebViewHandle } from '../embed/EmbedWebView';
import { publicHref } from '../navigation/publicRoutes';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';
import { ExtraFilters } from './ExtraFilters';
import { regionName, typeName } from './format';
import { extraFilterCount, hasMapFilter, toEmbedFilter, type MapFilterState } from './mapFilter';
import { MapNearby } from './MapNearby';

// Bản đồ di sản: trang nhúng của web học tập (Leaflet + OpenStreetMap, có Hoàng Sa, Trường Sa) mở trong WebView, nên chỉ viết một lần cho web và app.
// Lọc theo loại và vùng bằng chip, theo tỉnh, cấp xếp hạng và thời kỳ trong bảng "Thêm bộ lọc" (như trang Bản đồ của web). Đổi bộ lọc không tải lại trang: app gửi lệnh vào trang nhúng
// sau khi trang báo sẵn sàng. Chạm ghim rồi mở chi tiết hoặc dòng thời gian thì trang nhúng gửi thông điệp để app đi tới màn hình tương ứng.
// Khách thấy thêm nút "Gần bạn" (xem MapNearby); học sinh thì không, vì vị trí gắn với phần chỉ của khách.

const TYPES: HeritageType[] = ['TANGIBLE', 'INTANGIBLE', 'NATURAL', 'MIXED', 'DOCUMENTARY'];
const REGIONS = ['Bắc', 'Trung', 'Nam'] as const;

/** Bản đồ di sản dùng cho tab Bản đồ của khách và màn hình riêng của học sinh (mở từ thẻ di sản của bài học). `select` là ghim cần làm nổi. */
export function HeritageMapScreen({ select }: { select?: string }) {
  const { language, mode } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const embed = useRef<EmbedWebViewHandle>(null);
  const [filter, setFilter] = useState<MapFilterState>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [readyPage, setReadyPage] = useState<string | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);

  // Địa chỉ trang chỉ đổi theo ngôn ngữ; bộ lọc, ghim cần làm nổi và vị trí đổi sau đó đều đi bằng lệnh, nên trang không tải lại mỗi lần chạm một chip.
  const [firstSelect] = useState(select);
  const url = useMemo(() => embedMapUrl(WEB_BASE_URL, {}, language, firstSelect || undefined), [language, firstSelect]);
  const page = `${url}#${attempt}`;
  const ready = readyPage === page;
  const embedFilter = useMemo(() => toEmbedFilter(filter), [filter]);

  useEffect(() => {
    if (ready) embed.current?.send({ type: 'set-filter', version: 1, filter: embedFilter });
  }, [ready, embedFilter]);
  useEffect(() => {
    if (ready && select) embed.current?.send({ type: 'focus', version: 1, slug: select });
  }, [ready, select]);
  useEffect(() => {
    if (ready && position) embed.current?.send({ type: 'set-position', version: 1, position });
  }, [ready, position]);

  const onMessage = useCallback(
    (message: EmbedMessage) => {
      if (message.type === 'ready') setReadyPage(page);
      else if (message.type === 'pin-selected') router.push({ pathname: '/di-san/[slug]', params: { slug: message.slug } });
      else if (message.type === 'timeline-selected') router.push({ pathname: '/di-san/[slug]/dong-thoi-gian', params: { slug: message.slug } });
    },
    [router, page],
  );
  const focus = useCallback((slug: string) => embed.current?.send({ type: 'focus', version: 1, slug }), []);

  const extraCount = extraFilterCount(filter);
  const update = (patch: Partial<MapFilterState>) => setFilter((current) => ({ ...current, ...patch }));

  return (
    <View style={[styles.fill, { backgroundColor: theme.color.background }]}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { padding: theme.spacing.inline / 1.5 }]}>
          <Chip label={t('search.all')} selected={!hasMapFilter(filter)} onPress={() => setFilter({})} />
          {TYPES.map((type) => (
            <Chip key={type} label={typeName(type, language) ?? type} selected={filter.heritageType === type} onPress={() => update({ heritageType: filter.heritageType === type ? undefined : type })} />
          ))}
          {REGIONS.map((item) => (
            <Chip key={item} label={regionName(item, language)} selected={filter.region === item} onPress={() => update({ region: filter.region === item ? undefined : item })} />
          ))}
          <Chip label={extraCount > 0 ? `${t('search.moreFilters')} (${extraCount})` : t('search.moreFilters')} selected={moreOpen || extraCount > 0} onPress={() => setMoreOpen((open) => !open)} />
        </ScrollView>
        {moreOpen ? (
          <ScrollView style={styles.more} contentContainerStyle={{ padding: theme.spacing.inline, paddingTop: 0 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <ExtraFilters
              language={language}
              provinceId={filter.provinceId}
              level={filter.recognitionLevel}
              period={filter.period}
              onProvince={(provinceId) => update({ provinceId })}
              onLevel={(recognitionLevel) => update({ recognitionLevel })}
              onPeriod={(period) => update({ period })}
            />
          </ScrollView>
        ) : null}
      </View>
      {failed ? (
        <View style={styles.fill}>
          <ErrorState message={t('map.unavailable')} retryLabel={t('common.retry')} onRetry={() => { setFailed(false); setAttempt((n) => n + 1); }} />
          <View style={styles.center}>
            <Button label={t('map.listInstead')} variant="secondary" onPress={() => router.push(publicHref(mode, 'search'))} />
          </View>
        </View>
      ) : (
        <View style={styles.fill}>
          <EmbedWebView ref={embed} key={page} url={url} label={t('map.title')} onMessage={onMessage} onFail={() => setFailed(true)} />
          {mode === 'guest' ? <MapNearby filter={embedFilter} onPosition={setPosition} onFocus={focus} /> : null}
        </View>
      )}
      <Txt variant="caption" muted style={styles.footer}>
        © OpenStreetMap
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  chips: { gap: 8 },
  more: { maxHeight: 300 },
  center: { alignItems: 'center' },
  footer: { textAlign: 'center', paddingVertical: 2 },
});
