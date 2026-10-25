import { Ionicons } from '@expo/vector-icons';
import { clampStars } from '@dsvhvn/dung-chung';
import type { StudentAttemptResult, StudentQuestionReview } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Txt, styles as ui } from '../../components/ui';
import { usePrefetchSpeech } from '../../speech/useCloudNarration';
import { useTheme } from '../../theme/ThemeProvider';
import { useAutoRead } from '../autoRead';
import { answerLines, type ReviewWords } from '../reviewText';
import { BIG, GUTTER, HeritageCardTile, Mascot, SmallTag, SpeakButton, StarRow, TakeHome } from './parts';

// Kết quả bài chơi cấp 1: linh vật, ba sao lớn, "Em được {s} sao!", lời khen của máy chủ nói đúng điều em nhớ (nút nghe, tự đọc khi bật "Tự đọc
// to"), thẻ di sản của bài đã vào album, câu mang về nhà, huy hiệu dạng nhãn nhỏ, nút "Về con đường" và "Xem album". Không điểm, không chữ "Sai"
// màu đỏ. Đáp án đã giải thích ngay lúc chơi nên phần xem lại các câu thu gọn, em mở ra khi muốn.

function ReviewList({ questions }: { questions: StudentQuestionReview[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const words: ReviewWords = { yes: t('hs.quiz.true'), no: t('hs.quiz.false'), empty: t('hs.result.noAnswer'), imageN: (letter) => t('hs.quiz.imageN', { letter }) };
  return (
    <View style={{ gap: 12 }}>
      {questions.map((item) => (
        <View key={item.question.questionId} style={[local.review, { backgroundColor: theme.color.surface, borderColor: theme.color.border, borderRadius: theme.radius.card }]}>
          <View style={local.reviewTop}>
            <Ionicons name={item.isCorrect ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={item.isCorrect ? theme.color.correct : theme.color.onSurfaceVariant} />
            <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '700', color: theme.color.onSurfaceVariant }}>{item.isCorrect ? t('hs.one.reviewRight') : t('hs.one.reviewNotYet')}</Text>
          </View>
          <Txt variant="label">{item.question.content}</Txt>
          {item.isCorrect !== true ? (
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 16, lineHeight: 22, color: theme.color.onSurfaceVariant }}>{t('hs.result.correctAnswer')}</Text>
              {answerLines(item.question, item.correctAnswer, words).map((line, i) => (
                <Txt key={i}>{line}</Txt>
              ))}
            </View>
          ) : null}
          {item.explanation ? <Txt>{item.explanation}</Txt> : null}
        </View>
      ))}
    </View>
  );
}

export function LevelOneResult({ result }: { result: StudentAttemptResult }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { autoRead } = useAutoRead();
  const [reviewOpen, setReviewOpen] = useState(false);
  const stars = clampStars(result.stars);
  const title = t('hs.one.starsEarned', { count: stars });
  const praise = result.praise ?? '';
  // Số sao và lời khen đọc cùng một lượt: nhờ máy chủ tạo trước tiếng ngay khi vào trang.
  usePrefetchSpeech([praise ? `${title} ${praise}` : null]);
  const questions = result.answersShown ? (result.questions ?? []) : [];

  return (
    <ScrollView style={{ backgroundColor: theme.color.background }} contentContainerStyle={[local.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
      <View style={local.center}>
        <Mascot size={104} mood={stars >= 2 ? 'chuc-mung' : 'dong-vien'} />
        <StarRow count={stars} size={56} label={t('hs.one.starsLabel', { count: stars })} />
        <Text accessibilityRole="header" style={[local.title, { color: theme.color.onBackground }]}>
          {title}
        </Text>
      </View>

      {praise ? (
        <View style={[local.praise, { backgroundColor: theme.color.primaryContainer, borderRadius: theme.radius.card }]}>
          <Txt color={theme.color.onPrimaryContainer} style={{ flex: 1 }}>
            {praise}
          </Txt>
          <SpeakButton text={`${title} ${praise}`} label={t('hs.one.speakPraise')} auto={autoRead === true} />
        </View>
      ) : null}

      {(result.cards ?? []).map((card) => (
        <HeritageCardTile
          key={card.heritageId}
          card={card}
          note={t('hs.one.inAlbum', { count: result.albumCollected ?? 0 })}
          onPress={() => router.push('/album')}
        />
      ))}

      {result.takeHome ? <TakeHome text={result.takeHome} /> : null}

      {result.badges.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Txt variant="label">{t('hs.one.newBadges')}</Txt>
          <View style={ui.wrap}>
            {result.badges.map((badge) => (
              <SmallTag key={badge.code} text={badge.name} tone="sun" />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Button label={t('hs.one.backToPath')} onPress={() => router.replace('/(hoc-sinh)/hoc')} full style={{ minHeight: BIG }} />
        <Button label={t('hs.one.viewAlbum')} variant="secondary" onPress={() => router.push('/album')} full style={{ minHeight: BIG }} />
      </View>

      {questions.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Button
            label={reviewOpen ? t('hs.one.reviewClose') : t('hs.one.reviewOpen')}
            variant="ghost"
            onPress={() => setReviewOpen(!reviewOpen)}
            accessibilityState={{ expanded: reviewOpen }}
            full
            style={{ minHeight: 56 }}
          />
          {reviewOpen ? <ReviewList questions={questions} /> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, gap: 20 },
  center: { alignItems: 'center', gap: 12 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800', textAlign: 'center' },
  praise: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  review: { padding: 14, gap: 8, borderWidth: 2 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
