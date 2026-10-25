import type { LessonCompletion } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Txt } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';
import { BIG, HeritageCardTile, Mascot, SpeakButton, TakeHome } from './parts';

// Bước Nhận thẻ, bước cuối của bài cấp 1: vào bước là ghi em đã học xong bài (gọi máy chủ một lần), thẻ di sản của bài vào album. Hiện thẻ
// ("Thẻ mới vào album" hoặc "Đã có trong album"), số thẻ của album, câu mang về nhà có nút nghe, ý chính "Em nhớ nhé", rồi hai nút "Về con
// đường" và "Xem album". Mất mạng thì một câu ngắn và nút "Thử lại".

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'done'; data: LessonCompletion };

export function EarnCardStep({ complete, keyPoints, onCompleted, onBackToPath, onAlbum }: { complete?: () => Promise<LessonCompletion>; keyPoints: string[]; onCompleted?: (data: LessonCompletion) => void; onBackToPath: () => void; onAlbum: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [state, setState] = useState<State>(complete ? { kind: 'loading' } : { kind: 'error' });
  const started = useRef(false);
  const completeRef = useRef(complete);
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => {
    completeRef.current = complete;
    onCompletedRef.current = onCompleted;
  });

  const run = useCallback(async () => {
    const call = completeRef.current;
    if (!call) return;
    setState({ kind: 'loading' });
    try {
      const data = await call();
      setState({ kind: 'done', data });
      onCompletedRef.current?.(data);
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  // Một lần mỗi lần vào bước; máy chủ gọi lại nhiều lần vẫn chỉ ghi một lần.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const data = state.kind === 'done' ? state.data : null;

  return (
    <View style={{ gap: 18 }}>
      <View style={local.top}>
        <Mascot size={72} mood="chuc-mung" />
        <Txt variant="heading" style={{ flex: 1, fontSize: 28, lineHeight: 36 }} accessibilityRole="header">
          {t('hs.lesson.congrats')}
        </Txt>
      </View>

      {state.kind === 'loading' ? (
        <View style={local.loading} accessibilityRole="progressbar" accessibilityLabel={t('hs.one.earnLoading')}>
          <ActivityIndicator color={theme.color.primary} />
          <Txt muted>{t('hs.one.earnLoading')}</Txt>
        </View>
      ) : null}

      {state.kind === 'error' && complete ? (
        <View style={[local.box, { backgroundColor: theme.color.surfaceContainerLow, borderRadius: theme.radius.card }]}>
          <Txt>{t('hs.one.earnFailed')}</Txt>
          <Button label={t('hs.common.retry')} variant="secondary" onPress={() => void run()} full style={{ minHeight: BIG }} />
        </View>
      ) : null}

      {data ? (
        <View style={{ gap: 12 }}>
          {data.cards.map((card) => (
            <HeritageCardTile key={card.heritageId} card={card} note={data.firstTime ? t('hs.one.earnNew') : t('hs.one.earnHave')} />
          ))}
          <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '700', color: theme.color.primary }}>{t('hs.one.albumCount', { count: data.albumCollected })}</Text>
          {data.takeHome ? <TakeHome text={data.takeHome} /> : null}
        </View>
      ) : null}

      {keyPoints.length > 0 ? (
        <View style={[local.box, { backgroundColor: theme.color.surface, borderColor: theme.color.border, borderWidth: 2, borderRadius: theme.radius.card }]}>
          <View style={local.top}>
            <Txt variant="title" style={{ flex: 1 }}>
              {t('hs.one.remember')}
            </Txt>
            <SpeakButton text={keyPoints.join('. ')} label={t('hs.one.speakRemember')} soft />
          </View>
          {keyPoints.map((point, index) => (
            <View key={index} style={local.point}>
              <View style={[local.bullet, { backgroundColor: theme.color.accent }]} />
              <Txt style={{ flex: 1 }}>{point}</Txt>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Button label={t('hs.one.backToPath')} onPress={onBackToPath} full style={{ minHeight: BIG }} />
        <Button label={t('hs.one.viewAlbum')} variant="secondary" onPress={onAlbum} full style={{ minHeight: BIG }} />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  box: { padding: 16, gap: 12 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bullet: { width: 12, height: 12, borderRadius: 6, marginTop: 10 },
});
