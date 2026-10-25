import { Ionicons } from '@expo/vector-icons';
import { practiceFeedback, type PracticeFeedback } from '@dsvhvn/dung-chung';
import type { AnswerCheck, AttemptQuestion, RecallQuestion } from '@dsvhvn/dung-chung/api';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Photo } from '../../components/Heritage';
import { Button, Txt } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';
import { BIG, Mascot, SpeakButton } from './parts';

// Bước Nhớ lại ở đầu bài cấp 1: tối đa 3 câu Đúng/Sai hoặc Chọn hình của bài em đã chơi trước đó. Chạm là báo ngay (đúng thì khen kèm giải
// thích, chưa đúng thì sáng đáp án đúng kèm giải thích), không thử lại, không tính sao, không lưu gì. Lời khen và lời chỉ đáp án dùng chung
// câu chữ với bài chơi luyện tập.

/** Đưa một câu nhớ lại về dạng câu của bài chơi để dùng chung lời phản hồi: chọn đúng là "đúng", chọn sai là "chỉ đáp án" (không thử lại). */
export function recallFeedback(question: RecallQuestion, position: number, picked: number): PracticeFeedback {
  const asQuestion: AttemptQuestion = {
    questionId: question.questionId,
    position,
    point: null,
    questionType: question.questionType,
    typeName: '',
    content: question.content,
    imageUrl: question.imageUrl,
    passage: null,
    passageSource: null,
    options: question.options,
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    partsTotal: 1,
    answered: true,
    answer: { selectedIndex: picked },
    checked: true,
  };
  const isCorrect = picked === question.correctIndex;
  const check: AnswerCheck = {
    questionId: question.questionId,
    isCorrect,
    firstTryCorrect: isCorrect,
    tryCount: 2,
    parts: [isCorrect],
    correctAnswer: { selectedIndex: question.correctIndex },
    explanation: question.explanation,
    answeredCount: 0,
    questionCount: 0,
  };
  return practiceFeedback(asQuestion, check, { last: false });
}

function Choice({ question, picked, onPick }: { question: RecallQuestion; picked: number | null; onPick: (index: number) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const image = question.questionType === 'IMAGE_CHOICE';
  const columns = image ? (width >= 600 ? 3 : 2) : 2;
  return (
    <View accessibilityRole="radiogroup" style={local.grid}>
      {question.options.map((option, index) => {
        const answered = picked !== null;
        const right = answered && index === question.correctIndex;
        const dim = answered && !right;
        const label = option.content ?? t('hs.quiz.imageN', { letter: String.fromCharCode(65 + index) });
        return (
          <Pressable
            key={index}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected: picked === index, disabled: answered }}
            disabled={answered}
            onPress={() => onPick(index)}
            style={[
              local.choice,
              {
                flexBasis: `${100 / columns - 4}%`,
                minHeight: image ? 176 : 112,
                borderRadius: theme.radius.option,
                borderWidth: right ? 4 : 2,
                borderColor: right ? theme.color.correct : theme.color.border,
                backgroundColor: right ? theme.color.correctContainer : theme.color.surface,
                opacity: dim ? 0.45 : 1,
              },
            ]}
          >
            {image ? (
              <Photo url={option.imageUrl} width={500} height={140} style={{ borderTopLeftRadius: theme.radius.option - 2, borderTopRightRadius: theme.radius.option - 2 }} />
            ) : (
              <Ionicons name={index === 0 ? 'checkmark-circle' : 'close-circle'} size={40} color={theme.color.primary} />
            )}
            <View style={local.choiceLabel}>
              <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '700', color: theme.color.onBackground, textAlign: 'center', flexShrink: 1 }}>{label}</Text>
              {right ? <Ionicons name="checkmark-circle" size={26} color={theme.color.correct} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RecallStep({ questions, autoRead, onDone }: { questions: RecallQuestion[]; autoRead: boolean | null; onDone: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const question = questions[index];
  if (!question) return null;
  const last = index === questions.length - 1;
  const feedback = picked !== null ? recallFeedback(question, index + 1, picked) : null;
  const good = feedback?.tone === 'correct';

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 4 }}>
        <Txt variant="title">{t('hs.one.recallTitle')}</Txt>
        {question.lessonTitle ? (
          <Text style={{ fontSize: 16, lineHeight: 22, color: theme.color.onSurfaceVariant }}>{t('hs.one.recallFrom', { title: question.lessonTitle })}</Text>
        ) : null}
      </View>
      <View style={local.questionRow}>
        <SpeakButton key={`q${question.questionId}`} text={question.content} label={t('hs.one.speakQuestion')} size={64} auto={autoRead === true && picked === null} />
        <Txt variant="question" style={{ flex: 1 }}>
          {question.content}
        </Txt>
      </View>
      {question.imageUrl && question.questionType === 'TRUE_FALSE' ? <Photo url={question.imageUrl} width={960} height={200} style={{ borderRadius: theme.radius.card }} /> : null}
      <Choice question={question} picked={picked} onPick={setPicked} />
      {feedback ? (
        <View
          accessibilityLiveRegion="polite"
          style={[local.feedback, { backgroundColor: good ? theme.color.correctContainer : theme.color.primaryContainer, borderRadius: theme.radius.card }]}
        >
          <View style={local.feedbackTop}>
            <Mascot size={56} mood={good ? 'chuc-mung' : 'chao'} />
            <Text style={{ flex: 1, fontSize: 24, lineHeight: 30, fontWeight: '800', color: good ? theme.color.onCorrectContainer : theme.color.onPrimaryContainer }}>{feedback.title}</Text>
            <SpeakButton key={`f${question.questionId}`} text={feedback.speech} label={t('hs.one.speakFeedback')} auto={autoRead === true} />
          </View>
          <Txt color={good ? theme.color.onCorrectContainer : theme.color.onPrimaryContainer}>{feedback.text}</Txt>
          <Button
            label={last ? t('hs.one.recallDone') : t('hs.one.recallNext')}
            onPress={() => {
              if (last) onDone();
              else {
                setIndex(index + 1);
                setPicked(null);
              }
            }}
            full
            style={{ minHeight: BIG }}
          />
        </View>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  choice: { flexGrow: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8 },
  choiceLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  feedback: { padding: 16, gap: 12 },
  feedbackTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
