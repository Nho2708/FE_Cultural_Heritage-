import { cn, passageGroup } from '@dsvhvn/dung-chung';
import type { StudentAttempt, StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { Button, Icon } from '@dsvhvn/dung-chung/ui';
import { useEffect, useState } from 'react';
import { RunnerLevelOne } from './LevelOneRunner';
import { Clock, PassageBox, QuestionCard, QuestionGrid, SaveNote, SubmitDialog, TimeUpNotice } from './runnerParts';
import { useQuizAttempt, type QuizAttemptSession } from './useQuizAttempt';

// Màn hình làm bài toàn màn hình (không thanh điều hướng). Ba bố cục riêng theo cấp học của lớp, học sinh không chọn:
// cấp 1 là bài chơi luyện tập (LevelOneRunner): từng câu một, kiểm ngay, thử lại, không sao, không đồng hồ; cấp 2 cân bằng, đồng hồ khi bài đặt giờ,
// bảng số câu bên cạnh; cấp 3 gọn, luôn có đồng hồ, bảng số câu nằm ngang, tư liệu ghim bên trái, đánh dấu câu cần xem lại.

interface RunnerProps {
  attempt: StudentAttempt;
  onFinished: (result: StudentAttemptResult, automatic: boolean) => void;
}

interface LayoutProps {
  attempt: StudentAttempt;
  session: QuizAttemptSession;
}

export function QuizRunner({ attempt, onFinished }: RunnerProps) {
  const session = useQuizAttempt(attempt, onFinished);
  const Layout = { 1: RunnerLevelOne, 2: RunnerLevelTwo, 3: RunnerLevelThree }[attempt.level];
  return <Layout attempt={attempt} session={session} />;
}

// ---- Cấp 2 ----

function RunnerLevelTwo({ attempt, session }: LayoutProps) {
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const total = attempt.questions.length;
  const question = attempt.questions[index]!;
  const answered = session.answeredCount;

  return (
    <section data-bo-cuc="cap-2" className="min-h-dvh bg-background">
      <title>{`${attempt.quizName ?? 'Bài kiểm tra'} · DiViet`}</title>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="type-label tracking-wide text-on-surface-variant uppercase">Bài học: {attempt.lessonTitle}</p>
            <h1 className="type-h3 text-on-surface">{attempt.quizName}</h1>
          </div>
          {attempt.showsClock && <Clock remaining={session.remaining} attempt={attempt} />}
          <Button onClick={() => setConfirming(true)} disabled={session.submitting}>
            Nộp bài
          </Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <TimeUpNotice session={session} />
          <QuestionCard
            key={question.questionId}
            question={question}
            index={index}
            total={total}
            level={2}
            answer={session.answers[question.questionId] ?? null}
            onChange={(answer) => session.setAnswer(question, answer)}
            readAloud={false}
            disabled={session.submitting}
          />
          <SaveNote status={session.saveStatus} savedAt={session.savedAt} />
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => setIndex(index - 1)} disabled={index === 0}>
              Câu trước
            </Button>
            <Button onClick={() => setIndex(index + 1)} disabled={index === total - 1}>
              Câu sau
            </Button>
          </div>
        </div>
        <aside aria-label="Bảng số câu" className="h-fit rounded-md border border-border bg-surface p-5 lg:sticky lg:top-4">
          <h2 className="flex items-center gap-2 type-label text-on-surface">
            <Icon name="list" size={18} />
            Bảng số câu
          </h2>
          <p className="mt-2 type-body-s text-on-surface-variant">
            Đã trả lời {answered} / {total} câu. Bấm vào số để chuyển tới câu đó.
          </p>
          <QuestionGrid className="mt-4" questions={attempt.questions} answers={session.answers} current={index} onGo={setIndex} />
          <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4 type-body-s text-on-surface-variant">
            <li className="flex items-center gap-2">
              <span className="size-5 rounded-xs bg-primary-container" />
              Câu em đã trả lời
            </li>
            <li className="flex items-center gap-2">
              <span className="size-5 rounded-xs border-2 border-primary" />
              Câu em đang xem
            </li>
            <li className="flex items-center gap-2">
              <span className="size-5 rounded-xs border border-border" />
              Câu em chưa trả lời
            </li>
          </ul>
        </aside>
      </div>
      <SubmitDialog
        open={confirming}
        level={2}
        unanswered={session.unanswered}
        submitting={session.submitting}
        error={session.submitError}
        onBack={() => setConfirming(false)}
        onSubmit={() => void session.submit()}
      />
    </section>
  );
}

