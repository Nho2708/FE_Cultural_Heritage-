import { formatDateTime } from '@dsvhvn/dung-chung';
import { ApiError, type StudentAttempt, type StudentAttemptResult, type StudentQuizIntro } from '@dsvhvn/dung-chung/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, ErrorState, Loading, Notice, Screen, Txt, styles as ui } from '../../src/components/ui';
import { BIG, GUTTER, Mascot } from '../../src/hocsinh/levelOne/parts';
import { QuizRunner } from '../../src/hocsinh/QuizRunner';
import { serverErrorText } from '../../src/hocsinh/serverErrorText';
import { useAuth, useServices } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Làm bài kiểm tra: giới thiệu (tên, số câu, thời gian, giờ đóng, "em chỉ làm một lần", nút theo việc em làm được lúc này), rồi làm bài toàn màn hình theo bố cục của cấp,
// nộp bài và sang kết quả. Cùng một lượt với web học tập: bắt đầu ở nơi này thì vào tiếp được ở nơi kia.
// Cấp 1 có trang giới thiệu riêng: linh vật, tên bài, số câu, lời nhắc của máy chủ, nút "Bắt đầu chơi" 64 px; không chữ nhỏ, không emoji.
// Trang học mở với `tiep=1` (lượt đang chơi dở) thì vào thẳng bài chơi, không dừng ở trang giới thiệu.

