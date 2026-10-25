import { checksOnTap, levelOneInstruction, type PracticeFeedback } from '@dsvhvn/dung-chung';
import type { StudentAttempt, StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Photo } from '../../components/Heritage';
import { Button, Notice, Txt } from '../../components/ui';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useServices } from '../../state/AppProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { useAutoRead } from '../autoRead';
import { QuestionInput } from '../QuestionInput';
import { BIG, GUTTER, IconCircleButton, Mascot, SpeakButton } from './parts';
import { usePracticeAttempt, type DotState, type PracticeSession } from './usePracticeAttempt';

/** Các lệnh gọi máy chủ của bài chơi; mặc định lấy từ dịch vụ của app. */
type PracticeApi = Parameters<typeof usePracticeAttempt>[0];

// Màn hình bài chơi cấp 1 dạng luyện tập: đầu trang chỉ có nút tạm dừng, chấm tròn tiến độ và linh vật nhỏ (không hàng sao, không "Câu x / y",
// không dòng lưu nháp, không "Câu trước", không đồng hồ). Câu hỏi 28 px có nút nghe 64 px (tự đọc khi bài bật đọc to), dòng hướng dẫn có nút nghe.
// Kiểm xong thì bảng phản hồi trượt lên từ dưới: linh vật, tiêu đề, lời nhắn, nút nghe, nút hành động. Màu bảng: đúng là khối xanh lá nhạt của
// bộ giao diện, thử lại là khối vàng nhạt, chỉ đáp án là khối xanh dương nhạt; không có chữ "Sai" màu đỏ.

