import { CLOCK_WARNING_SECONDS, formatClock, hasAnswer, passageGroup } from '@dsvhvn/dung-chung';
import type { AttemptQuestion, QuestionSubmission, StudentAttempt, StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Photo } from '../components/Heritage';
import { Button, Card, Notice, Txt, styles as ui } from '../components/ui';
import { KEYS, prefs } from '../storage/keyValue';
import { useServices } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useAutoRead } from './autoRead';
import { ReadAloud } from './LessonParts';
import { PracticeRunner } from './levelOne/PracticeRunner';
import { QuestionInput, type QuizLevel } from './QuestionInput';
import { useQuizAttempt, type QuizAttemptSession, type SaveStatus } from './useQuizAttempt';

// Màn hình làm bài toàn màn hình. Ba bố cục riêng theo cấp học của lớp, học sinh không chọn: cấp 1 là bài chơi dạng luyện tập (kiểm từng câu, cho thử lại,
// ở levelOne/PracticeRunner); cấp 2 cân bằng, đồng hồ khi bài đặt giờ, bảng số câu ở đầu màn hình; cấp 3 gọn, luôn có đồng hồ, tư liệu ghim phía trên,
// đánh dấu câu cần xem lại. Lượt dùng chung với web. Máy chủ cũ chưa bật luyện tập cho cấp 1 thì cấp 1 làm từng câu một và lưu như cấp 2.

interface RunnerProps {
  attempt: StudentAttempt;
  onFinished: (result: StudentAttemptResult, automatic: boolean) => void;
  onPause: () => void;
}

interface LayoutProps {
  attempt: StudentAttempt;
  session: QuizAttemptSession;
  onPause: () => void;
}

export function QuizRunner(props: RunnerProps) {
  if (props.attempt.level === 1 && props.attempt.practiceMode) return <PracticeRunner {...props} />;
  return <SavingRunner {...props} />;
}

/** Bài làm lưu từng câu rồi nộp một lần (cấp 2, 3; cấp 1 khi máy chủ chưa bật luyện tập). */
function SavingRunner({ attempt, onFinished, onPause }: RunnerProps) {
  const { studentApi } = useServices();
  const { t } = useTranslation();
  const session = useQuizAttempt(studentApi, attempt, { saveFailed: t('hs.quiz.saveFailed'), submitFailed: t('hs.quiz.submitFailed') }, onFinished);
  if (attempt.level === 1) return <RunnerLevelOne attempt={attempt} session={session} onPause={onPause} />;
  if (attempt.level === 2) return <RunnerLevelTwo attempt={attempt} session={session} onPause={onPause} />;
  return <RunnerLevelThree attempt={attempt} session={session} onPause={onPause} />;
}

// ---- Thành phần dùng chung ----

function Clock({ session }: { session: QuizAttemptSession }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (session.remaining === null) return null;
  const warning = session.remaining <= CLOCK_WARNING_SECONDS;
  return (
    <View accessibilityRole="timer" accessibilityLabel={t('hs.quiz.clock', { time: formatClock(session.remaining) })} style={[local.clock, { backgroundColor: warning ? theme.color.incorrectContainer : theme.color.primaryContainer, borderRadius: theme.radius.control }]}>
      <Text style={{ color: warning ? theme.color.onIncorrectContainer : theme.color.onPrimaryContainer, fontWeight: '700', fontSize: theme.text.controlSize + 2, fontVariant: ['tabular-nums'] }}>⏱ {formatClock(session.remaining)}</Text>
    </View>
  );
}

function SaveNote({ status }: { status: SaveStatus }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (status === 'idle') return null;
  const text = status === 'saving' ? t('hs.quiz.saving') : status === 'saved' ? t('hs.quiz.saved') : t('hs.quiz.offline');
  return (
    <Txt variant="caption" color={status === 'offline' ? theme.color.incorrect : undefined} accessibilityLiveRegion="polite">
      {text}
    </Txt>
  );
}

function TimeUp({ session }: { session: QuizAttemptSession }) {
  const { t } = useTranslation();
  if (!session.timedOut) return null;
  return <Notice tone="error" text={t('hs.quiz.timeUp')} />;
}

