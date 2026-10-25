import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Photo } from '../../components/Heritage';
import { useCloudNarration } from '../../speech/useCloudNarration';
import { useTheme } from '../../theme/ThemeProvider';
import { SpeakCircle, useAutoSpeak } from './parts';

// Một đoạn của bước Nghe chuyện: hình lớn, chữ 24 px giãn dòng 1,6 tách thành từng câu (cùng cách tách với giọng đọc), đọc từng câu một và tô
// sáng câu đang đọc. Nút nghe 72 px "Nghe"/"Dừng", chấm tròn cho các đoạn, công tắc "Tự đọc to" (nhớ trên máy). Khối dựng lại theo `key`
// mỗi đoạn nên mỗi đoạn chỉ tự đọc một lần.

export const STORY_SIZE = 24;
export const STORY_LINE = 38;

export function StoryPart({ text, imageUrl, index, total, autoRead, onAutoChange }: { text: string; imageUrl: string | null; index: number; total: number; autoRead: boolean | null; onAutoChange: (on: boolean) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const narration = useCloudNarration(text, 'sentences');
  useAutoSpeak(narration, autoRead === true);
  const speaking = narration.status === 'playing';
  const canSpeak = narration.sentences.length > 0;
  const sentences = narration.sentences.length > 0 ? narration.sentences : [text];

  return (
    <View style={{ gap: 18 }}>
      {imageUrl ? <Photo url={imageUrl} width={960} height={220} style={{ borderRadius: theme.radius.card }} /> : null}
      <Text style={[local.story, { color: theme.color.onBackground }]}>
        {sentences.map((sentence, position) => {
          const on = speaking && narration.index === position;
          return (
            <Text key={position} style={on ? { backgroundColor: theme.color.primaryContainer, color: theme.color.onPrimaryContainer, fontWeight: '700' } : undefined}>
              {sentence}
              {position < sentences.length - 1 ? ' ' : ''}
            </Text>
          );
        })}
      </Text>
      <View style={local.controls}>
        {canSpeak ? <SpeakCircle speaking={speaking} preparing={narration.preparing} onPress={() => (speaking ? narration.stop() : narration.play())} label={t('hs.one.listenStory')} size={72} /> : null}
        <View style={{ flex: 1, gap: 8 }}>
          {canSpeak ? <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '800', color: theme.color.primary }}>{narration.preparing ? t('hs.one.preparing') : speaking ? t('hs.one.stop') : t('hs.one.listen')}</Text> : null}
          {total > 1 ? (
            <View style={local.dots} accessible accessibilityLabel={t('hs.one.partOf', { index: index + 1, total })}>
              {Array.from({ length: total }, (_, dot) => (
                <View key={dot} style={[local.dot, { width: dot === index ? 26 : 12, backgroundColor: dot <= index ? theme.color.primary : theme.color.border }]} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View style={local.switchRow}>
        <Switch
          value={autoRead === true}
          onValueChange={(on) => {
            onAutoChange(on);
            if (!on) narration.stop();
          }}
          accessibilityLabel={t('hs.lesson.autoRead')}
          trackColor={{ true: theme.color.primary, false: theme.color.border }}
          thumbColor={theme.color.surface}
        />
        <Text style={{ fontSize: 16, lineHeight: 22, color: theme.color.onSurfaceVariant }}>{t('hs.lesson.autoRead')}</Text>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  story: { fontSize: STORY_SIZE, lineHeight: STORY_LINE, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { height: 12, borderRadius: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
