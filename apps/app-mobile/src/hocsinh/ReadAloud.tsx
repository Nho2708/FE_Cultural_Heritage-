import { claimReading, readAlongLayout, READ_ALOUD_PREFETCH_COUNT, releaseReading } from '@dsvhvn/dung-chung/speech';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, Txt } from '../components/ui';
import { usePrefetchSpeech, useCloudNarration } from '../speech/useCloudNarration';
import { useTheme } from '../theme/ThemeProvider';

// Nghe bài đọc của bố cục cấp 2 và cấp 3: nút theo kiểu nút của bố cục (nút viền, cỡ theo bộ giao diện cấp) đọc từng câu của một đoạn nội dung bằng giọng của máy chủ,
// câu đang đọc được tô sáng, bấm lại để dừng. Chỉ một đoạn đọc một lúc, rời màn thì dừng (useCloudNarration tự dừng khi gỡ khỏi màn).

const LOCALE = 'vi-VN';

/** Nhờ máy chủ tạo trước tiếng khoảng 10 câu đầu của nội dung chính khi mở bài. */
export function usePrefetchMainContent(text: string | null | undefined) {
  const sentences = useMemo(() => readAlongLayout(text, LOCALE).sentences.slice(0, READ_ALOUD_PREFETCH_COUNT), [text]);
  usePrefetchSpeech(sentences);
}

/** Các đoạn văn của một nội dung kèm nút nghe và tô sáng câu đang đọc. `listenLabel` là chữ nút khi chưa đọc. Nội dung rỗng thì không vẽ gì. */
export function ReadAloud({ text, listenLabel }: { text: string | null | undefined; listenLabel: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const layout = useMemo(() => readAlongLayout(text, LOCALE), [text]);
  const narration = useCloudNarration(text ?? '', 'sentences');
  const { stop } = narration;

  useEffect(() => () => releaseReading(stop), [stop]);

  if (layout.sentences.length === 0) return null;
  const speaking = narration.status === 'playing';
  const toggle = () => {
    if (speaking) {
      stop();
      return;
    }
    claimReading(stop);
    narration.play();
  };

  return (
    <View style={{ gap: theme.spacing.inline / 1.5 }}>
      <Button
        label={narration.preparing ? t('hs.one.preparing') : speaking ? t('hs.lesson.stopListening') : listenLabel}
        accessibilityState={{ busy: narration.preparing }}
        variant="secondary"
        onPress={toggle}
      />
      <View style={{ gap: 8 }}>
        {layout.paragraphs.map((pieces, index) => (
          <Txt key={index}>
            {pieces.map((piece, position) => {
              const on = speaking && narration.index === piece.sentence;
              return (
                <Text key={position} style={on ? { backgroundColor: theme.color.primaryContainer, color: theme.color.onPrimaryContainer, fontWeight: '700' } : undefined}>
                  {piece.text}
                  {position < pieces.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </Txt>
        ))}
      </View>
    </View>
  );
}
