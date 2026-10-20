import { ApiError } from '@dsvhvn/dung-chung/api';
import { languageOption } from '@dsvhvn/dung-chung/i18n';
import { splitParagraphs } from '@dsvhvn/dung-chung/speech';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { isUnlockRequired } from '../ads/gate';
import { adsAvailable } from '../ads/rewarded';
import { useSummary } from '../guest/queries';
import { SPEEDS } from '../speech/narrator';
import { useSummaryNarration } from '../speech/useSummaryNarration';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';
import { AdGatePanel } from './AdGatePanel';
import { Badge, Button, Card, Chip, ErrorState, Loading, Notice, Txt, styles as ui } from './ui';

// Tóm tắt di sản: bản chi tiết để đọc và bản ngắn để nghe, lưu sẵn theo ngôn ngữ (không gọi AI khi xem). Bản Hàn, Trung, Nhật gắn nhãn "bản dịch máy"; ngôn ngữ chưa có
// tóm tắt thì hiện tiếng Việt kèm thông báo. Nghe bằng tệp thuyết minh tạo sẵn khi có (bấm một câu thì phát từ câu đó), không có hoặc tệp hỏng thì bằng giọng của điện thoại;
// tô sáng câu đang đọc. Máy chủ khóa tóm tắt và nghe bằng cổng quảng cáo có thưởng (403 cần mở khóa): khi đó hiện lời mời xem quảng cáo thay nội dung.

export type SummaryTab = 'read' | 'listen';

interface Props {
  slug: string;
  initialTab: SummaryTab;
  onListen: () => void;
}

export function SummaryPanel({ slug, initialTab, onListen }: Props) {
  const { t } = useTranslation();
  const { language } = useApp();
  const theme = useTheme();
  const [tab, setTab] = useState<SummaryTab>(initialTab);
  const summary = useSummary(slug, true);

  const speechTag = languageOption(summary.data?.localization.language ?? language).speechTag;
  const shortText = summary.data?.shortText ?? '';
  const narration = useSummaryNarration(shortText, speechTag, summary.data?.narration);
  const stopNarration = narration.stop;
  // Chỉ cần giọng của điện thoại khi không có tệp thuyết minh tạo sẵn.
  const voiceState = narration.usingAudio ? 'ready' : narration.voiceState;

  // Chuyển sang tab Đọc thì dừng nghe.
  useEffect(() => {
    if (tab === 'read') stopNarration();
  }, [tab, stopNarration]);

  if (summary.isLoading) return <Loading label={t('common.loading')} />;
  if (isUnlockRequired(summary.error)) return <AdGatePanel slug={slug} onUnlocked={() => void summary.refetch()} />;
  if (summary.isError || !summary.data) {
    const unavailable = summary.error instanceof ApiError && summary.error.status === 404;
    return <ErrorState message={unavailable ? t('summary.unavailable') : t('common.offline')} retryLabel={t('common.retry')} onRetry={unavailable ? undefined : () => void summary.refetch()} />;
  }

  const data = summary.data;
  const { localization } = data;
  const requestedName = t(`language.names.${localization.requestedLanguage}`);
  const paragraphs = splitParagraphs(data.detailedText);
  const languageNames = (code: string) => t(`language.names.${code}`);

  return (
    <Card>
      <View style={[local.body, { gap: theme.spacing.inline }]}>
        <Txt variant="title" accessibilityRole="header">
          {data.name}
        </Txt>
        {!adsAvailable() ? (
          <Txt variant="caption" muted>
            {t('ad.placeholder')}
          </Txt>
        ) : null}
        {localization.isMachineTranslated ? <Badge label={t('language.machineLabel')} tone="warning" /> : null}
        {localization.isFallback ? <Notice text={t('summary.fallbackOnly', { language: requestedName || languageNames(localization.requestedLanguage) })} /> : null}
        {localization.isMachineTranslated ? <Notice text={t('language.machineHint')} /> : null}

        <View style={ui.wrap}>
          <Chip label={t('summary.detailed')} selected={tab === 'read'} onPress={() => setTab('read')} />
          <Chip label={t('detail.listen')} selected={tab === 'listen'} onPress={() => setTab('listen')} />
        </View>

        {tab === 'read' ? (
          <View style={{ gap: theme.spacing.inline }}>
            {paragraphs.map((paragraph, index) => (
              <Txt key={index}>{paragraph}</Txt>
            ))}
          </View>
        ) : (
          <View style={{ gap: theme.spacing.inline }}>
            <Txt variant="caption" muted>
              {t('summary.short')}
            </Txt>
            {voiceState === 'unsupported' ? <Notice text={t('speech.unsupported')} /> : null}
            {voiceState === 'missing' ? <Notice text={t('speech.missingVoice', { language: languageNames(localization.language) })} /> : null}
            <View style={ui.wrap}>
              {narration.status === 'idle' ? (
                <Button
                  label={t('speech.play')}
                  icon="▶"
                  disabled={voiceState === 'unsupported' || narration.sentences.length === 0}
                  onPress={() => {
                    onListen();
                    narration.play();
                  }}
                />
              ) : narration.status === 'playing' ? (
                <Button label={t('speech.pause')} icon="❚❚" onPress={narration.pause} />
              ) : (
                <Button label={t('speech.resume')} icon="▶" onPress={narration.resume} />
              )}
              {narration.status !== 'idle' ? <Button label={t('speech.stop')} icon="■" variant="secondary" onPress={narration.stop} /> : null}
            </View>
            <View style={{ gap: 6 }}>
              <Txt variant="caption">{t('speech.speed')}</Txt>
              <View style={ui.wrap}>
                {SPEEDS.map((speed) => (
                  <Chip key={speed} label={`${speed}x`} selected={narration.speed === speed} onPress={() => narration.setSpeed(speed)} />
                ))}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              {narration.sentences.map((sentence, index) => (
                <Txt
                  key={index}
                  accessibilityLabel={index === narration.index ? `${t('speech.sentence')}: ${sentence}` : sentence}
                  // Tệp tạo sẵn biết mốc từng câu: bấm vào câu thì phát từ đầu câu đó.
                  accessibilityRole={narration.usingAudio ? 'button' : undefined}
                  onPress={
                    narration.usingAudio
                      ? () => {
                          if (narration.status === 'idle') onListen();
                          narration.seekTo(index);
                        }
                      : undefined
                  }
                  style={index === narration.index ? { backgroundColor: theme.color.accent, color: theme.color.onAccent, borderRadius: 4 } : undefined}
                >
                  {sentence}
                </Txt>
              ))}
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}

const local = StyleSheet.create({
  body: { padding: 16 },
});