function Dots({ dots }: { dots: DotState[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const current = dots.indexOf('current');
  return (
    <View style={local.dots} accessible accessibilityRole="progressbar" accessibilityLabel={t('hs.one.questionOf', { n: current + 1, total: dots.length })}>
      {dots.map((state, index) => (
        <View
          key={index}
          style={[
            local.dot,
            state === 'current'
              ? { width: 28, backgroundColor: theme.color.primary }
              : state === 'done'
                ? { backgroundColor: theme.color.accent }
                : { backgroundColor: theme.color.surface, borderWidth: 2, borderColor: theme.color.border },
          ]}
        />
      ))}
    </View>
  );
}

type SheetTone = PracticeFeedback['tone'] | 'offline';

/** Bảng trượt lên từ dưới (phản hồi sau khi kiểm, hoặc mất mạng). Tắt chuyển động thì hiện ngay. */
function Sheet({ tone, title, text, speech, action, busy, autoRead, onAction, onHeight }: { tone: SheetTone; title: string | null; text: string; speech: string; action: string; busy: boolean; autoRead: boolean; onAction: () => void; onHeight: (height: number) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [offset] = useState(() => new Animated.Value(320));
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      offset.setValue(0);
      return;
    }
    const animation = Animated.timing(offset, { toValue: 0, duration: 220, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [offset, reduced]);
  const palette =
    tone === 'correct'
      ? { bg: theme.color.correctContainer, fg: theme.color.onCorrectContainer, border: theme.color.correct }
      : tone === 'reveal'
        ? { bg: theme.color.primaryContainer, fg: theme.color.onPrimaryContainer, border: theme.color.primary }
        : { bg: theme.color.surfaceContainerLow, fg: theme.color.onBackground, border: theme.color.accent };
  return (
    <Animated.View
      accessibilityViewIsModal
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      style={[local.sheet, { backgroundColor: palette.bg, borderColor: palette.border, paddingBottom: 16 + insets.bottom, transform: [{ translateY: offset }] }]}
    >
      <View style={local.sheetTop}>
        <Mascot size={56} mood={tone === 'correct' ? 'chuc-mung' : tone === 'reveal' ? 'chao' : 'dong-vien'} />
        <View style={{ flex: 1 }}>
          {title ? (
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontSize: 24, lineHeight: 30, fontWeight: '800', color: palette.fg }}>
              {title}
            </Text>
          ) : null}
        </View>
        <SpeakButton text={speech} label={t('hs.one.speakFeedback')} auto={autoRead} />
      </View>
      <Text accessibilityLiveRegion={title ? undefined : 'polite'} style={{ fontSize: 20, lineHeight: 30, color: palette.fg }}>
        {text}
      </Text>
      <Button label={action} onPress={onAction} loading={busy} full style={{ minHeight: BIG }} />
    </Animated.View>
  );
}

function Body({ attempt, session, onPause }: { attempt: StudentAttempt; session: PracticeSession; onPause: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { autoRead, setAutoRead } = useAutoRead();
  const [sheetHeight, setSheetHeight] = useState(0);
  const { question, phase, feedback } = session;
  const tapType = checksOnTap(question.questionType);
  const instruction = levelOneInstruction(question.questionType);
  const sheetOpen = phase === 'feedback' || phase === 'offline';

  return (
    <View style={[local.fill, { backgroundColor: theme.color.background }]}>
      <View style={[local.header, { paddingTop: insets.top + 8, backgroundColor: theme.color.surface, borderBottomColor: theme.color.border }]}>
        <IconCircleButton icon="pause" label={t('hs.one.pause')} onPress={onPause} />
        <Dots dots={session.dots} />
        <Mascot size={48} mood="chao" />
      </View>
      {/* Dựng lại theo câu để mỗi câu mới bắt đầu ở đầu màn hình. */}
      <ScrollView key={question.questionId} contentContainerStyle={{ padding: GUTTER, gap: 18, paddingBottom: (sheetOpen ? sheetHeight : 0) + 32 }} keyboardShouldPersistTaps="handled">
        <View style={local.questionRow}>
          <SpeakButton key={`q${question.questionId}`} text={question.content} label={t('hs.one.speakQuestion')} size={64} auto={attempt.readAloud && autoRead === true} />
          <Txt variant="question" style={{ flex: 1 }}>
            {question.content}
          </Txt>
        </View>
        {question.imageUrl ? <Photo url={question.imageUrl} width={960} height={200} style={{ borderRadius: theme.radius.card }} /> : null}
        <View style={local.instruction}>
          <SpeakButton key={`h${question.questionId}`} text={instruction} label={t('hs.one.speakInstruction')} soft />
          <Text style={{ flex: 1, fontSize: 18, lineHeight: 26, fontWeight: '600', color: theme.color.onSurfaceVariant }}>{instruction}</Text>
        </View>
        <QuestionInput
          key={question.questionId}
          question={question}
          answer={session.answer}
          onChange={session.setAnswer}
          level={1}
          practice
          wrong={session.wrong}
          solved={session.solved}
          marks={session.marks}
          disabled={phase !== 'answer' || session.solved}
        />
        {session.error ? <Notice text={session.error} /> : null}
        {!tapType && !session.solved ? (
          <Button label={t('hs.one.check')} onPress={session.check} disabled={!session.canCheck} loading={phase === 'checking'} full style={{ minHeight: BIG }} />
        ) : null}
        {tapType && phase === 'checking' ? <ActivityIndicator color={theme.color.primary} /> : null}
        {phase === 'submitting' ? (
          <View style={local.sending} accessibilityRole="progressbar" accessibilityLabel={t('hs.one.sending')}>
            <ActivityIndicator color={theme.color.primary} />
            <Txt muted>{t('hs.one.sending')}</Txt>
          </View>
        ) : null}
        <View style={local.switchRow}>
          <Switch value={autoRead === true} onValueChange={setAutoRead} accessibilityLabel={t('hs.lesson.autoRead')} trackColor={{ true: theme.color.primary, false: theme.color.border }}
          thumbColor={theme.color.surface} />
          <Text style={{ fontSize: 16, lineHeight: 22, color: theme.color.onSurfaceVariant }}>{t('hs.lesson.autoRead')}</Text>
        </View>
      </ScrollView>
      {phase === 'feedback' && feedback ? (
        <Sheet
          key={`${question.questionId}-${feedback.tone}-${session.wrong.size}`}
          tone={feedback.tone}
          title={feedback.title}
          text={feedback.text}
          speech={feedback.speech}
          action={feedback.action}
          busy={false}
          autoRead={autoRead === true}
          onAction={session.act}
          onHeight={setSheetHeight}
        />
      ) : null}
      {phase === 'offline' ? (
        <Sheet key="offline" tone="offline" title={null} text={t('hs.one.network')} speech={t('hs.one.network')} action={t('hs.common.retry')} busy={false} autoRead={false} onAction={session.retry} onHeight={setSheetHeight} />
      ) : null}
    </View>
  );
}

export function PracticeRunner({ attempt, onFinished, onPause, api }: { attempt: StudentAttempt; onFinished: (result: StudentAttemptResult, automatic: boolean) => void; onPause: () => void; api?: PracticeApi }) {
  const { studentApi } = useServices();
  const { t } = useTranslation();
  const session = usePracticeAttempt(api ?? studentApi, attempt, { checkFailed: t('hs.one.network') }, onFinished);
  return <Body attempt={attempt} session={session} onPause={onPause} />;
}

const local = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10, borderBottomWidth: 1 },
  dots: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sending: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 18, gap: 12, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 3 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
