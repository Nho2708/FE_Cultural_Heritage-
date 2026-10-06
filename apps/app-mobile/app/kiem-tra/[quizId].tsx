import { formatDateTime } from '@dsvhvn/dung-chung';
import { ApiError, type StudentAttempt, type StudentAttemptResult, type StudentQuizIntro } from '@dsvhvn/dung-chung/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, ErrorState, Loading, Notice, Screen, Txt, styles as ui } from '../../src/components/ui';
import { QuizRunner } from '../../src/hocsinh/QuizRunner';
import { useAuth, useServices } from '../../src/state/AppProvider';

// Làm bài kiểm tra: giới thiệu (tên, số câu, thời gian, giờ đóng, "em chỉ làm một lần", nút theo việc em làm được lúc này), rồi làm bài toàn màn hình theo bố cục của cấp,
// nộp bài và sang kết quả. Cùng một lượt với web học tập: bắt đầu ở nơi này thì vào tiếp được ở nơi kia.

export default function TakeQuiz() {
  const { quizId: quizParam } = useLocalSearchParams<{ quizId: string }>();
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

  const intro = useQuery({
    queryKey: ['student', session?.user.id ?? null, 'quiz', quizId],
    enabled: Number.isInteger(quizId) && session !== null,
    staleTime: 0,
    retry: false,
    queryFn: async () => (await studentApi.quizIntro(quizId)).data,
  });

  if (!session) return <Redirect href="/" />;

  const goHome = () => router.replace('/(hoc-sinh)/hoc');
  const finished = (result: StudentAttemptResult) => {
    queryClient.setQueryData(['student', session.user.id, 'result', result.attemptId], result);
    void queryClient.invalidateQueries({ queryKey: ['student', session.user.id, 'home'] });
    void queryClient.invalidateQueries({ queryKey: ['student', session.user.id, 'progress'] });
    void queryClient.invalidateQueries({ queryKey: ['student', session.user.id, 'quiz', quizId] });
    router.replace({ pathname: '/ket-qua/[luot]', params: { luot: String(result.attemptId) } });
  };

  if (attempt) return <QuizRunner key={attempt.id} attempt={attempt} onFinished={finished} onPause={goHome} />;

  if (intro.isLoading) return <Loading label={t('hs.common.loading')} />;
  if (intro.isError || !intro.data) {
    const message = intro.error instanceof ApiError ? intro.error.message : t('hs.common.error');
    return <ErrorState message={message} retryLabel={t('hs.common.retry')} onRetry={() => void intro.refetch()} />;
  }
  const data: StudentQuizIntro = intro.data;
  const timed = data.timeLimitMinutes !== null;
  const open = data.action === 'START' || data.action === 'CONTINUE';
  const name = data.name ?? t('hs.quiz.title');

  const start = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const { data: started } = await studentApi.startAttempt(quizId);
      setAttempt(started);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && data.attemptId !== null) {
        router.replace({ pathname: '/ket-qua/[luot]', params: { luot: String(data.attemptId) } });
        return;
      }
      setStartError(error instanceof ApiError ? error.message : t('hs.common.error'));
    } finally {
      setStarting(false);
    }
  };

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
      {data.action === 'VIEW_RESULT' && data.attemptId !== null ? (
        <Button label={t('hs.lesson.viewResult')} onPress={() => router.replace({ pathname: '/ket-qua/[luot]', params: { luot: String(data.attemptId) } })} full />
      ) : null}
      <Button label={open ? t('hs.quiz.later') : t('hs.quiz.close')} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : goHome())} full />
    </Screen>
  );
}