// ---- Cấp 3 ----

const flagKey = (attemptId: number) => `dsvhvn.hoc-tap.danh-dau.${attemptId}`;

function readFlags(attemptId: number): number[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(flagKey(attemptId)) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

function RunnerLevelThree({ attempt, session }: LayoutProps) {
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set(readFlags(attempt.id)));
  const total = attempt.questions.length;
  const question = attempt.questions[index]!;
  const flagged = flags.has(question.questionId);
  const group = passageGroup(attempt.questions, index);

  useEffect(() => {
    try {
      window.localStorage.setItem(flagKey(attempt.id), JSON.stringify([...flags]));
    } catch {
      // Không nhớ được dấu xem lại thì thôi: chỉ mất tiện ích trong lần mở lại.
    }
  }, [attempt.id, flags]);

  const toggleFlag = () =>
    setFlags((current) => {
      const next = new Set(current);
      if (next.has(question.questionId)) next.delete(question.questionId);
      else next.add(question.questionId);
      return next;
    });

  return (
    <section data-bo-cuc="cap-3" className="min-h-dvh bg-background">
      <title>{`${attempt.quizName ?? 'Bài kiểm tra'} · DiViet`}</title>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="type-label tracking-wide text-on-surface-variant uppercase">Bài học: {attempt.lessonTitle}</p>
            <h1 className="type-h3 text-on-surface">{attempt.quizName}</h1>
          </div>
          {attempt.showsClock && <Clock remaining={session.remaining} attempt={attempt} />}
          <Button onClick={() => setConfirming(true)} disabled={session.submitting}>
            Nộp bài
          </Button>
        </div>
      </header>
      <div className="border-b border-border bg-surface-container-low">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h2 className="type-label text-on-surface">Bảng số câu</h2>
          <p className="type-body-s text-on-surface-variant">
            Đã trả lời {session.answeredCount} / {total}
            {flags.size > 0 ? ` · Đánh dấu xem lại ${flags.size}` : ''}
          </p>
          <QuestionGrid
            className="basis-full"
            questions={attempt.questions}
            answers={session.answers}
            current={index}
            onGo={setIndex}
            flagged={flags}
          />
        </div>
      </div>
      <div className={cn('mx-auto grid max-w-[1200px] gap-6 px-4 py-6', group && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]')}>
        {group && (
          <div className="lg:sticky lg:top-4 lg:h-fit">
            <p className="mb-2 type-body-s text-on-surface-variant">
              Tư liệu dùng cho câu {group.first}
              {group.last > group.first ? ` – ${group.last}` : ''} · luôn ghim khi em cuộn
            </p>
            <PassageBox question={question} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4">
          <TimeUpNotice session={session} />
          <QuestionCard
            key={question.questionId}
            question={question}
            index={index}
            total={total}
            level={3}
            answer={session.answers[question.questionId] ?? null}
            onChange={(answer) => session.setAnswer(question, answer)}
            readAloud={false}
            inlinePassage={false}
            disabled={session.submitting}
            aside={
              <Button variant="secondary" size="sm" aria-pressed={flagged} onClick={toggleFlag}>
                <Icon name="star" size={16} className={flagged ? 'fill-current text-warning' : ''} />
                {flagged ? 'Đã đánh dấu xem lại' : 'Đánh dấu xem lại'}
              </Button>
            }
          />
          <SaveNote status={session.saveStatus} savedAt={session.savedAt} />
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => setIndex(index - 1)} disabled={index === 0}>
              Câu trước
            </Button>
            <Button onClick={() => setIndex(index + 1)} disabled={index === total - 1}>
              Câu sau
            </Button>
          </div>
        </div>
      </div>
      <SubmitDialog
        open={confirming}
        level={3}
        unanswered={session.unanswered}
        submitting={session.submitting}
        error={session.submitError}
        onBack={() => setConfirming(false)}
        onSubmit={() => void session.submit()}
      />
    </section>
  );
}
