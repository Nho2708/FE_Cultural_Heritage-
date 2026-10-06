import type { StudentHome, StudentLessonRef, StudentOpenQuiz } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, EmptyState, ErrorState, Loading, Section, Txt, styles as ui } from '../../src/components/ui';
import { remainingText, starsText } from '../../src/hocsinh/format';
import { Recommendations } from '../../src/hocsinh/Recommendations';
import { useStudentHome, useStudentRecommendations } from '../../src/hocsinh/queries';
import { useTheme } from '../../src/theme/ThemeProvider';

// Trang học của em. Bố cục khác nhau theo cấp: cấp 1 nút to, ít chữ, linh vật và sao; cấp 2 cân bằng chữ và hình, có gợi ý; cấp 3 gọn như danh sách tài liệu.
// Nội dung lấy từ cùng API với web học tập: lượt đang làm dở, bài kiểm tra đang mở, bài học của em, huy hiệu gần đây.

function Mascot({ level }: { level: 1 | 2 | 3 }) {
  const theme = useTheme();
  if (level === 3) return null;
  return (
    <View style={[local.mascot, { backgroundColor: theme.color.accent, borderRadius: theme.radius.card }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ fontSize: level === 1 ? 52 : 34 }}>{level === 1 ? '🐲' : '🧭'}</Text>
    </View>
  );
}

