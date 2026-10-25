import type { StudentLesson } from '@dsvhvn/dung-chung/api';
import { milestonesOf, sectionsOf } from '@dsvhvn/dung-chung/lesson-data';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Photo } from '../components/Heritage';
import { Card, Chip, Divider, EmptyState, Section, Txt, styles as ui } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';
import { Figure, HeritageLinks, Paragraphs, QuizList } from './LessonParts';

// Ba bố cục bài học khác nhau thật sự theo cấp (cùng dữ liệu, khác luồng): cấp 1 kể chuyện từng bước với nút lớn và đọc to (ở levelOne/LevelOneLesson);
// cấp 2 ba bước chuyển qua lại tự do bằng chip (Đọc bài, Dòng thời gian của bài, Bài kiểm tra); cấp 3 là trang tài liệu có đề mục, tư liệu gốc,
// câu hỏi gợi suy nghĩ và bài kiểm tra dạng dòng.

export { LevelOneLesson, type LessonPosition, type LevelOneLessonServices } from './levelOne/LevelOneLesson';

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
  number: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
