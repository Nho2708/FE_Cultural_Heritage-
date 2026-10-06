import { ApiError } from '@dsvhvn/dung-chung/api';
import { embedModelUrl, type EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, EmptyState, Loading, Txt, styles as ui } from '../../../src/components/ui';
import { WEB_BASE_URL } from '../../../src/config/env';
import { EmbedWebView } from '../../../src/embed/EmbedWebView';
import { useHistory } from '../../../src/guest/HistoryProvider';
import { useHeritageDetail, useModel } from '../../../src/guest/queries';
import { useApp } from '../../../src/state/AppProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Photo } from '../../../src/components/Heritage';

// Xem mô hình 3D (miễn phí, không cần đăng nhập): trang nhúng của web học tập dùng `<model-viewer>` mở trong WebView, nên một trình xem cho cả web và app.
// Thiết bị không vẽ được 3D hoặc tải lỗi thì quay về bộ ảnh của di sản kèm thông báo. Ghi "đã xem 3D" vào lịch sử trên máy khi mô hình tải xong.

export default function Model3D() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const { mode } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const history = useHistory();
  const model = useModel(slug);
  const detail = useHeritageDetail(slug);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const recorded = useRef(false);

  const onMessage = useCallback((message: EmbedMessage) => {
    if (message.type === 'model-progress') setProgress(message.fraction);
    else if (message.type === 'model-loaded') setLoaded(true);
    else if (message.type === 'model-error') setFailed(true);
  }, []);

  useEffect(() => {
    const data = detail.data;
    if (!loaded || recorded.current || mode !== 'guest' || !data) return;
    recorded.current = true;
    history.add({ kind: 'model', key: data.slug, label: data.name, thumbnailUrl: data.thumbnailUrl, heritageType: data.heritageType, provinceName: data.province?.name ?? null });
  }, [loaded, detail.data, history, mode]);

  if (model.isLoading) return <Loading label={t('model.loading')} />;

  const error: unknown = model.error;
  const notFound = error instanceof ApiError && error.status === 404;
  const unavailable = failed || notFound || model.isError || !model.data;
  if (unavailable) {
    const images = detail.data?.media.filter((item) => item.mediaType === 'IMAGE' && item.url) ?? [];
    return (
      <ScrollView contentContainerStyle={{ padding: theme.spacing.inline, gap: theme.spacing.block }} style={{ backgroundColor: theme.color.background }}>
        <EmptyState message={t('model.unavailable')} />
        {images.slice(0, 6).map((image) => (
          <Photo key={image.id} url={image.previewUrl ?? image.url} width={960} height={200} style={{ borderRadius: theme.radius.card }} />
        ))}
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} style={ui.centerButton} />
      </ScrollView>
    );
  }

  const data = model.data;
  return (
    <View style={[styles.fill, { backgroundColor: theme.color.background }]}>
      <View style={styles.fill}>
        <EmbedWebView url={embedModelUrl(WEB_BASE_URL, slug)} label={data.title ?? t('model.title')} onMessage={onMessage} onFail={() => setFailed(true)} />
        {!loaded && progress > 0 ? (
          <View style={[styles.progress, { backgroundColor: theme.color.primary, width: `${Math.round(progress * 100)}%` }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} />
        ) : null}
      </View>
      <View style={{ padding: theme.spacing.inline, gap: 4 }}>
        <Txt variant="caption">{t('model.hint')}</Txt>
        <Txt variant="caption" muted>
          {t('model.credit')}: {data.author} · {t('model.license')}: {data.license}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  progress: { position: 'absolute', left: 0, top: 0, height: 4 },
});
