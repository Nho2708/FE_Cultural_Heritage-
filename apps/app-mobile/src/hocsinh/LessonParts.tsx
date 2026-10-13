import { paragraphsOf } from '@dsvhvn/dung-chung/lesson-data';
import type { StudentHeritageCard, StudentQuiz, StudentSection } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Photo } from '../components/Heritage';
import { Badge, Button, Card, EmptyState, Txt, styles as ui } from '../components/ui';
import { useNarration } from '../speech/useNarration';
import { useTheme } from '../theme/ThemeProvider';

// Các phần dùng chung của ba bố cục bài học: đoạn văn, hình có chú thích và ghi công, thẻ di sản của bài, danh sách bài kiểm tra kèm trạng thái, nút đọc to.

export function Paragraphs({ text }: { text: string | null | undefined }) {
  return (
    <>
      {paragraphsOf(text).map((paragraph, index) => (
        <Txt key={index}>{paragraph}</Txt>
      ))}
    </>
  );
}

/** Hình của bài kèm chú thích và dòng ghi công (tác giả, giấy phép, nguồn). */
export function Figure({ url, caption, image }: { url: string | null; caption: string | null; image: StudentSection['image'] }) {
  const theme = useTheme();
  const credit = image ? [image.author, image.license, image.source].filter(Boolean).join(' · ') || image.credit : null;
  if (!url) return null;
  return (
    <View style={{ gap: 4 }}>
      <Photo url={url} width={960} height={190} style={{ borderRadius: theme.radius.card }} />
      {caption ? <Txt variant="caption">{caption}</Txt> : null}
      {credit ? (
        <Txt variant="caption" muted>
          {credit}
        </Txt>
      ) : null}
    </View>
  );
}

/** Thẻ di sản của bài: mở trang chi tiết di sản (cùng trang với khách). */
export function HeritageLinks({ heritages, compact = false }: { heritages: StudentHeritageCard[]; compact?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  if (heritages.length === 0) return null;
  return (
    <View style={{ gap: theme.spacing.inline / 1.5 }}>
      {heritages.map((heritage) => (
        <Card key={heritage.id} onPress={() => router.push({ pathname: '/di-san/[slug]', params: { slug: heritage.slug } })} accessibilityLabel={heritage.name}>
          <View style={[ui.row, { gap: 12 }]}>
            {!compact ? <Photo url={heritage.thumbnailUrl} width={330} height={84} style={{ width: 84 }} /> : null}
            <View style={[ui.grow, { padding: 10, gap: 2 }]}>
              <Txt variant="label" numberOfLines={2}>
                {heritage.name}
              </Txt>
              {heritage.provinceName ? <Txt variant="caption">{heritage.provinceName}</Txt> : null}
              <Txt variant="caption" color={theme.color.link}>
                {t('hs.lesson.heritageOpen')}
              </Txt>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

/** Danh sách bài kiểm tra của bài kèm trạng thái với riêng em; cùng mã bài học mở luôn bài kiểm tra. */
export function QuizList({ quizzes, large = false }: { quizzes: StudentQuiz[]; large?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  if (quizzes.length === 0) return <EmptyState message={t('hs.lesson.noQuizzes')} />;
  return (
    <View style={{ gap: theme.spacing.inline / 1.5 }}>
      {quizzes.map((quiz) => {
        const open = quiz.state === 'OPEN' || quiz.state === 'IN_PROGRESS';
        const done = quiz.state === 'SUBMITTED';
        const action = open ? (quiz.state === 'IN_PROGRESS' ? t('hs.lesson.continue') : large ? t('hs.lesson.startPlay') : t('hs.lesson.start')) : done ? t('hs.lesson.viewResult') : null;
        return (
          <Card key={quiz.id}>
            <View style={{ padding: large ? 16 : 12, gap: 8 }}>
              <Txt variant={large ? 'heading' : 'title'} style={large ? { fontSize: theme.text.headingSize - 6 } : undefined}>
                {quiz.name}
              </Txt>
              {quiz.description ? <Txt variant="caption">{quiz.description}</Txt> : null}
              <View style={ui.wrap}>
                <Badge label={t('hs.home.questions', { count: quiz.questionCount })} />
                {quiz.timeLimitMinutes ? <Badge label={t('hs.home.minutes', { count: quiz.timeLimitMinutes })} /> : null}
                <Badge label={quiz.stateLabel} tone={done ? 'success' : open ? 'accent' : 'warning'} />
              </View>
              {action ? (
                <Button label={action} onPress={() => router.push({ pathname: '/kiem-tra/[quizId]', params: { quizId: String(quiz.id) } })} full={large} />
              ) : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/**
 * Nút loa đọc to một đoạn bằng giọng tiếng Việt của điện thoại; cấp 1 dùng để nghe chuyện và nghe câu hỏi. Không có giọng thì ẩn nút.
 * `auto` bật thì đọc ngay khi màn hình hiện ra (mỗi đoạn, mỗi câu một lần vì khối được dựng lại theo `key`); nút loa vẫn để dừng hoặc nghe lại.
 * Có `onAutoChange` thì hiện công tắc "Tự đọc to" để em tắt, tắt thì dừng ngay.
 */
export function ReadAloud({ text, label, big = false, auto = false, onAutoChange }: { text: string; label?: string; big?: boolean; auto?: boolean; onAutoChange?: (on: boolean) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const narration = useNarration(text, 'vi-VN');
  const { playWhenReady } = narration;
  useEffect(() => {
    if (auto) void playWhenReady();
  }, [auto, playWhenReady]);
  if (narration.voiceState === 'unsupported' || narration.sentences.length === 0) return null;
  const speaking = narration.status === 'playing';
  const size = big ? 64 : 44;
  return (
    <View style={{ gap: 8 }}>
      <View style={[ui.row, { gap: 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={speaking ? t('hs.lesson.stopReading') : (label ?? t('hs.lesson.readAloud'))}
          onPress={() => (speaking ? narration.stop() : narration.play())}
          style={[styles.speaker, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.color.primary }]}
        >
          <Text style={{ color: theme.color.onPrimary, fontSize: big ? 30 : 20 }}>{speaking ? '■' : '🔊'}</Text>
        </Pressable>
        <Txt variant="label" color={theme.color.primary} style={ui.grow}>
          {speaking ? t('hs.lesson.reading') : t('hs.lesson.tapSpeaker')}
        </Txt>
      </View>
      {onAutoChange ? (
        <View style={[ui.row, { gap: 10 }]}>
          <Switch
            value={auto}
            onValueChange={(on) => {
              onAutoChange(on);
              if (!on) narration.stop();
            }}
            accessibilityLabel={t('hs.lesson.autoRead')}
            trackColor={{ true: theme.color.primary, false: theme.color.border }}
          />
          <Txt variant="label">{t('hs.lesson.autoRead')}</Txt>
        </View>
      ) : null}
      {speaking ? (
        <Txt style={{ backgroundColor: theme.color.accent, color: theme.color.onAccent, borderRadius: 6, padding: 6 }}>{narration.sentences[narration.index] ?? ''}</Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  speaker: { alignItems: 'center', justifyContent: 'center' },
});