/** Bảng số câu: chạm số để chuyển tới câu đó; đã trả lời, đang xem, chưa trả lời, đánh dấu xem lại. */
function QuestionGrid({ questions, answers, current, onGo, flagged }: { questions: readonly AttemptQuestion[]; answers: Readonly<Record<number, QuestionSubmission | null>>; current: number; onGo: (index: number) => void; flagged?: ReadonlySet<number> }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={ui.wrap}>
      {questions.map((question, index) => {
        const done = hasAnswer(question, answers[question.questionId]);
        const here = index === current;
        const mark = flagged?.has(question.questionId) ?? false;
        return (
          <Pressable
            key={question.questionId}
            accessibilityRole="button"
            accessibilityState={{ selected: here }}
            accessibilityLabel={t('hs.quiz.gridItem', { n: index + 1, state: done ? t('hs.quiz.answered') : t('hs.quiz.unanswered') })}
            onPress={() => onGo(index)}
            style={[local.gridItem, { borderColor: here ? theme.color.primary : theme.color.border, borderWidth: here ? 3 : 1.5, backgroundColor: done ? theme.color.primaryContainer : theme.color.surface, borderRadius: theme.radius.control }]}
          >
            <Text style={{ color: theme.color.onBackground, fontWeight: '700' }}>{index + 1}</Text>
            {mark ? <Text style={local.flag}>★</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Passage({ question }: { question: AttemptQuestion }) {
  const theme = useTheme();
  if (!question.passage) return null;
  return (
    <View style={{ borderLeftWidth: 4, borderLeftColor: theme.color.primary, backgroundColor: theme.color.surfaceContainerLow, padding: 12, gap: 6 }}>
      <Txt style={{ fontStyle: 'italic' }}>{question.passage}</Txt>
      {question.passageSource ? <Txt variant="caption">{question.passageSource}</Txt> : null}
    </View>
  );
}

function QuestionCard({ question, index, total, level, answer, onChange, readAloud, inlinePassage = true, disabled, aside }: { question: AttemptQuestion; index: number; total: number; level: QuizLevel; answer: QuestionSubmission | null; onChange: (next: QuestionSubmission) => void; readAloud: boolean; inlinePassage?: boolean; disabled: boolean; aside?: React.ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { autoRead, setAutoRead } = useAutoRead();
  const fill = question.questionType === 'FILL_BLANK';
  return (
    <Card>
      <View style={{ padding: theme.spacing.inline, gap: theme.spacing.inline }}>
        <View style={[ui.row, { flexWrap: 'wrap', gap: 8 }]}>
          <Txt variant="label" muted style={ui.grow}>
            {t('hs.quiz.questionOf', { n: index + 1, total })} · {question.typeName}
          </Txt>
          {question.point !== null ? <Txt variant="caption">{t('hs.quiz.points', { count: question.point })}</Txt> : null}
        </View>
        {inlinePassage ? <Passage question={question} /> : null}
        {question.imageUrl ? <Photo url={question.imageUrl} width={960} height={level === 1 ? 220 : 170} style={{ borderRadius: theme.radius.card }} /> : null}
        {!fill ? (
          <Txt variant="question" style={level === 1 ? { fontSize: theme.text.questionSize, lineHeight: theme.text.questionLineHeight } : undefined}>
            {question.content}
          </Txt>
        ) : null}
        {readAloud ? (
          <ReadAloud key={question.questionId} text={fill ? question.content.replace(/_{3,}/gu, '…') : question.content} big auto={autoRead === true} onAutoChange={setAutoRead} />
        ) : null}
        {aside}
        <QuestionInput question={question} answer={answer} onChange={onChange} level={level} disabled={disabled} />
      </View>
    </Card>
  );
}

/** Hộp xác nhận nộp bài: nêu các câu chưa trả lời. */
function SubmitSheet({ open, level, unanswered, submitting, error, onBack, onSubmit }: { open: boolean; level: QuizLevel; unanswered: number[]; submitting: boolean; error: string | null; onBack: () => void; onSubmit: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onBack}>
      <View style={local.backdrop}>
        <View style={[local.sheet, { backgroundColor: theme.color.surface, borderTopLeftRadius: theme.radius.card, borderTopRightRadius: theme.radius.card, padding: theme.spacing.inline, paddingBottom: theme.spacing.inline + insets.bottom, gap: 12 }]}>
          <Txt variant="heading" accessibilityRole="header">
            {level === 1 ? t('hs.quiz.doneTitleOne') : t('hs.quiz.submitTitle')}
          </Txt>
          {unanswered.length > 0 ? <Notice text={t('hs.quiz.unansweredList', { list: unanswered.join(', ') })} /> : <Txt>{t('hs.quiz.allAnswered')}</Txt>}
          <Txt muted>{t('hs.quiz.submitOnce')}</Txt>
          {error ? <Notice tone="error" text={error} /> : null}
          <Button label={t('hs.quiz.submitNow')} loading={submitting} onPress={onSubmit} full />
          <Button label={t('hs.quiz.keepWorking')} variant="secondary" disabled={submitting} onPress={onBack} full />
        </View>
      </View>
    </Modal>
  );
}

function Header({ attempt, session, onPause, onSubmit, compact }: { attempt: StudentAttempt; session: QuizAttemptSession; onPause: () => void; onSubmit: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[local.header, { paddingTop: insets.top + 8, backgroundColor: theme.color.surface, borderBottomColor: theme.color.border, gap: 4 }]}>
      <View style={[ui.row, { gap: 8 }]}>
        <Button label={t('hs.quiz.pause')} variant="ghost" onPress={onPause} />
        <View style={ui.grow} />
        {attempt.showsClock ? <Clock session={session} /> : null}
        <Button label={t('hs.quiz.submit')} onPress={onSubmit} disabled={session.submitting} />
      </View>
      <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
        {!compact ? (
          <Txt variant="caption" numberOfLines={1}>
            {attempt.lessonTitle}
          </Txt>
        ) : null}
        <Txt variant="title" numberOfLines={2}>
          {attempt.quizName}
        </Txt>
      </View>
    </View>
  );
}

// ---- Cấp 1 ----

function RunnerLevelOne({ attempt, session, onPause }: LayoutProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const total = attempt.questions.length;
  const question = attempt.questions[index]!;
  const last = index === total - 1;
  const goTo = (next: number) => {
    setIndex(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const goNext = () => {
    if (!last) goTo(index + 1);
    else if (session.unanswered.length > 0) setConfirming(true);
    else void session.submit();
  };

  return (
    <View style={[local.fill, { backgroundColor: theme.color.background }]}>
      <View style={[local.header, { paddingTop: insets.top + 8, backgroundColor: theme.color.surface, borderBottomColor: theme.color.border }]}>
        <View style={[ui.row, { gap: 10 }]}>
          <Button label={t('hs.quiz.pause')} variant="secondary" onPress={onPause} />
          <View style={ui.grow}>
            <Txt variant="title" numberOfLines={1}>
              {attempt.quizName}
            </Txt>
          </View>
          <Txt variant="label">{t('hs.quiz.questionShort', { n: index + 1, total })}</Txt>
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: theme.spacing.inline, gap: theme.spacing.inline, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <TimeUp session={session} />
        <QuestionCard key={question.questionId} question={question} index={index} total={total} level={1} answer={session.answers[question.questionId] ?? null} onChange={(answer) => session.setAnswer(question, answer)} readAloud={attempt.readAloud} disabled={session.submitting} />
        <SaveNote status={session.saveStatus} />
        <Button label={last ? t('hs.quiz.finishOne') : t('hs.lesson.next')} onPress={goNext} loading={session.submitting && last} full style={{ minHeight: 64 }} />
      </ScrollView>
      <SubmitSheet open={confirming} level={1} unanswered={session.unanswered} submitting={session.submitting} error={session.submitError} onBack={() => setConfirming(false)} onSubmit={() => void session.submit()} />
    </View>
  );
}

// ---- Cấp 2 ----

function RunnerLevelTwo({ attempt, session, onPause }: LayoutProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const total = attempt.questions.length;
  const question = attempt.questions[index]!;
  const goTo = (next: number) => {
    setIndex(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={[local.fill, { backgroundColor: theme.color.background }]}>
      <Header attempt={attempt} session={session} onPause={onPause} onSubmit={() => setConfirming(true)} />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: theme.spacing.inline, gap: theme.spacing.inline, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Txt variant="caption">{t('hs.quiz.progress', { done: session.answeredCount, total })}</Txt>
          <QuestionGrid questions={attempt.questions} answers={session.answers} current={index} onGo={goTo} />
        </View>
        <TimeUp session={session} />
        <QuestionCard key={question.questionId} question={question} index={index} total={total} level={2} answer={session.answers[question.questionId] ?? null} onChange={(answer) => session.setAnswer(question, answer)} readAloud={false} disabled={session.submitting} />
        <SaveNote status={session.saveStatus} />
        <View style={[ui.row, { gap: 12 }]}>
          <Button label={t('hs.quiz.prev')} variant="secondary" disabled={index === 0} onPress={() => goTo(index - 1)} style={ui.grow} />
          <Button label={t('hs.quiz.nextQuestion')} disabled={index === total - 1} onPress={() => goTo(index + 1)} style={ui.grow} />
        </View>
      </ScrollView>
      <SubmitSheet open={confirming} level={2} unanswered={session.unanswered} submitting={session.submitting} error={session.submitError} onBack={() => setConfirming(false)} onSubmit={() => void session.submit()} />
    </View>
  );
}

// ---- Cấp 3 ----

function parseFlags(raw: string | null): number[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];
  } catch {
    return [];
  }
}

function RunnerLevelThree({ attempt, session, onPause }: LayoutProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set());
  const scroll = useRef<ScrollView>(null);
  const flagKey = `${KEYS.quizFlags}.${attempt.id}`;
  const total = attempt.questions.length;
  const question = attempt.questions[index]!;
  const group = passageGroup(attempt.questions, index);
  const flagged = flags.has(question.questionId);

  // Dấu "xem lại" nhớ trên máy này để mở lại bài còn giữ.
  useEffect(() => {
    let cancelled = false;
    void prefs.get(flagKey).then((raw) => {
      if (!cancelled) setFlags(new Set(parseFlags(raw)));
    });
    return () => {
      cancelled = true;
    };
  }, [flagKey]);

  const toggleFlag = () => {
    const next = new Set(flags);
    if (next.has(question.questionId)) next.delete(question.questionId);
    else next.add(question.questionId);
    setFlags(next);
    void prefs.set(flagKey, JSON.stringify([...next]));
  };
  const goTo = (next: number) => {
    setIndex(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={[local.fill, { backgroundColor: theme.color.background }]}>
      <Header attempt={attempt} session={session} onPause={onPause} onSubmit={() => setConfirming(true)} compact />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: theme.spacing.inline, gap: theme.spacing.inline, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Txt variant="caption">
            {t('hs.quiz.progress', { done: session.answeredCount, total })}
            {flags.size > 0 ? ` · ${t('hs.quiz.flaggedCount', { count: flags.size })}` : ''}
          </Txt>
          <QuestionGrid questions={attempt.questions} answers={session.answers} current={index} onGo={goTo} flagged={flags} />
        </View>
        <TimeUp session={session} />
        {group ? (
          <View style={{ gap: 6 }}>
            <Txt variant="caption">{group.last > group.first ? t('hs.quiz.passageForRange', { first: group.first, last: group.last }) : t('hs.quiz.passageFor', { first: group.first })}</Txt>
            <Passage question={question} />
          </View>
        ) : null}
        <QuestionCard
          key={question.questionId}
          question={question}
          index={index}
          total={total}
          level={3}
          answer={session.answers[question.questionId] ?? null}
          onChange={(answer) => session.setAnswer(question, answer)}
          readAloud={false}
          inlinePassage={false}
          disabled={session.submitting}
          aside={<Button label={flagged ? `★ ${t('hs.quiz.flagged')}` : `☆ ${t('hs.quiz.flag')}`} variant="secondary" onPress={toggleFlag} />}
        />
        <SaveNote status={session.saveStatus} />
        <View style={[ui.row, { gap: 12 }]}>
          <Button label={t('hs.quiz.prev')} variant="secondary" disabled={index === 0} onPress={() => goTo(index - 1)} style={ui.grow} />
          <Button label={t('hs.quiz.nextQuestion')} disabled={index === total - 1} onPress={() => goTo(index + 1)} style={ui.grow} />
        </View>
      </ScrollView>
      <SubmitSheet open={confirming} level={3} unanswered={session.unanswered} submitting={session.submitting} error={session.submitError} onBack={() => setConfirming(false)} onSubmit={() => void session.submit()} />
    </View>
  );
}

const local = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1 },
  clock: { paddingHorizontal: 10, paddingVertical: 6 },
  gridItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flag: { position: 'absolute', top: -2, right: 3, color: '#B45309', fontSize: 14 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {},
});
