import { cn, formatDateTime, formatDuration, MESSAGES } from '@dsvhvn/dung-chung';
import type { StudentHome } from '@dsvhvn/dung-chung/api';
import { Badge, ButtonLink, ErrorState, Icon, LoadingState } from '@dsvhvn/dung-chung/ui';
import { Illustration, SpeakButton } from '@dsvhvn/dung-chung/lesson';
import type { ReactNode } from 'react';
import { pathOf } from '../access/screens';
import { lessonPath } from '../lessons/lessonData';
import { resultPath, takeQuizPath } from '../quiz/quizData';
import { Bar } from '../quiz/Meters';
import { HomeRecommendations } from './Recommendations';
import { useStudentHome } from './useStudentHome';

// Các khối học tập của trang học: bài kiểm tra em đang làm dở, bài kiểm tra còn mở, bài học của em (đã mở bằng mã), huy hiệu gần đây.
// Dữ liệu từ một lần gọi máy chủ. Ba cách trình bày theo cấp: cấp 1 thẻ to ít chữ có nút lớn, cấp 2 thẻ cân bằng, cấp 3 danh sách dạng dòng.

type Level = 1 | 2 | 3;

function Entry({
  level,
  title,
  labels,
  lines,
  action,
  progress,
}: {
  level: Level;
  title: string;
  labels?: ReactNode;
  lines: string[];
  action?: ReactNode;
  progress?: { value: number; max: number };
}) {
  return (
    <li
      className={cn(
        level === 1 && 'flex flex-col gap-3 rounded-lg border-2 border-border bg-surface p-5',
        level === 2 && 'flex flex-col gap-2 rounded-md border border-border bg-surface p-4',
        level === 3 && 'flex flex-wrap items-center gap-3 px-4 py-3',
      )}
    >
      <div className="min-w-0 flex-1">
        {labels && <div className="mb-1 flex flex-wrap gap-2">{labels}</div>}
        <p className={level === 1 ? 'type-h3 text-on-surface' : 'type-label text-on-surface'}>{title}</p>
        {lines.map((line) => (
          <p key={line} className={cn('mt-1 text-on-surface-variant', level === 1 ? 'type-body-m' : 'type-body-s')}>
            {line}
          </p>
        ))}
        {progress && (
          <div className="mt-2">
            <p className="flex justify-between type-body-s text-on-surface">
              <span>Bài kiểm tra</span>
              <span className="tabular-nums">
                {progress.value} / {progress.max}
              </span>
            </p>
            <Bar className="mt-1" ratio={progress.max > 0 ? progress.value / progress.max : 0} label={`Đã làm ${progress.value} trên ${progress.max} bài kiểm tra`} />
          </div>
        )}
      </div>
      {action}
    </li>
  );
}

function Section({ id, level, title, hint, children, speak }: { id: string; level: Level; title: string; hint?: string; children: ReactNode; speak?: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 id={id} className={level === 1 ? 'type-h2' : 'type-h2 text-on-surface'}>
          {title}
        </h2>
        {level === 1 && speak && <SpeakButton text={speak} label={`Nghe: ${title}`} />}
      </div>
      {hint && level !== 1 && <p className="type-body-s text-on-surface-variant">{hint}</p>}
      {children}
    </section>
  );
}

function List({ level, children }: { level: Level; children: ReactNode }) {
  return (
    <ul
      className={cn(
        level === 1 && 'flex flex-col gap-4',
        level === 2 && 'grid gap-4 md:grid-cols-2',
        level === 3 && 'divide-y divide-border rounded-md border border-border bg-surface',
      )}
    >
      {children}
    </ul>
  );
}

function codeOf(home: StudentHome, lessonId: number): string | null {
  return home.myLessons.find((lesson) => lesson.lessonId === lessonId)?.accessCode ?? null;
}

function closeText(closeAt: string | null) {
  return closeAt ? `Đóng lúc ${formatDateTime(closeAt)}` : null;
}