function LevelOneIntro({ data, starting, startError, onStart, onResult, onLater }: { data: StudentQuizIntro; starting: boolean; startError: string | null; onStart: () => void; onResult: () => void; onLater: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const open = data.action === 'START' || data.action === 'CONTINUE';
  return (
    <ScrollView style={{ backgroundColor: theme.color.background }} contentContainerStyle={[local.intro, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <View style={local.center}>
        <Mascot size={104} mood="chao" />
        <Txt variant="heading" accessibilityRole="header" style={ui.centerText}>
          {data.name ?? t('hs.quiz.title')}
        </Txt>
        <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '700', color: theme.color.primary }}>{t('hs.one.playQuestions', { count: data.questionCount })}</Text>
      </View>
      {data.description ? <Txt>{data.description}</Txt> : null}
      {data.notice ? <Notice text={data.notice} /> : null}
      {startError ? <Notice text={startError} /> : null}
      {open ? <Button label={data.action === 'CONTINUE' ? t('hs.one.continue') : t('hs.one.begin')} loading={starting} onPress={onStart} full style={{ minHeight: BIG }} /> : null}
      {data.action === 'VIEW_RESULT' && data.attemptId !== null ? <Button label={t('hs.one.playView')} onPress={onResult} full style={{ minHeight: BIG }} /> : null}
      <Button label={open ? t('hs.one.later') : t('hs.quiz.close')} variant="secondary" onPress={onLater} full style={{ minHeight: BIG }} />
    </ScrollView>
  );
}

export default function TakeQuiz() {
  const { quizId: quizParam, tiep } = useLocalSearchParams<{ quizId: string; tiep?: string }>();
  const quizId = Number(quizParam);
  const { studentApi } = useServices();
  const { session } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const intro = useQuery({
    queryKey: ['student', session?.user.id ?? null, 'quiz', quizId],
    enabled: Number.isInteger(quizId) && session !== null,
    staleTime: 0,
    retry: false,
    queryFn: async () => (await studentApi.quizIntro(quizId)).data,
  });
  const attemptId = intro.data?.attemptId ?? null;

  const start = useCallback(async () => {
    setStarting(true);
    setStartError(null);
    try {
      const { data: started } = await studentApi.startAttempt(quizId);
      setAttempt(started);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && attemptId !== null) {
        router.replace({ pathname: '/ket-qua/[luot]', params: { luot: String(attemptId) } });
        return;
      }
      setStartError(serverErrorText(error, t('hs.common.error')));
    } finally {
      setStarting(false);
    }
  }, [attemptId, quizId, router, studentApi, t]);

  // Vào thẳng lượt đang chơi dở khi trang học yêu cầu (một lần).
  const continuing = tiep === '1' && intro.data?.action === 'CONTINUE';
  useEffect(() => {
    if (!continuing || autoStarted.current) return;
    autoStarted.current = true;
    void start();
  }, [continuing, start]);

  if (!session) return <Redirect href="/" />;

  const goHome = () => router.replace('/(hoc-sinh)/hoc');
  const finished = (result: StudentAttemptResult) => {
    queryClient.setQueryData(['student', session.user.id, 'result', result.attemptId], result);
    // Mọi màn hình đọc kết quả hay trạng thái bài kiểm tra phải lấy lại sau khi nộp (bài học còn ghi "Đang mở", gợi ý còn ghi "chưa có bài làm", album chưa có thẻ mới).
    for (const part of ['home', 'progress', 'history', 'recommendations', 'lesson', 'album']) {
      void queryClient.invalidateQueries({ queryKey: ['student', session.user.id, part] });
    }
    void queryClient.invalidateQueries({ queryKey: ['student', session.user.id, 'quiz', quizId] });
    router.replace({ pathname: '/ket-qua/[luot]', params: { luot: String(result.attemptId) } });
  };

  if (attempt) return <QuizRunner key={attempt.id} attempt={attempt} onFinished={finished} onPause={goHome} />;

  if (intro.isLoading || (continuing && !startError)) return <Loading label={t('hs.common.loading')} />;
  if (intro.isError || !intro.data) {
    const message = serverErrorText(intro.error, t('hs.common.error'));
    return <ErrorState message={message} retryLabel={t('hs.common.retry')} onRetry={() => void intro.refetch()} />;
  }
  const data: StudentQuizIntro = intro.data;
  const timed = data.timeLimitMinutes !== null;
  const open = data.action === 'START' || data.action === 'CONTINUE';
  const name = data.name ?? t('hs.quiz.title');
  const later = () => (router.canGoBack() ? router.back() : goHome());
  const viewResult = () => router.replace({ pathname: '/ket-qua/[luot]', params: { luot: String(data.attemptId) } });

  if (data.level === 1) return <LevelOneIntro data={data} starting={starting} startError={startError} onStart={() => void start()} onResult={viewResult} onLater={later} />;

  return (
    <Screen style={{ paddingTop: insets.top + 16 }}>
      <Txt variant="caption" muted>
        {t('hs.quiz.lessonLabel', { title: data.lessonTitle ?? '' })}
      </Txt>
      <Txt variant="heading" accessibilityRole="header">
        {name}
      </Txt>
      <View style={ui.wrap}>
        <Badge label={t('hs.home.questions', { count: data.questionCount })} />
        {timed ? <Badge label={t('hs.home.minutes', { count: data.timeLimitMinutes ?? 0 })} /> : <Badge label={t('hs.quiz.noTimeLimit')} />}
        {data.closeAt ? <Badge label={t('hs.quiz.closeAt', { time: formatDateTime(data.closeAt) })} tone="warning" /> : null}
      </View>
      {data.description ? (
        <View style={{ gap: 4 }}>
          <Txt variant="label">{t('hs.quiz.teacherNote')}</Txt>
          <Txt>{data.description}</Txt>
        </View>
      ) : null}
      {data.action === 'START' ? <Txt>{timed ? t('hs.quiz.introStartTimed', { name, count: data.questionCount, minutes: data.timeLimitMinutes ?? 0 }) : t('hs.quiz.introStartUntimed', { name, count: data.questionCount })}</Txt> : null}
      {data.action === 'CONTINUE' ? <Txt>{t('hs.quiz.introContinue')}</Txt> : null}
      {data.action === 'VIEW_RESULT' ? <Txt>{t('hs.quiz.introDone')}</Txt> : null}
      {data.notice ? <Notice text={data.notice} /> : null}
      {open ? <Notice text={timed ? t('hs.quiz.onceTimed') : t('hs.quiz.once')} /> : null}
      {startError ? <Notice tone="error" text={startError} /> : null}
      {open ? <Button label={data.action === 'CONTINUE' ? t('hs.lesson.continue') : t('hs.quiz.begin')} loading={starting} onPress={() => void start()} full /> : null}
      {data.action === 'VIEW_RESULT' && data.attemptId !== null ? <Button label={t('hs.lesson.viewResult')} onPress={viewResult} full /> : null}
      <Button label={open ? t('hs.quiz.later') : t('hs.quiz.close')} variant="secondary" onPress={later} full />
    </Screen>
  );
}

const local = StyleSheet.create({
  intro: { paddingHorizontal: GUTTER, gap: 20 },
  center: { alignItems: 'center', gap: 10 },
});
