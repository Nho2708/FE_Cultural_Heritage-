import { clampStars, formatDuration, formatNumber, formatPercent, formatScore } from '@dsvhvn/dung-chung';
import type { StudentAnalysis, StudentAttemptResult, StudentBadge, StudentQuestionReview, StudentTopic } from '@dsvhvn/dung-chung/api';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, ErrorState, Loading, Screen, Section, Txt, styles as ui } from '../../src/components/ui';
import { answerLines, type ReviewWords } from '../../src/hocsinh/reviewText';
import { starsText } from '../../src/hocsinh/format';
import { Recommendations } from '../../src/hocsinh/Recommendations';
import { useAuth, useServices } from '../../src/state/AppProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

// Kết quả một lượt đã nộp, trình bày khác nhau theo cấp: cấp 1 sao và lời khen (không điểm, không đúng sai); cấp 2 điểm, số câu đúng sai và xem lại từng câu;
// cấp 3 thêm phân tích theo di sản và theo dạng câu. Nội dung do máy chủ tính theo cấp hiện tại của lớp.

function BadgeList({ badges, level }: { badges: StudentBadge[]; level: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  if (badges.length === 0) return null;
  return (
    <Section title={level === 1 ? t('hs.result.newBadges') : t('hs.result.badges')}>
      {badges.map((badge) => (
        <Card key={badge.code}>
          <View style={{ padding: 12, gap: 2 }}>
            <Txt variant="label">🏅 {badge.name}</Txt>
            <Txt variant="caption">{badge.description}</Txt>
          </View>
        </Card>
      ))}
    </Section>
  );
}

function Review({ result }: { result: StudentAttemptResult }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const words: ReviewWords = { yes: t('hs.quiz.true'), no: t('hs.quiz.false'), empty: t('hs.result.noAnswer'), imageN: (letter) => t('hs.quiz.imageN', { letter }) };
  const questions: StudentQuestionReview[] = result.questions ?? [];
  if (!result.answersShown || questions.length === 0) return null;
  return (
    <Section title={t('hs.result.review')}>
      {questions.map((item) => {
        const mark = item.isCorrect === null ? null : item.isCorrect ? '✓' : '✗';
        return (
          <Card key={item.question.questionId}>
            <View style={{ padding: 12, gap: 8 }}>
              <View style={[ui.row, { alignItems: 'flex-start', gap: 8 }]}>
                {mark ? (
                  <Text accessibilityLabel={item.isCorrect ? t('hs.result.correct') : t('hs.result.wrong')} style={{ color: item.isCorrect ? theme.color.correct : theme.color.incorrect, fontSize: 22, fontWeight: '700' }}>
                    {mark}
                  </Text>
                ) : null}
                <Txt variant="label" style={ui.grow}>
                  {t('hs.quiz.questionOf', { n: item.question.position, total: questions.length })}: {item.question.content}
                </Txt>
              </View>
              {item.partsTotal !== null && item.partsTotal > 1 ? (
                <Txt variant="caption">{t('hs.result.parts', { correct: item.partsCorrect ?? 0, total: item.partsTotal })}</Txt>
              ) : null}
              <View style={{ gap: 2 }}>
                <Txt variant="caption">{t('hs.result.yourAnswer')}</Txt>
                {answerLines(item.question, item.question.answer, words).map((line, i) => (
                  <Txt key={i}>{line}</Txt>
                ))}
              </View>
              {item.isCorrect !== true ? (
                <View style={{ gap: 2 }}>
                  <Txt variant="caption" color={theme.color.correct}>
                    {t('hs.result.correctAnswer')}
                  </Txt>
                  {answerLines(item.question, item.correctAnswer, words).map((line, i) => (
                    <Txt key={i}>{line}</Txt>
                  ))}
                </View>
              ) : null}
              {item.explanation ? <Txt variant="caption">{item.explanation}</Txt> : null}
            </View>
          </Card>
        );
      })}
    </Section>
  );
}

function TopicRows({ title, topics }: { title: string; topics: StudentTopic[] }) {
  const theme = useTheme();
  if (topics.length === 0) return null;
  return (
    <Section title={title}>
      <Card>
        {topics.map((topic, index) => (
          <View key={`${topic.heritageId}-${topic.questionType}-${index}`} style={[ui.row, { padding: 10, gap: 10 }]}>
            <Txt style={ui.grow}>{topic.name}</Txt>
            <Txt variant="caption">
              {topic.correct}/{topic.answered}
            </Txt>
            <Txt variant="label" color={theme.color.primary} style={{ width: 52, textAlign: 'right' }}>
              {Math.round(topic.ratePercent)}%
            </Txt>
          </View>
        ))}
      </Card>
    </Section>
  );
}

function Analysis({ analysis }: { analysis: StudentAnalysis }) {
  const { t } = useTranslation();
  return (
    <>
      {analysis.partsTotal > 0 ? <Txt variant="caption">{t('hs.result.partsSummary', { correct: analysis.partsCorrect, total: analysis.partsTotal })}</Txt> : null}
      <TopicRows title={t('hs.result.byHeritage')} topics={analysis.byHeritage} />
      <TopicRows title={t('hs.result.byType')} topics={analysis.byQuestionType} />
      <TopicRows title={t('hs.result.toReview')} topics={analysis.heritagesToReview} />
    </>
  );
}

export default function ResultScreen() {
  const { luot } = useLocalSearchParams<{ luot: string }>();
  const attemptId = Number(luot);
  const { studentApi } = useServices();
  const { session } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useQuery({
    queryKey: ['student', session?.user.id ?? null, 'result', attemptId],
    enabled: Number.isInteger(attemptId) && session !== null,
    queryFn: async () => (await studentApi.result(attemptId)).data,
  });

  // Gợi ý theo lượt vừa làm: nên làm tiếp, nên ôn, di sản liên quan.
  const recommendations = useQuery({
    queryKey: ['student', session?.user.id ?? null, 'result-recommendations', attemptId],
    enabled: Number.isInteger(attemptId) && session !== null,
    queryFn: async () => (await studentApi.attemptRecommendations(attemptId)).data,
  });

  if (!session) return <Redirect href="/" />;
  if (query.isLoading) return <Loading label={t('hs.common.loading')} />;
  if (query.isError || !query.data) return <ErrorState message={t('hs.common.error')} retryLabel={t('hs.common.retry')} onRetry={() => void query.refetch()} />;
  const result = query.data;
  const level = result.level;
  const stars = clampStars(result.stars);

  return (
    <Screen style={{ paddingTop: insets.top + 16 }}>
      <Txt variant="caption" muted>
        {result.lessonTitle}
      </Txt>
      <Txt variant="heading" accessibilityRole="header">
        {result.quizName}
      </Txt>

      {level === 1 ? (
        <View style={[ui.center, { backgroundColor: theme.color.primaryContainer, borderRadius: theme.radius.card }]}>
          <Text style={{ fontSize: 56 }}>{stars >= 2 ? '🎉' : '💪'}</Text>
          <Text accessibilityLabel={`${stars}/3`} style={{ fontSize: 48, color: theme.color.primary }}>
            {starsText(stars)}
          </Text>
          <Txt variant="heading" color={theme.color.onPrimaryContainer} style={ui.centerText}>
            {result.praise}
          </Txt>
          <Txt color={theme.color.onPrimaryContainer} style={ui.centerText}>
            {stars === 3 ? t('hs.result.praiseThree') : t('hs.result.praiseTry')}
          </Txt>
        </View>
      ) : (
        <Card>
          <View style={{ padding: 16, gap: 6 }}>
            <Txt variant="heading" color={theme.color.primary}>
              {formatScore(result.score, result.totalPoint)}
              {result.percent !== null ? `  (${formatPercent(result.percent)})` : ''}
            </Txt>
            <View style={ui.wrap}>
              {result.correctCount !== null ? <Badge label={t('hs.result.countCorrect', { count: result.correctCount })} tone="success" /> : null}
              {result.wrongCount !== null ? <Badge label={t('hs.result.countWrong', { count: result.wrongCount })} tone="warning" /> : null}
              {result.blankCount ? <Badge label={t('hs.result.countBlank', { count: result.blankCount })} /> : null}
            </View>
            <Txt variant="caption">
              {result.statusLabel}
              {result.durationSeconds !== null ? ` · ${t('hs.result.duration', { time: formatDuration(result.durationSeconds) })}` : ''}
            </Txt>
            {result.praise ? <Txt>{result.praise}</Txt> : null}
            {level === 3 && result.totalQuestions > 0 ? <Txt variant="caption">{t('hs.result.totalQuestions', { count: formatNumber(result.totalQuestions) })}</Txt> : null}
          </View>
        </Card>
      )}

      <BadgeList badges={result.badges} level={level} />
      {level === 3 && result.analysis ? <Analysis analysis={result.analysis} /> : null}
      <Review result={result} />
      {recommendations.data ? <Recommendations data={recommendations.data} /> : null}

      <Button label={t('hs.lesson.backHome')} onPress={() => router.replace('/(hoc-sinh)/hoc')} full />
      <Button label={t('hs.tabs.progress')} variant="secondary" onPress={() => router.replace('/(hoc-sinh)/tien-do')} full />
    </Screen>
  );
}
