import { Ionicons } from '@expo/vector-icons';
import { sectionsOf } from '@dsvhvn/dung-chung/lesson-data';
import type { LessonCompletion, StudentLesson, StudentQuiz, StudentRecall, RecallQuestion } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, Loading, Txt } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';
import { useAutoRead } from '../autoRead';
import { Figure } from '../LessonParts';
import { BIG, IconCircleButton, SpeakButton } from './parts';
import { RecallStep } from './RecallStep';
import { EarnCardStep } from './EarnCardStep';
import { StoryPart } from './StoryPart';

// Bài học cấp 1 đi từng bước theo luồng của máy chủ: Nhớ lại, Nghe chuyện, Xem hình, Chơi, Nhận thẻ (bài cũ còn bước Nhận sao thì coi như
// Nhận thẻ; bài thiếu bước Nhớ lại vẫn chạy). Bước Nhớ lại bị bỏ khi em chưa có câu nào để ôn. Thanh bước là các vòng 48 px, chỉ hiện chữ của
// bước đang ở. Nút đi tiếp "Tiếp nhé" 64 px, "Quay lại" là nút phụ. Vị trí đang dừng được nhớ trên máy này (theo cả tên bước, để bước Nhớ lại
// hiện hay ẩn không làm lệch chỗ).

export interface LessonPosition {
  step: number;
  part: number;
  /** Mã bước đang dừng; có thì ưu tiên hơn số thứ tự bước. */
  key?: string;
}

/** Gọi máy chủ cho bước Nhớ lại và Nhận thẻ; trang bài học truyền vào để dễ thay bằng bản giả khi test. */
export interface LevelOneLessonServices {
  recall?: () => Promise<StudentRecall>;
  complete?: () => Promise<LessonCompletion>;
}

type StepKind = 'RECALL' | 'LISTEN_STORY' | 'VIEW_IMAGES' | 'PLAY' | 'EARN_CARD' | 'OTHER';

function kindOf(key: string): StepKind {
  if (key === 'EARN_STARS') return 'EARN_CARD';
  return key === 'RECALL' || key === 'LISTEN_STORY' || key === 'VIEW_IMAGES' || key === 'PLAY' || key === 'EARN_CARD' ? key : 'OTHER';
}

const STEP_ICON: Record<StepKind, keyof typeof Ionicons.glyphMap> = {
  RECALL: 'bulb',
  LISTEN_STORY: 'headset',
  VIEW_IMAGES: 'images',
  PLAY: 'game-controller',
  EARN_CARD: 'albums',
  OTHER: 'ellipse',
};

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(max, 0));

function StepBar({ steps, current }: { steps: Array<{ key: string; label: string }>; current: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const step = steps[current];
  const text = t('hs.one.stepOf', { label: step?.label ?? '', index: current + 1, total: steps.length });
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('hs.one.steps')} accessibilityValue={{ min: 1, max: steps.length, now: current + 1, text }} style={{ gap: 10 }}>
      <View style={local.stepRow}>
        {steps.map((item, index) => {
          const done = index < current;
          const here = index === current;
          return (
            <View
              key={`${item.key}-${index}`}
              style={[
                local.stepDot,
                {
                  backgroundColor: here ? theme.color.primary : done ? theme.color.primaryContainer : theme.color.surface,
                  borderColor: here || done ? theme.color.primary : theme.color.border,
                },
              ]}
            >
              <Ionicons name={done ? 'checkmark' : STEP_ICON[kindOf(item.key)]} size={24} color={here ? theme.color.onPrimary : done ? theme.color.primary : theme.color.onSurfaceVariant} />
            </View>
          );
        })}
      </View>
      <Text style={{ fontSize: 18, lineHeight: 24, color: theme.color.onSurfaceVariant }}>
        <Text style={{ fontWeight: '800', color: theme.color.primary }}>{step?.label}</Text>
        {` · ${t('hs.one.stepCount', { index: current + 1, total: steps.length })}`}
      </Text>
    </View>
  );
}

