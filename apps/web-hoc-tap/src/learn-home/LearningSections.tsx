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
        level === 1 &&
          'duo-card flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6',
        level === 2 && 'flex flex-col gap-2 rounded-md border border-border bg-surface p-4',
        level === 3 && 'flex flex-wrap items-center gap-3 px-4 py-3',
      )}
    >
      <div className="min-w-0 flex-1">
        {labels && <div className="mb-2.5 flex flex-wrap gap-2">{labels}</div>}
        <p className={level === 1 ? 'type-h3 text-emerald-950 font-black tracking-tight' : 'type-label text-on-surface'}>{title}</p>
        <div className={cn(level === 1 ? 'mt-3 flex flex-wrap gap-2' : 'mt-1')}>
          {lines.map((line) =>
            level === 1 ? (
              <span
                key={line}
                className="dsv-info-chip inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold"
              >
                {line}
              </span>
            ) : (
              <p key={line} className="text-on-surface-variant type-body-s">
                {line}
              </p>
            ),
          )}
        </div>
        {progress && (
          <div className="mt-3">
            <p className="flex justify-between type-body-s font-semibold text-on-surface">
              <span>Bài kiểm tra</span>
              <span className="tabular-nums font-bold">
                {progress.value} / {progress.max}
              </span>
            </p>
            <Bar className="mt-1.5" ratio={progress.max > 0 ? progress.value / progress.max : 0} label={`Đã làm ${progress.value} trên ${progress.max} bài kiểm tra`} />
          </div>
        )}
      </div>
      <div className={level === 1 ? 'shrink-0 self-start md:self-center' : undefined}>{action}</div>
    </li>
  );
}

function Section({ id, level, title, hint, children, speak }: { id: string; level: Level; title: string; hint?: string; children: ReactNode; speak?: string }) {
  const icon =
    id === 'dang-lam-do' ? '⚡' : id === 'bai-kiem-tra-dang-cho' ? '🎮' : id === 'bai-hoc-cua-em' ? '📖' : id === 'huy-hieu-gan-day' ? '🏆' : null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        {level === 1 && icon && (
          <span className="duo-node-btn size-11 bg-emerald-50 border-emerald-200 border-b-emerald-400 text-xl text-emerald-800 shadow-xs" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 id={id} className={level === 1 ? 'type-h2 font-black text-emerald-950 tracking-tight' : 'type-h2 text-on-surface'}>
          {title}
        </h2>
        {level === 1 && speak && <SpeakButton text={speak} label={`Nghe: ${title}`} size="sm" className="dsv-speak-btn" />}
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
                      <ButtonLink
                        to={takeQuizPath(code, item.quizId)}
                        state={{ confirmed: true }}
                        size={size}
                        className={cn(
                          level === 1
                            ? 'duo-btn-green px-7 py-3.5 flex items-center justify-center gap-2 text-base'
                            : pill,
                        )}
                      >
                        {level === 1 && <Icon name="play" size={20} />}
                        Làm tiếp
                      </ButtonLink>
                    ) : (
                      <ButtonLink
                        to={pathOf('enterCode')}
                        variant="secondary"
                        size={size}
                        className={cn(
                          level === 1
                            ? 'duo-btn-yellow px-6 py-3.5 flex items-center justify-center gap-2 text-base'
                            : pill,
                        )}
                      >
                        {level === 1 && <Icon name="key" size={20} />}
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
                      <ButtonLink
                        to={takeQuizPath(code, quiz.quizId)}
                        size={size}
                        className={cn(
                          level === 1
                            ? 'duo-btn-green px-7 py-3.5 flex items-center justify-center gap-2 text-base'
                            : pill,
                        )}
                      >
                        {level === 1 && <Icon name="play" size={22} />}
                        Làm bài
                      </ButtonLink>
                    ) : (
                      <ButtonLink
                        to={pathOf('enterCode')}
                        variant="secondary"
                        size={size}
                        className={cn(
                          level === 1
                            ? 'duo-btn-yellow px-6 py-3.5 flex items-center justify-center gap-2 text-base'
                            : pill,
                        )}
                      >
                        {level === 1 && <Icon name="key" size={20} />}
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
                    <ButtonLink
                      to={lessonPath(lesson.accessCode)}
                      variant={level === 1 ? 'primary' : 'secondary'}
                      size={size}
                      className={cn(
                        level === 1
                          ? 'duo-btn-blue px-7 py-3.5 flex items-center justify-center gap-2 text-base'
                          : pill,
                      )}
                    >
                      {level === 1 && <Icon name="book-open" size={20} />}
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
                labels={
                  level === 1 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                      <Icon name="star" size={16} className="text-warning fill-amber-400" />
                      Huy hiệu xuất sắc
                    </span>
                  ) : (
                    <Icon name="star" size={18} className="text-warning" />
                  )
                }
                lines={[[badge.quizName, badge.earnedAt ? formatDateTime(badge.earnedAt) : null].filter(Boolean).join(' · ')]}
                action={
                  <ButtonLink
                    to={resultPath(badge.attemptId)}
                    variant={level === 1 ? 'secondary' : 'link'}
                    className={
                      level === 1
                        ? 'dsv-mission-btn px-5 py-2.5 text-sm flex items-center justify-center'
                        : undefined
                    }
                  >
                    Xem kết quả 🌟
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
            'flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6 sm:p-8',
            level === 1
              ? 'dsv-empty-box'
              : 'rounded-md border border-border bg-surface',
          )}
        >
          <div
            className={
              level === 1
                ? 'dsv-mascot-avatar flex size-20 sm:size-24 shrink-0 items-center justify-center p-2'
                : undefined
            }
          >
            <Illustration state="trong" className={level === 3 ? 'size-14' : level === 1 ? 'size-full bg-transparent text-amber-500' : undefined} />
          </div>
          <div className="text-center sm:text-left">
            <p className={level === 1 ? 'type-h3 font-black text-amber-950' : 'type-body-m text-on-surface-variant'}>
              {level === 1 ? 'Chưa có bài chơi nào. Em hãy nhờ thầy cô đưa mã bài học nhé!' : MESSAGES.studentNoAttemptsYet}
            </p>
            {level === 1 && (
              <p className="mt-1 type-body-s font-bold text-amber-900/80">
                Khi có bài học mới từ lớp, các trò chơi và bài kiểm tra thú vị sẽ hiện ở đây! ✨
              </p>
            )}
          </div>
        </div>
        <HomeRecommendations level={level} id="goi-y" />
      </div>
    );
  }
  return <Sections home={data} level={level} />;
}
