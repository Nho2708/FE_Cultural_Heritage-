import type { DiscoveryFilter, HeritageType } from '@dsvhvn/dung-chung/api';
import { embedMapUrl, type EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { WEB_BASE_URL } from '../config/env';
import { Button, Chip, ErrorState, Txt } from '../components/ui';
import { EmbedWebView } from '../embed/EmbedWebView';
import { regionName, typeName } from '../guest/format';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';

// Bản đồ di sản: trang nhúng của web học tập (Leaflet + OpenStreetMap, có Hoàng Sa, Trường Sa) mở trong WebView, nên chỉ viết một lần cho web và app.
// Lọc theo loại và vùng bằng chip phía trên; chạm ghim rồi mở chi tiết thì trang nhúng gửi thông điệp để app đi tới trang chi tiết di sản.

const TYPES: HeritageType[] = ['TANGIBLE', 'INTANGIBLE', 'NATURAL', 'MIXED', 'DOCUMENTARY'];
const REGIONS = ['Bắc', 'Trung', 'Nam'] as const;

/** Bản đồ di sản dùng cho tab Bản đồ của khách và màn hình riêng của học sinh (mở từ thẻ di sản của bài học). `select` là ghim cần làm nổi. */
export function HeritageMapScreen({ select }: { select?: string }) {
  const { language, mode } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [heritageType, setHeritageType] = useState<HeritageType | undefined>();
  const [region, setRegion] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const filter: DiscoveryFilter = useMemo(() => ({ heritageType, region }), [heritageType, region]);
  const url = useMemo(() => embedMapUrl(WEB_BASE_URL, filter, language, select || undefined), [filter, language, select]);

  const onMessage = useCallback(
    (message: EmbedMessage) => {
      if (message.type === 'pin-selected') router.push({ pathname: '/di-san/[slug]', params: { slug: message.slug } });
    },
    [router],
  );

  return (
    <View style={[styles.fill, { backgroundColor: theme.color.background }]}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { padding: theme.spacing.inline / 1.5 }]}>
          <Chip label={t('search.all')} selected={!heritageType && !region} onPress={() => { setHeritageType(undefined); setRegion(undefined); }} />
          {TYPES.map((type) => (
            <Chip key={type} label={typeName(type, language) ?? type} selected={heritageType === type} onPress={() => setHeritageType(heritageType === type ? undefined : type)} />
          ))}
          {REGIONS.map((item) => (
            <Chip key={item} label={regionName(item, language)} selected={region === item} onPress={() => setRegion(region === item ? undefined : item)} />
          ))}
        </ScrollView>
      </View>
      {failed ? (
        <View style={styles.fill}>
          <ErrorState message={t('map.unavailable')} retryLabel={t('common.retry')} onRetry={() => { setFailed(false); setAttempt((n) => n + 1); }} />
          <View style={styles.center}>
            <Button label={t('map.listInstead')} variant="secondary" onPress={() => router.push(mode === 'student' ? '/(hoc-sinh)/hoc' : '/(khach)/tim-kiem')} />
          </View>
        </View>
      ) : (
        <EmbedWebView key={`${url}#${attempt}`} url={url} label={t('map.title')} onMessage={onMessage} onFail={() => setFailed(true)} />
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
  center: { alignItems: 'center' },
  footer: { textAlign: 'center', paddingVertical: 2 },
});