function PlayList({ quizzes }: { quizzes: StudentQuiz[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  if (quizzes.length === 0) return <EmptyState message={t('hs.lesson.noPlay')} />;
  return (
    <View style={{ gap: 14 }}>
      {quizzes.map((quiz) => {
        const open = quiz.state === 'OPEN' || quiz.state === 'IN_PROGRESS';
        const done = quiz.state === 'SUBMITTED';
        const action = open ? (quiz.state === 'IN_PROGRESS' ? t('hs.one.playOn') : t('hs.one.playStart')) : done ? t('hs.one.playView') : null;
        return (
          <View key={quiz.id} style={[local.quiz, { backgroundColor: theme.color.surface, borderColor: open ? theme.color.accent : theme.color.border, borderRadius: theme.radius.card }]}>
            <Txt variant="title">{quiz.name}</Txt>
            <Text style={{ fontSize: 16, lineHeight: 22, color: theme.color.onSurfaceVariant }}>
              {t('hs.one.playQuestions', { count: quiz.questionCount })} · {quiz.stateLabel}
            </Text>
            {action ? (
              <Button
                label={action}
                variant={open ? 'primary' : 'secondary'}
                onPress={() => router.push({ pathname: '/kiem-tra/[quizId]', params: { quizId: String(quiz.id) } })}
                full
                style={{ minHeight: BIG }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function LessonBody({
  lesson,
  steps,
  recall,
  initial,
  onPositionChange,
  services,
  onCompleted,
}: {
  lesson: StudentLesson;
  steps: Array<{ key: string; label: string }>;
  recall: RecallQuestion[];
  initial?: LessonPosition;
  onPositionChange?: (position: LessonPosition) => void;
  services?: LevelOneLessonServices;
  onCompleted?: (data: LessonCompletion) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const story = sectionsOf(lesson, 'STORY');
  const gallery = [
    ...story.filter((s) => s.imageUrl).map((s) => ({ url: s.imageUrl, caption: s.title, image: s.image })),
    ...sectionsOf(lesson, 'IMAGE').map((s) => ({ url: s.imageUrl, caption: s.body, image: s.image })),
  ];
  const parts = story.length > 0 ? story.map((s) => ({ text: s.body ?? '', url: s.imageUrl })) : [{ text: lesson.summary ?? '', url: null }];

  const [position, setPosition] = useState<LessonPosition>(() => {
    const saved = initial ?? { step: 0, part: 0 };
    const byKey = saved.key ? steps.findIndex((s) => s.key === saved.key) : -1;
    const step = clamp(byKey >= 0 ? byKey : saved.step, steps.length - 1);
    return { step, part: kindOf(steps[step]?.key ?? '') === 'LISTEN_STORY' ? clamp(saved.part, parts.length - 1) : 0 };
  });
  const { autoRead, setAutoRead } = useAutoRead();
  const kind = kindOf(steps[position.step]?.key ?? 'LISTEN_STORY');
  const part = parts[position.part] ?? parts[0]!;
  const go = (step: number, partIndex: number) => {
    const next = { step, part: partIndex, key: steps[step]?.key };
    setPosition(next);
    onPositionChange?.(next);
  };
  const next = () => {
    if (kind === 'LISTEN_STORY' && position.part < parts.length - 1) go(position.step, position.part + 1);
    else go(Math.min(position.step + 1, steps.length - 1), 0);
  };
  const back = () => (kind === 'LISTEN_STORY' && position.part > 0 ? go(position.step, position.part - 1) : go(Math.max(0, position.step - 1), 0));
  const home = () => router.replace('/(hoc-sinh)/hoc');

  return (
    <View style={{ gap: 22 }}>
      <View style={local.head}>
        <IconCircleButton icon="arrow-back" label={t('hs.one.backHome')} onPress={home} />
        <Txt variant="heading" accessibilityRole="header" numberOfLines={2} style={{ flex: 1, fontSize: 26, lineHeight: 32 }}>
          {lesson.title}
        </Txt>
      </View>

      <StepBar steps={steps} current={position.step} />

      {kind === 'RECALL' ? <RecallStep questions={recall} autoRead={autoRead} onDone={next} /> : null}

      {kind === 'LISTEN_STORY' ? (
        <StoryPart key={`${position.step}-${position.part}`} text={part.text} imageUrl={part.url} index={position.part} total={parts.length} autoRead={autoRead} onAutoChange={setAutoRead} />
      ) : null}

      {kind === 'VIEW_IMAGES' ? (
        gallery.length === 0 ? (
          <EmptyState message={t('hs.lesson.noImages')} />
        ) : (
          <View style={{ gap: 18 }}>
            {gallery.map((item, index) => (
              <View key={index} style={[local.figure, { backgroundColor: theme.color.surface, borderColor: theme.color.border, borderRadius: theme.radius.card }]}>
                <Figure url={item.url} caption={null} image={item.image} />
                {item.caption ? (
                  <View style={local.caption}>
                    <Txt variant="title" style={{ flex: 1 }}>
                      {item.caption}
                    </Txt>
                    <SpeakButton text={item.caption} label={t('hs.one.speakCaption')} soft />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )
      ) : null}

      {kind === 'PLAY' ? (
        <View style={{ gap: 14 }}>
          <Txt variant="title" accessibilityRole="header">
            {t('hs.one.playTitle')}
          </Txt>
          <PlayList quizzes={lesson.quizzes} />
        </View>
      ) : null}

      {kind === 'EARN_CARD' ? (
        <EarnCardStep complete={services?.complete} keyPoints={lesson.keyPoints} onCompleted={onCompleted} onBackToPath={home} onAlbum={() => router.push('/album')} />
      ) : null}

      <View style={{ gap: 12 }}>
        {kind !== 'EARN_CARD' && kind !== 'RECALL' && position.step < steps.length - 1 ? <Button label={t('hs.lesson.next')} onPress={next} full style={{ minHeight: BIG }} /> : null}
        {position.part > 0 || position.step > 0 ? <Button label={t('hs.lesson.back')} variant="secondary" onPress={back} full style={{ minHeight: BIG }} /> : null}
      </View>
    </View>
  );
}

/**
 * Bài học cấp 1. Có bước Nhớ lại thì tải câu ôn trước (lỗi hoặc rỗng thì bỏ bước), rồi mới dựng bài để mở đúng bước đang dừng.
 */
export function LevelOneLesson({
  lesson,
  initial,
  onPositionChange,
  services,
  onCompleted,
}: {
  lesson: StudentLesson;
  initial?: LessonPosition;
  onPositionChange?: (position: LessonPosition) => void;
  services?: LevelOneLessonServices;
  onCompleted?: (data: LessonCompletion) => void;
}) {
  const { t } = useTranslation();
  const hasRecall = lesson.layout.steps.some((s) => s.key === 'RECALL');
  const loadRecall = services?.recall;
  const [recall, setRecall] = useState<RecallQuestion[] | null>(hasRecall && loadRecall ? null : []);

  useEffect(() => {
    if (!hasRecall || !loadRecall) return;
    let cancelled = false;
    loadRecall()
      .then((data) => {
        if (!cancelled) setRecall(data.questions);
      })
      .catch(() => {
        if (!cancelled) setRecall([]);
      });
    return () => {
      cancelled = true;
    };
  }, [hasRecall, loadRecall]);

  if (recall === null) return <Loading label={t('hs.common.loading')} />;
  const steps = lesson.layout.steps.filter((s) => s.key !== 'RECALL' || recall.length > 0);
  return <LessonBody lesson={lesson} steps={steps} recall={recall} initial={initial} onPositionChange={onPositionChange} services={services} onCompleted={onCompleted} />;
}

const local = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stepDot: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  quiz: { padding: 16, gap: 10, borderWidth: 2 },
  figure: { padding: 10, gap: 10, borderWidth: 2, overflow: 'hidden' },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
