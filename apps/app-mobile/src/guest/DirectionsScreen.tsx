import { ApiError } from '@dsvhvn/dung-chung/api';
import { embedDirectionsUrl, type EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { googleMapsDirectionsUrl, type RoutePoint } from '@dsvhvn/dung-chung/map/route';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, EmptyState, ErrorState, Loading, Notice, Txt, styles as ui } from '../components/ui';
import { WEB_BASE_URL } from '../config/env';
import { EmbedWebView, type EmbedWebViewHandle } from '../embed/EmbedWebView';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useHeritageDetail } from './queries';
import { currentPosition, LocationDenied } from './useNearby';

// Chỉ đường tới di sản (khách và học sinh): app xin quyền vị trí của hệ điều hành ngay khi mở màn hình (người dùng vừa bấm "Chỉ đường"), rồi mở trang chỉ đường
// nhúng của web học tập trong WebView và gửi vị trí sang bằng lệnh `set-position` sau khi trang báo sẵn sàng; trang tự gọi OSRM và vẽ tuyến, các bước.
// Vị trí chỉ nằm trong bộ nhớ của màn hình, không lưu, không gửi tới máy chủ của dự án. Bị từ chối quyền, không lấy được vị trí hay trang không tải được
// thì giải thích và vẫn có nút mở Google Maps (ứng dụng bản đồ của máy).

type LocationStatus = 'locating' | 'ready' | 'denied' | 'unavailable';

export function DirectionsScreen({ slug }: { slug: string }) {
  const { language } = useApp();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const embed = useRef<EmbedWebViewHandle>(null);
  const detail = useHeritageDetail(slug);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [readyPage, setReadyPage] = useState<string | null>(null);

  // Xin vị trí khi mở màn hình (không thử lại tự động, không giữ trong bộ nhớ đệm sau khi rời màn hình); "Thử lại" hỏi lại.
  const located = useQuery({ queryKey: ['directions', 'position', slug], queryFn: () => currentPosition(), retry: false, gcTime: 0, staleTime: Number.POSITIVE_INFINITY });
  const position: RoutePoint | null = located.data ?? null;
  const locationError: unknown = located.error;
  const status: LocationStatus = located.isFetching ? 'locating' : located.isError ? (locationError instanceof LocationDenied ? 'denied' : 'unavailable') : 'ready';
  const retryLocate = () => void located.refetch();

  // Địa chỉ trang chỉ đổi theo ngôn ngữ và lần thử lại; vị trí đi bằng lệnh nên không tải lại trang.
  const url = useMemo(() => embedDirectionsUrl(WEB_BASE_URL, slug, language), [slug, language]);
  const page = `${url}#${attempt}`;
  const ready = readyPage === page;

  useEffect(() => {
    if (ready && position) embed.current?.send({ type: 'set-position', version: 1, position });
  }, [ready, position]);

  const onMessage = useCallback(
    (message: EmbedMessage) => {
      if (message.type === 'ready') setReadyPage(page);
    },
    [page],
  );

  const data = detail.data;
  const destination = useMemo<RoutePoint | null>(() => (data && data.latitude !== null && data.longitude !== null ? { latitude: data.latitude, longitude: data.longitude } : null), [data]);

  if (detail.isLoading) return <Loading label={t('common.loading')} />;
  if (detail.isError || !data) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return notFound ? (
      <View style={ui.center}>
        <EmptyState message={t('detail.notFound')} />
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} style={ui.centerButton} />
      </View>
    ) : (
      <ErrorState message={t('common.offline')} retryLabel={t('common.retry')} onRetry={() => void detail.refetch()} />
    );
  }
  if (!destination) {
    return (
      <View style={ui.center}>
        <EmptyState message={t('map.withoutLocation', { count: 1 })} />
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} style={ui.centerButton} />
      </View>
    );
  }

  const openGoogleMaps = () => void Linking.openURL(googleMapsDirectionsUrl({ destination, mode: 'driving', origin: position }));

  return (
    <View style={[styles.fill, { backgroundColor: theme.color.background }]}>
      {status === 'denied' || status === 'unavailable' ? (
        <View style={{ padding: theme.spacing.inline, gap: 10 }}>
          <Notice text={status === 'denied' ? t('directions.denied') : t('directions.unavailable')} />
          <View style={ui.wrap}>
            <Button label={t('directions.allow')} variant="secondary" onPress={retryLocate} />
            {status === 'denied' ? <Button label={t('directions.openSettings')} variant="ghost" onPress={() => void Linking.openSettings()} /> : null}
          </View>
        </View>
      ) : status === 'locating' ? (
        <Txt variant="caption" muted style={styles.strip}>
          {t('directions.locating')}
        </Txt>
      ) : null}
      {failed ? (
        <View style={styles.fill}>
          <ErrorState
            message={t('directions.pageUnavailable')}
            retryLabel={t('common.retry')}
            onRetry={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      ) : (
        <View style={styles.fill}>
          <EmbedWebView ref={embed} key={page} url={url} label={t('directions.title')} onMessage={onMessage} onFail={() => setFailed(true)} />
        </View>
      )}
      <View style={{ padding: theme.spacing.inline, gap: 6 }}>
        <Button label={t('directions.openGoogleMaps')} variant="secondary" full onPress={openGoogleMaps} />
        <Txt variant="caption" muted>
          {t('directions.privacy')}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  strip: { paddingHorizontal: 16, paddingVertical: 8 },
});
