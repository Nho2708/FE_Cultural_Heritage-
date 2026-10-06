import type { StudentLesson } from '@dsvhvn/dung-chung/api';
import { milestonesOf, sectionsOf } from '@dsvhvn/dung-chung/lesson-data';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Photo } from '../components/Heritage';
import { Button, Card, Chip, Divider, EmptyState, Notice, Section, Txt, styles as ui } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';
import { Figure, HeritageLinks, Paragraphs, QuizList, ReadAloud } from './LessonParts';

// Ba bố cục bài học khác nhau thật sự theo cấp (cùng dữ liệu, khác luồng): cấp 1 kể chuyện từng bước với nút lớn và đọc to; cấp 2 ba bước chuyển qua lại tự do
// bằng chip (Đọc bài, Dòng thời gian của bài, Bài kiểm tra); cấp 3 là trang tài liệu có đề mục, tư liệu gốc, câu hỏi gợi suy nghĩ và bài kiểm tra dạng dòng.

export interface LessonPosition {
  step: number;
  part: number;
}

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(max, 0));

export function LevelOneLesson({ lesson, initial, onPositionChange }: { lesson: StudentLesson; initial?: LessonPosition; onPositionChange?: (position: LessonPosition) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const steps = lesson.layout.steps;
  const story = sectionsOf(lesson, 'STORY');
  const gallery = [
    ...story.filter((s) => s.imageUrl).map((s) => ({ url: s.imageUrl, caption: s.title, image: s.image })),
    ...sectionsOf(lesson, 'IMAGE').map((s) => ({ url: s.imageUrl, caption: s.body, image: s.image })),
  ];
  const parts = story.length > 0 ? story.map((s) => ({ text: s.body ?? '', url: s.imageUrl, caption: s.title })) : [{ text: lesson.summary ?? '', url: null, caption: null }];

  const [position, setPosition] = useState<LessonPosition>(() => {
    const saved = initial ?? { step: 0, part: 0 };
    const step = clamp(saved.step, steps.length - 1);
    return { step, part: step === 0 ? clamp(saved.part, parts.length - 1) : 0 };
  });
  const stepKey = steps[position.step]?.key ?? 'LISTEN_STORY';
  const part = parts[position.part] ?? parts[0]!;
  const go = (next: LessonPosition) => {
    setPosition(next);
    onPositionChange?.(next);
  };
  const next = () => {
    if (stepKey === 'LISTEN_STORY' && position.part < parts.length - 1) go({ step: position.step, part: position.part + 1 });
    else go({ step: Math.min(position.step + 1, steps.length - 1), part: 0 });
  };
  const back = () => (stepKey === 'LISTEN_STORY' && position.part > 0 ? go({ step: position.step, part: position.part - 1 }) : go({ step: position.step - 1, part: 0 }));
  const big = { minHeight: 60 };

  return (
    <View style={{ gap: theme.spacing.block }}>
      <Txt variant="heading" accessibilityRole="header">
        {lesson.title}
      </Txt>

      <View accessibilityLabel={t('hs.lesson.steps')} style={styles.stepRow}>
        {steps.map((step, index) => {
          const done = index < position.step;
          const current = index === position.step;
          return (
            <View key={step.key} style={styles.stepItem} accessibilityState={{ selected: current }}>
              <View
                style={[
                  styles.stepDot,
                  { borderColor: done || current ? theme.color.primary : theme.color.border, backgroundColor: current ? theme.color.primary : done ? theme.color.primaryContainer : theme.color.surface },
                ]}
              >
                <Text style={{ color: current ? theme.color.onPrimary : theme.color.onSurfaceVariant, fontSize: 22, fontWeight: '700' }}>{done ? '✓' : index + 1}</Text>
              </View>
              <Txt variant="caption" style={{ textAlign: 'center' }} color={current ? theme.color.primary : undefined}>
                {step.label}
              </Txt>
            </View>
          );
        })}
      </View>

      {stepKey === 'LISTEN_STORY' ? (
        <Card>
          {part.url ? <Photo url={part.url} width={960} height={220} /> : null}
          <View style={{ padding: theme.spacing.inline, gap: theme.spacing.inline }}>
            <Chip label={t('hs.lesson.partOf', { index: position.part + 1, total: parts.length })} />
            <Txt variant="question" style={{ fontWeight: '500' }}>
              {part.text}
            </Txt>
            <ReadAloud key={`${position.step}-${position.part}`} text={part.text} big />
            {lesson.heritages[0] ? (
              <Button label={t('hs.lesson.heritageOpen')} variant="ghost" onPress={() => router.push({ pathname: '/di-san/[slug]', params: { slug: lesson.heritages[0]!.slug } })} />
            ) : null}
          </View>
        </Card>
      ) : null}

      {stepKey === 'VIEW_IMAGES' ? (
        gallery.length === 0 ? (
          <EmptyState message={t('hs.lesson.noImages')} />
        ) : (
          <View style={{ gap: theme.spacing.inline }}>
            {gallery.map((item, index) => (
              <Card key={index}>
                <View style={{ padding: 10, gap: 8 }}>
                  <Figure url={item.url} caption={null} image={item.image} />
                  {item.caption ? <Txt variant="title">{item.caption}</Txt> : null}
                  {item.caption ? <ReadAloud text={item.caption} /> : null}
                </View>
              </Card>
            ))}
          </View>
        )
      ) : null}

      {stepKey === 'PLAY' ? (
        <Section title={t('hs.lesson.playTitle')}>{lesson.quizzes.length === 0 ? <EmptyState message={t('hs.lesson.noPlay')} /> : <QuizList quizzes={lesson.quizzes} large />}</Section>
      ) : null}

      {stepKey === 'EARN_STARS' ? (
        <View style={{ gap: theme.spacing.inline }}>
          <View style={[ui.row, { gap: 14, padding: 16, backgroundColor: theme.color.primaryContainer, borderRadius: theme.radius.card }]}>
            <Text style={{ fontSize: 56 }}>🎉</Text>
            <View style={ui.grow}>
              <Txt variant="heading" color={theme.color.onPrimaryContainer}>
                {t('hs.lesson.congrats')}
              </Txt>
              <Txt color={theme.color.onPrimaryContainer}>{t('hs.lesson.congratsText')}</Txt>
            </View>
          </View>
          {lesson.keyPoints.length > 0 ? (
            <Card>
              <View style={{ padding: 16, gap: 8 }}>
                <Txt variant="heading" style={{ fontSize: theme.text.headingSize - 6 }}>
                  {t('hs.lesson.remember')}
                </Txt>
                {lesson.keyPoints.map((point, index) => (
                  <Txt key={index} variant="question" style={{ fontWeight: '500' }}>
                    • {point}
                  </Txt>
                ))}
                <ReadAloud text={lesson.keyPoints.join('. ')} />
              </View>
            </Card>
          ) : null}
          <HeritageLinks heritages={lesson.heritages} compact />
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        {stepKey === 'EARN_STARS' ? (
          <>
            <Button label={t('hs.lesson.backHome')} onPress={() => router.replace('/(hoc-sinh)/hoc')} full style={big} />
            <Button label={t('hs.lesson.replay')} variant="secondary" onPress={() => go({ step: 0, part: 0 })} full style={big} />
          </>
        ) : (
          <Button label={t('hs.lesson.next')} onPress={next} full style={big} />
        )}
        {position.part > 0 || position.step > 0 ? <Button label={t('hs.lesson.back')} variant="secondary" onPress={back} full style={big} /> : null}
      </View>
      <Notice text={t('hs.lesson.resume')} />
    </View>
  );
}

type TabId = 'READ' | 'TIMELINE' | 'QUIZ';

export function LevelTwoLesson({ lesson }: { lesson: StudentLesson }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [tab, setTab] = useState<TabId>('READ');
  const milestones = milestonesOf(lesson);
  const body = sectionsOf(lesson, 'READING', 'IMAGE');
  const hero = sectionsOf(lesson, 'IMAGE').find((s) => s.imageUrl)?.imageUrl ?? lesson.heritages.find((h) => h.thumbnailUrl)?.thumbnailUrl ?? null;
  const tabs = lesson.layout.steps
    .filter((s) => s.key === 'READ' || s.key === 'TIMELINE' || s.key === 'QUIZ')
    .map((s) => ({ id: s.key as TabId, label: s.key === 'READ' ? t('hs.lesson.readSummary') : s.key === 'TIMELINE' ? t('hs.lesson.timeline') : t('hs.lesson.quizzes') }));

  return (
    <View style={{ gap: theme.spacing.block }}>
      {hero ? <Photo url={hero} width={960} height={180} style={{ borderRadius: theme.radius.card }} /> : null}
      <View style={{ gap: 4 }}>
        <Txt variant="caption" muted>
          {t('hs.lesson.code')}: {lesson.accessCode}
        </Txt>
        <Txt variant="heading" accessibilityRole="header">
          {lesson.title}
        </Txt>
        <Txt variant="caption">{t('hs.lesson.classTeacher', { className: lesson.className ?? '', teacher: lesson.teacherName ?? '' })}</Txt>
      </View>
      <View style={ui.wrap} accessibilityLabel={t('hs.lesson.steps')}>
        {tabs.map((item) => (
          <Chip key={item.id} label={item.label} selected={tab === item.id} onPress={() => setTab(item.id)} />
        ))}
      </View>

      {tab === 'READ' ? (
        <View style={{ gap: theme.spacing.inline }}>
          <Paragraphs text={lesson.summary} />
          {body.map((section, index) =>
            section.type === 'IMAGE' ? (
              <Figure key={index} url={section.imageUrl} caption={section.body} image={section.image} />
            ) : (
              <View key={index} style={{ gap: 8 }}>
                {section.title ? <Txt variant="title">{section.title}</Txt> : null}
                <Paragraphs text={section.body} />
              </View>
            ),
          )}
          {lesson.keyPoints.length > 0 ? (
            <Section title={t('hs.lesson.keyPoints')}>
              <Card>
                <View style={{ padding: 12, gap: 10 }}>
                  {lesson.keyPoints.map((point, index) => (
                    <View key={index} style={[ui.row, { alignItems: 'flex-start', gap: 10 }]}>
                      <View style={[styles.number, { backgroundColor: theme.color.accent }]}>
                        <Text style={{ color: theme.color.onAccent, fontWeight: '700' }}>{index + 1}</Text>
                      </View>
                      <Txt style={ui.grow}>{point}</Txt>
                    </View>
                  ))}
                </View>
              </Card>
            </Section>
          ) : null}
          <Section title={t('hs.lesson.heritages')}>
            <HeritageLinks heritages={lesson.heritages} />
          </Section>
        </View>
      ) : null}

      {tab === 'TIMELINE' ? (
        milestones.length === 0 ? (
          <EmptyState message={t('hs.lesson.noMilestones')} />
        ) : (
          <View style={{ gap: 14, borderLeftWidth: 2, borderLeftColor: theme.color.border, paddingLeft: 14 }}>
            {milestones.map((milestone, index) => (
              <View key={index} style={{ gap: 2 }}>
                <Txt variant="title" color={theme.color.primary}>
                  {milestone.milestoneLabel ?? milestone.milestoneYear}
                </Txt>
                <Txt>{milestone.body}</Txt>
              </View>
            ))}
          </View>
        )
      ) : null}

      {tab === 'QUIZ' ? (
        <Section title={t('hs.lesson.quizzes')}>
          <Txt variant="caption" muted>
            {t('hs.lesson.quizzesNote')}
          </Txt>
          <QuizList quizzes={lesson.quizzes} />
        </Section>
      ) : null}
    </View>
  );
}

export function LevelThreeLesson({ lesson }: { lesson: StudentLesson }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const readings = sectionsOf(lesson, 'READING');
  const milestones = milestonesOf(lesson);
  const excerpts = sectionsOf(lesson, 'SOURCE_EXCERPT');
  const reflections = sectionsOf(lesson, 'REFLECTION');
  const images = sectionsOf(lesson, 'IMAGE').filter((s) => s.imageUrl);

  const heading = (text: string) => (
    <View style={{ gap: 6 }}>
      <Divider />
      <Txt variant="heading" accessibilityRole="header" style={{ fontSize: theme.text.headingSize - 4 }}>
        {text}
      </Txt>
    </View>
  );

  return (
    <View style={{ gap: theme.spacing.block }}>
      <View style={{ gap: 4 }}>
        <Txt variant="caption" muted>
          {t('hs.lesson.code')}: {lesson.accessCode}
        </Txt>
        <Txt variant="heading" accessibilityRole="header">
          {lesson.title}
        </Txt>
        <Txt variant="caption">
          {t('hs.lesson.classTeacher', { className: lesson.className ?? '', teacher: lesson.teacherName ?? '' })}
          {lesson.heritages.length > 0 ? ` · ${lesson.heritages.map((h) => h.name).join(', ')}` : ''}
        </Txt>
      </View>

      {heading(t('hs.lesson.mainContent'))}
      <Paragraphs text={lesson.summary} />
      {images.map((image, index) => (
        <Figure key={index} url={image.imageUrl} caption={image.body} image={image.image} />
      ))}

      {readings.map((reading, index) => (
        <View key={index} style={{ gap: theme.spacing.inline }}>
          {heading(reading.title ?? `${index + 1}`)}
          <Paragraphs text={reading.body} />
        </View>
      ))}

      {milestones.length > 0 ? (
        <View style={{ gap: theme.spacing.inline }}>
          {heading(t('hs.lesson.milestones'))}
          <Card>
            {milestones.map((milestone, index) => (
              <View key={index}>
                {index > 0 ? <Divider /> : null}
                <View style={[ui.row, { alignItems: 'flex-start', padding: 12, gap: 12 }]}>
                  <Txt variant="label" style={{ width: 84 }}>
                    {milestone.milestoneLabel ?? milestone.milestoneYear}
                  </Txt>
                  <Txt style={ui.grow}>{milestone.body}</Txt>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {excerpts.length > 0 ? (
        <View style={{ gap: theme.spacing.inline }}>
          {heading(t('hs.lesson.sourcesTitle'))}
          <Txt muted>{t('hs.lesson.sourcesNote')}</Txt>
          {excerpts.map((excerpt, index) => (
            <View key={index} style={{ borderLeftWidth: 4, borderLeftColor: theme.color.primary, backgroundColor: theme.color.surfaceContainerLow, padding: 12, gap: 6 }}>
              <Txt style={{ fontStyle: 'italic' }}>“{excerpt.body}”</Txt>
              <Txt variant="caption">{t('hs.lesson.sourceFrom', { citation: excerpt.sourceCitation ?? '' })}</Txt>
            </View>
          ))}
        </View>
      ) : null}

      {reflections.length > 0 ? (
        <View style={{ gap: theme.spacing.inline }}>
          {heading(t('hs.lesson.reflectionsTitle'))}
          <Txt muted>{t('hs.lesson.reflectionsNote')}</Txt>
          {reflections.map((reflection, index) => (
            <Txt key={index}>
              {index + 1}. {reflection.body}
            </Txt>
          ))}
        </View>
      ) : null}

      {lesson.keyPoints.length > 0 ? (
        <View style={{ gap: theme.spacing.inline }}>
          {heading(t('hs.lesson.keyPoints'))}
          {lesson.keyPoints.map((point, index) => (
            <Txt key={index}>
              {index + 1}. {point}
            </Txt>
          ))}
        </View>
      ) : null}

      {heading(t('hs.lesson.heritages'))}
      <HeritageLinks heritages={lesson.heritages} compact />

      {heading(t('hs.lesson.quizzes'))}
      <Txt variant="caption" muted>
        {t('hs.lesson.quizzesNote')}
      </Txt>
      <QuizList quizzes={lesson.quizzes} />
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  number: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