function Sections({ home, level }: { home: StudentHome; level: Level }) {
  const size = level === 1 ? 'lg' : 'md';
  const pill = level === 1 ? 'rounded-full' : undefined;
  return (
    <div className="flex flex-col gap-(--dsv-block-gap)">
      {home.inProgress.length > 0 && (
        <Section id="dang-lam-do" level={level} title={level === 1 ? 'Em đang chơi dở' : 'Bài em đang làm dở'} hint="Đồng hồ vẫn tính từ lúc em bắt đầu." speak="Em đang chơi dở. Bấm chơi tiếp nhé!">
          <List level={level}>
            {home.inProgress.map((item) => {
              const code = codeOf(home, item.lessonId);
              return (
                <Entry
                  key={item.attemptId}
                  level={level}
                  title={item.quizName ?? 'Bài kiểm tra'}
                  labels={<Badge tone="warning">Đang làm</Badge>}
                  lines={[
                    `Bài học: ${item.lessonTitle ?? ''}`,
                    item.remainingSeconds !== null ? `Còn ${formatDuration(item.remainingSeconds)}` : 'Không giới hạn thời gian',
                  ]}
                  action={
                    code ? (
                      <ButtonLink to={takeQuizPath(code, item.quizId)} state={{ confirmed: true }} size={size} className={pill}>
                        Làm tiếp
                      </ButtonLink>
                    ) : (
                      <ButtonLink to={pathOf('enterCode')} variant="secondary" size={size} className={pill}>
                        Nhập mã bài học
                      </ButtonLink>
                    )
                  }
                />
              );
            })}
          </List>
        </Section>
      )}

      {home.openQuizzes.length > 0 && (
        <Section
          id="bai-kiem-tra-dang-cho"
          level={level}
          title={level === 1 ? 'Bài chơi đang chờ em' : 'Bài kiểm tra đang chờ em'}
          hint={`Các bài kiểm tra còn mở em chưa làm, của các bài học thầy cô đã giao cho lớp ${home.className ?? ''}.`}
          speak="Có bài chơi đang chờ em. Mình chơi nào!"
        >
          <List level={level}>
            {home.openQuizzes.map((quiz) => {
              const code = quiz.needsLessonCode ? null : codeOf(home, quiz.lessonId);
              return (
                <Entry
                  key={quiz.quizId}
                  level={level}
                  title={quiz.name ?? 'Bài kiểm tra'}
                  labels={quiz.needsLessonCode ? <Badge tone="warning">{quiz.label ?? 'Cần mã bài học'}</Badge> : <Badge tone="success">Đang mở</Badge>}
                  lines={[
                    `Bài học: ${quiz.lessonTitle ?? ''}`,
                    [`${quiz.questionCount} câu`, quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} phút` : null, closeText(quiz.closeAt)].filter(Boolean).join(' · '),
                    ...(quiz.needsLessonCode ? ['Em hãy nhập mã thầy cô đưa để mở bài kiểm tra này.'] : []),
                  ]}
                  action={
                    code ? (
                      <ButtonLink to={takeQuizPath(code, quiz.quizId)} size={size} className={pill}>
                        {level === 1 && <Icon name="play" size={22} />}
                        Làm bài
                      </ButtonLink>
                    ) : (
                      <ButtonLink to={pathOf('enterCode')} variant="secondary" size={size} className={pill}>
                        Nhập mã bài học
                      </ButtonLink>
                    )
                  }
                />
              );
            })}
          </List>
        </Section>
      )}

      {home.myLessons.length > 0 && (
        <Section id="bai-hoc-cua-em" level={level} title="Bài học của em" hint="Các bài học em đã mở bằng mã thầy cô đưa." speak="Đây là các bài học của em.">
          <List level={level}>
            {home.myLessons.map((lesson) => (
              <Entry
                key={lesson.lessonId}
                level={level}
                title={lesson.title ?? 'Bài học'}
                lines={[lesson.lastAttemptAt ? `Mở lần cuối ${formatDateTime(lesson.lastAttemptAt)}` : ''].filter(Boolean)}
                progress={lesson.quizzesPublished > 0 ? { value: lesson.quizzesDone, max: lesson.quizzesPublished } : undefined}
                action={
                  lesson.accessCode && (
                    <ButtonLink to={lessonPath(lesson.accessCode)} variant={level === 1 ? 'primary' : 'secondary'} size={size} className={pill}>
                      Mở bài học
                    </ButtonLink>
                  )
                }
              />
            ))}
          </List>
        </Section>
      )}

      <HomeRecommendations level={level} id="goi-y" />

      {home.recentBadges.length > 0 && (
        <Section id="huy-hieu-gan-day" level={level} title="Huy hiệu gần đây" speak="Đây là các huy hiệu của em.">
          <List level={level}>
            {home.recentBadges.map((badge) => (
              <Entry
                key={`${badge.code}-${badge.attemptId}`}
                level={level}
                title={badge.name}
                labels={<Icon name="star" size={18} className="text-warning" />}
                lines={[[badge.quizName, badge.earnedAt ? formatDateTime(badge.earnedAt) : null].filter(Boolean).join(' · ')]}
                action={
                  <ButtonLink to={resultPath(badge.attemptId)} variant="link">
                    Xem kết quả
                  </ButtonLink>
                }
              />
            ))}
          </List>
        </Section>
      )}
    </div>
  );
}

export function LearningSections({ level }: { level: Level }) {
  const home = useStudentHome();
  if (home.isPending) return <LoadingState rows={2} />;
  if (home.isError) return <ErrorState error={home.error} onRetry={() => void home.refetch()} />;
  const data = home.data;
  const empty = data.inProgress.length === 0 && data.openQuizzes.length === 0 && data.myLessons.length === 0 && data.recentBadges.length === 0;
  if (empty) {
    return (
      <div className="flex flex-col gap-(--dsv-block-gap)">
        <div
          className={cn(
            'flex items-center gap-(--dsv-inline-gap) p-(--dsv-inline-gap)',
            level === 1 ? 'rounded-lg border-2 border-dashed border-border-strong' : 'rounded-md border border-border bg-surface',
          )}
        >
          <Illustration state="trong" className={level === 3 ? 'size-14' : undefined} />
          <p className={level === 1 ? 'type-h4' : 'type-body-m text-on-surface-variant'}>
            {level === 1 ? 'Chưa có bài chơi nào. Em hãy nhờ thầy cô đưa mã bài học nhé!' : MESSAGES.studentNoAttemptsYet}
          </p>
        </div>
        <HomeRecommendations level={level} id="goi-y" />
      </div>
    );
  }
  return <Sections home={data} level={level} />;
}
