import type { RecommendedHeritage, RecommendedLesson, RecommendedQuiz, StudentRecommendations } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, Notice, Section, Txt } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';

// "Gợi ý cho em": năm phần cùng nội dung ở mọi cấp (bài kiểm tra nên làm tiếp, bài học nên ôn, di sản nên ôn, di sản liên quan, bài học mới); cấp 1 chữ lớn hơn.
// Máy chủ tính khi hiển thị từ các lượt đã làm; cấp 1 đã bỏ số liệu khỏi câu lý do.

interface Props {
  data: StudentRecommendations;
  /** Mã bài học của một bài em đã mở (từ trang học), để mở bài hoặc bài kiểm tra cần mã. */
  lessonCodeOf?: (lessonId: number) => string | null;
  limit?: number;
}

function Row({ title, reason, onPress }: { title: string; reason?: string | null; onPress?: () => void }) {
  const theme = useTheme();
  const big = theme.level === 1;
  return (
    <Card onPress={onPress} accessibilityLabel={title}>
      <View style={{ padding: big ? 16 : 12, gap: 2 }}>
        <Txt variant={big ? 'title' : 'label'}>{title}</Txt>
        {reason ? <Txt variant={big ? 'body' : 'caption'}>{reason}</Txt> : null}
      </View>
    </Card>
  );
}

export function Recommendations({ data, lessonCodeOf, limit = 3 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const openLesson = (code: string | null) => router.push(code ? { pathname: '/bai-hoc/[ma]', params: { ma: code } } : '/(hoc-sinh)/nhap-ma');
  const openQuiz = (quiz: RecommendedQuiz) => (quiz.needsLessonCode ? openLesson(lessonCodeOf?.(quiz.lessonId) ?? null) : router.push({ pathname: '/kiem-tra/[quizId]', params: { quizId: String(quiz.quizId) } }));
  const openHeritage = (heritage: RecommendedHeritage) => (heritage.slug ? () => router.push({ pathname: '/di-san/[slug]', params: { slug: heritage.slug! } }) : undefined);
  const reviewLesson = (lesson: RecommendedLesson) => (lesson.accessCode ? () => openLesson(lesson.accessCode) : undefined);

  const empty = data.nextQuizzes.length + data.lessonsToReview.length + data.heritagesToReview.length + data.relatedHeritages.length + data.newLessons.length === 0;
  if (empty && !data.message && !data.reviewPraise) return null;

  return (
    <Section title={t('hs.home.recommendations')}>
      {data.message ? <Notice text={data.message} /> : null}
      {data.reviewPraise ? <Notice text={data.reviewPraise} /> : null}
      {data.nextQuizzes.slice(0, limit).map((quiz) => (
        <Row key={`q${quiz.quizId}`} title={`${t('hs.home.nextQuizzes')}: ${quiz.name ?? ''}`} reason={quiz.reason} onPress={() => openQuiz(quiz)} />
      ))}
      {data.lessonsToReview.slice(0, limit).map((lesson) => (
        <Row key={`l${lesson.lessonId}`} title={`${t('hs.home.reviewLesson')}: ${lesson.title ?? ''}`} reason={lesson.reason} onPress={reviewLesson(lesson)} />
      ))}
      {data.heritagesToReview.slice(0, limit).map((heritage) => (
        <Row key={`h${heritage.heritageId}`} title={`${t('hs.home.review')}: ${heritage.name ?? ''}`} reason={heritage.reason} onPress={openHeritage(heritage)} />
      ))}
      {data.relatedHeritages.slice(0, limit).map((heritage) => (
        <Row key={`r${heritage.heritageId}`} title={`${t('hs.home.related')}: ${heritage.name ?? ''}`} reason={heritage.reason} onPress={openHeritage(heritage)} />
      ))}
      {data.newLessons.slice(0, limit).map((lesson) => (
        <Row key={`n${lesson.lessonId}`} title={`${t('hs.home.newLesson')}: ${lesson.title ?? ''}`} reason={lesson.hint ?? lesson.reason} />
      ))}
    </Section>
  );
}