function LessonCard({ lesson, level, onOpen }: { lesson: StudentLessonRef; level: 1 | 2 | 3; onOpen: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const compact = level === 3;
  return (
    <Card>
      <View style={[ui.row, { padding: compact ? 10 : 14, gap: 12 }]}>
        <View style={ui.grow}>
          <Txt variant={level === 1 ? 'heading' : 'title'} numberOfLines={2} style={level === 1 ? { fontSize: theme.text.headingSize - 6 } : undefined}>
            {lesson.title}
          </Txt>
          {level !== 1 ? (
            <Txt variant="caption">{t('hs.home.quizzesDone', { done: lesson.quizzesDone, total: lesson.quizzesPublished })}</Txt>
          ) : (
            <Txt variant="label" color={theme.color.primary}>
              {starsText(lesson.quizzesPublished > 0 ? Math.round((lesson.quizzesDone / lesson.quizzesPublished) * 3) : 0)}
            </Txt>
          )}
        </View>
        <Button label={t('hs.home.openLesson')} onPress={onOpen} variant={compact ? 'secondary' : 'primary'} />
      </View>
    </Card>
  );
}

function OpenQuizCard({ quiz, level, onOpen }: { quiz: StudentOpenQuiz; level: 1 | 2 | 3; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <Card onPress={onOpen} accessibilityLabel={quiz.name ?? ''}>
      <View style={{ padding: level === 3 ? 10 : 14, gap: 6 }}>
        <Txt variant="title">{quiz.name}</Txt>
        <Txt variant="caption" numberOfLines={1}>
          {quiz.lessonTitle}
        </Txt>
        <View style={ui.wrap}>
          <Badge label={t('hs.home.questions', { count: quiz.questionCount })} />
          {quiz.timeLimitMinutes ? <Badge label={t('hs.home.minutes', { count: quiz.timeLimitMinutes })} /> : null}
          {quiz.needsLessonCode ? <Badge label={quiz.label ?? t('hs.home.needsCode')} tone="warning" /> : null}
        </View>
      </View>
    </Card>
  );
}

export default function StudentHomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const home = useStudentHome();
  const level = theme.level ?? 2;
  const recommendations = useStudentRecommendations();

  if (home.isLoading) return <Loading label={t('hs.common.loading')} />;
  if (home.isError || !home.data) return <ErrorState message={t('hs.common.error')} retryLabel={t('hs.common.retry')} onRetry={() => void home.refetch()} />;
  const data: StudentHome = home.data;

  const openLesson = (code: string | null) => {
    if (code) router.push({ pathname: '/bai-hoc/[ma]', params: { ma: code } });
    else router.push('/(hoc-sinh)/nhap-ma');
  };
  const codeOf = (lessonId: number) => data.myLessons.find((lesson) => lesson.lessonId === lessonId)?.accessCode ?? null;
  const openQuiz = (quizId: number) => router.push({ pathname: '/kiem-tra/[quizId]', params: { quizId: String(quizId) } });
  const gap = theme.spacing.block;

  return (
    <ScrollView
      style={{ backgroundColor: theme.color.background }}
      contentContainerStyle={{ padding: theme.spacing.inline, gap, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => void home.refetch()} tintColor={theme.color.primary} />}
    >
      <View style={[ui.row, { gap: 14 }]}>
        <Mascot level={level} />
        <View style={ui.grow}>
          <Txt variant="heading" accessibilityRole="header">
            {t('hs.home.hello', { name: data.fullName ?? 'em' })}
          </Txt>
          {level === 1 ? (
            <Txt>{t('hs.home.mascotGreeting')}</Txt>
          ) : (
            <Txt muted>{t('hs.home.classLine', { className: data.className ?? '', level: data.levelName })}</Txt>
          )}
          {data.totalStars !== null ? (
            <Txt variant={level === 1 ? 'title' : 'label'} color={theme.color.primary}>
              ★ {t('hs.home.stars', { count: data.totalStars })}
            </Txt>
          ) : null}
        </View>
      </View>

      <Button label={t('hs.home.enterCode')} onPress={() => router.push('/(hoc-sinh)/nhap-ma')} full style={level === 1 ? { minHeight: 64 } : undefined} />
      {level !== 1 ? (
        <Txt variant="caption" muted style={{ marginTop: -gap / 2 }}>
          {t('hs.home.enterCodeHint')}
        </Txt>
      ) : null}

      {data.inProgress.length > 0 ? (
        <Section title={t('hs.home.inProgress')}>
          {data.inProgress.map((item) => (
            <Card key={item.attemptId}>
              <View style={[ui.row, { padding: 14, gap: 12 }]}>
                <View style={ui.grow}>
                  <Txt variant="title">{item.quizName}</Txt>
                  <Txt variant="caption">{item.lessonTitle}</Txt>
                  {item.remainingSeconds !== null ? (
                    <Txt variant="caption" color={theme.color.incorrect}>
                      {t('hs.home.remaining', { time: remainingText(item.remainingSeconds) })}
                    </Txt>
                  ) : null}
                </View>
                <Button label={t('hs.home.continue')} onPress={() => openQuiz(item.quizId)} />
              </View>
            </Card>
          ))}
        </Section>
      ) : null}

      {data.openQuizzes.length > 0 ? (
        <Section title={t('hs.home.openQuizzes')}>
          {data.openQuizzes.map((quiz) => (
            <OpenQuizCard key={quiz.quizId} quiz={quiz} level={level} onOpen={() => (quiz.needsLessonCode ? openLesson(codeOf(quiz.lessonId)) : openQuiz(quiz.quizId))} />
          ))}
        </Section>
      ) : null}

      <Section title={t('hs.home.myLessons')}>
        {data.myLessons.length === 0 ? (
          <EmptyState message={t('hs.home.emptyLessons')} />
        ) : (
          data.myLessons.map((lesson) => <LessonCard key={lesson.lessonId} lesson={lesson} level={level} onOpen={() => openLesson(lesson.accessCode)} />)
        )}
      </Section>

      {recommendations.data ? <Recommendations data={recommendations.data} lessonCodeOf={codeOf} /> : null}

      {data.recentBadges.length > 0 ? (
        <Section title={t('hs.home.recentBadges')}>
          <View style={ui.wrap}>
            {data.recentBadges.map((badge) => (
              <Badge key={`${badge.code}-${badge.attemptId}`} label={badge.name} tone="success" />
            ))}
          </View>
        </Section>
      ) : null}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  mascot: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
});
