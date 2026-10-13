import { CLOCK_WARNING_SECONDS, cn, formatClock, hasAnswer } from '@dsvhvn/dung-chung';
import type { AttemptQuestion, QuestionSubmission, StudentAttempt } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, Modal } from '@dsvhvn/dung-chung/ui';
import { AutoReadSwitch, SpeakButton, useAutoRead, useAutoSpeak, useSpeech } from '@dsvhvn/dung-chung/lesson';
import type { ReactNode } from 'react';
import { speechOf } from './speech';
import { QuestionInput, type QuizLevel } from './QuestionInput';
import type { QuizAttemptSession, SaveStatus } from './useQuizAttempt';

// Các phần dùng chung của ba bố cục làm bài: thẻ câu hỏi, đồng hồ, bảng số câu, ghi chú lưu, thông báo mất kết nối, hộp xác nhận nộp.

interface QuestionCardProps {
  question: AttemptQuestion;
  index: number;
  total: number;
  level: QuizLevel;
  answer: QuestionSubmission | null;
  onChange: (answer: QuestionSubmission) => void;
  readAloud: boolean;
  /** Hiện đoạn tư liệu ngay trong thẻ (cấp 1 và 2); cấp 3 đặt tư liệu ở cột riêng. */
  inlinePassage?: boolean;
  disabled?: boolean;
  /** Phần phụ ở góc phải đầu thẻ (nút đánh dấu xem lại). */
  aside?: ReactNode;
}

export function PassageBox({ question }: { question: Pick<AttemptQuestion, 'passage' | 'passageSource'> }) {
  if (!question.passage) return null;
  return (
    <aside aria-label="Tư liệu" className="rounded-md border-l-4 border-primary bg-surface-container-low p-4">
      <p className="flex items-center gap-2 type-label text-on-surface">
        <Icon name="quote" size={18} />
        Tư liệu
      </p>
      <blockquote className="mt-2 type-body-m text-on-surface italic">{question.passage}</blockquote>
      {question.passageSource && <p className="mt-2 type-body-s text-on-surface-variant">Nguồn: {question.passageSource}</p>}
    </aside>
  );
}

export function QuestionCard({ question, index, total, level, answer, onChange, readAloud, inlinePassage = true, disabled, aside }: QuestionCardProps) {
  const sentence = question.questionType === 'FILL_BLANK';
  // Cấp 1: câu hỏi tự đọc to khi em vào câu (tắt được); nút loa vẫn để nghe lại.
  const speech = useSpeech();
  const [autoRead, setAutoRead] = useAutoRead();
  useAutoSpeak(speech.speak, speechOf(question), readAloud && autoRead && speech.supported);
  return (
    <article
      aria-label={`Câu ${index + 1}`}
      className={cn('rounded-lg border bg-surface', level === 1 ? 'border-2 p-6 dsvsm:p-8' : 'border-border p-5 dsvsm:p-6')}
    >
      <header className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-secondary-container px-4 py-1 type-label text-on-secondary-container">{question.typeName}</span>
        <span className="type-body-s text-on-surface-variant">
          Câu {index + 1} / {total}
        </span>
        {question.point !== null && level !== 1 && <span className="type-body-s text-on-surface-variant">· {question.point} điểm</span>}
        <span className="ml-auto flex items-center gap-2">
          {aside}
          {readAloud && speech.supported && (
            <AutoReadSwitch
              on={autoRead}
              onChange={(on) => {
                setAutoRead(on);
                if (!on) speech.stop();
              }}
            />
          )}
          {readAloud && <SpeakButton text={speechOf(question)} label="Nghe đọc câu hỏi" />}
        </span>
      </header>
      {inlinePassage && question.passage && (
        <div className="mt-4">
          <PassageBox question={question} />
        </div>
      )}
      {sentence ? (
        <h2 className="mt-4 type-label text-on-surface-variant">Điền từ vào chỗ trống</h2>
      ) : (
        <h2 className={cn('mt-4 text-on-surface', level === 1 ? 'type-h2' : 'type-question')}>{question.content}</h2>
      )}
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className="mt-4 max-h-80 w-full rounded-md object-cover" loading="lazy" />
      )}
      <div className="mt-5">
        <QuestionInput question={question} answer={answer} onChange={onChange} level={level} disabled={disabled} />
      </div>
    </article>
  );
}

export function Clock({ remaining, attempt, className }: { remaining: number | null; attempt: Pick<StudentAttempt, 'timeLimitMinutes'>; className?: string }) {
  if (remaining === null) return null;
  const total = (attempt.timeLimitMinutes ?? 0) * 60;
  const ratio = total > 0 ? Math.min(1, remaining / total) : 1;
  const warning = remaining <= CLOCK_WARNING_SECONDS;
  return (
    <div
      role="timer"
      aria-label={`Thời gian còn lại ${formatClock(remaining)}`}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2',
        warning ? 'bg-danger-container text-on-danger-container' : 'bg-surface-container-low text-on-surface',
        className,
      )}
    >
      <Icon name="clock" size={20} />
      <div className="min-w-24">
        <p className="type-mono-label text-lg leading-none font-semibold tabular-nums">{formatClock(remaining)}</p>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/10">
          <div className={cn('h-full rounded-full', warning ? 'bg-danger' : 'bg-primary')} style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
      <span className="type-body-s">{warning ? 'sắp hết giờ' : 'còn lại'}</span>
    </div>
  );
}

export function SaveNote({ status, savedAt }: { status: SaveStatus; savedAt: Date | null }) {
  if (status === 'offline') {
    return (
      <InlineMessage tone="warning">Mất kết nối. Đang thử lưu lại câu trả lời… Em cứ làm tiếp, bài sẽ được lưu khi có mạng.</InlineMessage>
    );
  }
  if (!savedAt) return <p className="type-body-s text-on-surface-variant" aria-live="polite">Câu trả lời của em được lưu ngay khi em chọn.</p>;
  const time = savedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <p className="flex items-center gap-2 type-body-s text-on-surface-variant" aria-live="polite">
      <Icon name="check" size={16} className="text-success" />
      {status === 'saving' ? 'Đang lưu câu trả lời…' : `Đã lưu câu trả lời lúc ${time}`}
    </p>
  );
}

export function TimeUpNotice({ session }: { session: Pick<QuizAttemptSession, 'timedOut' | 'submitError'> }) {
  if (!session.timedOut) return null;
  return (
    <InlineMessage tone="info">
      Đã hết thời gian làm bài. Bài của em đang được nộp tự động…
      {session.submitError ? ` ${session.submitError}` : ''}
    </InlineMessage>
  );
}

interface GridProps {
  questions: readonly AttemptQuestion[];
  answers: Readonly<Record<number, QuestionSubmission | null>>;
  current: number;
  onGo: (index: number) => void;
  flagged?: ReadonlySet<number>;
  className?: string;
}

/** Bảng số câu: câu đã trả lời, câu đang xem, câu chưa trả lời; bấm vào số để chuyển tới câu đó. */
export function QuestionGrid({ questions, answers, current, onGo, flagged, className }: GridProps) {
  return (
    <ol aria-label="Bảng số câu" className={cn('flex flex-wrap gap-2', className)}>
      {questions.map((q, index) => {
        const done = hasAnswer(q, answers[q.questionId]);
        const here = index === current;
        const marked = flagged?.has(q.questionId) ?? false;
        return (
          <li key={q.questionId}>
            <button
              type="button"
              onClick={() => onGo(index)}
              aria-current={here ? 'step' : undefined}
              aria-label={`Câu ${index + 1}${done ? ', đã trả lời' : ', chưa trả lời'}${marked ? ', đã đánh dấu xem lại' : ''}`}
              className={cn(
                'relative flex min-h-0 size-11 items-center justify-center rounded-sm border type-label transition-colors',
                here ? 'border-2 border-primary text-primary' : 'border-border',
                done ? 'bg-primary-container text-on-primary-container' : 'bg-surface text-on-surface',
              )}
            >
              {index + 1}
              {marked && <Icon name="star" size={12} className="absolute -top-1 -right-1 fill-current text-warning" />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface SubmitDialogProps {
  open: boolean;
  level: QuizLevel;
  unanswered: readonly number[];
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

/** Hộp xác nhận nộp: nói rõ còn bao nhiêu câu chưa trả lời (câu bỏ trống không được điểm). */
export function SubmitDialog({ open, level, unanswered, submitting, error, onBack, onSubmit }: SubmitDialogProps) {
  const left = unanswered.length;
  const title = level === 1 ? 'Em muốn làm tiếp hay nộp?' : 'Nộp bài kiểm tra?';
  return (
    <Modal
      open={open}
      title={title}
      busy={submitting}
      onClose={onBack}
      description={
        left > 0
          ? level === 1
            ? `Em còn ${left} câu chưa làm.`
            : `Em còn ${left} câu chưa trả lời, các câu này sẽ không được điểm. Em vẫn muốn nộp bài?`
          : 'Em đã trả lời hết các câu. Nộp bài thì em không sửa được nữa.'
      }
      footer={
        <>
          <Button variant="secondary" size={level === 1 ? 'lg' : 'md'} onClick={onBack} disabled={submitting}>
            {level === 1 ? 'Làm tiếp' : 'Quay lại làm bài'}
          </Button>
          <Button size={level === 1 ? 'lg' : 'md'} onClick={onSubmit} loading={submitting}>
            Nộp bài
          </Button>
        </>
      }
    >
      {left > 0 && level !== 1 && (
        <p className="flex flex-wrap items-center gap-2 type-body-m text-on-surface">
          <span>Câu chưa trả lời:</span>
          {unanswered.map((n) => (
            <span key={n} className="flex size-9 items-center justify-center rounded-sm border border-border type-label">
              {n}
            </span>
          ))}
        </p>
      )}
      {error && (
        <InlineMessage tone="danger" className="mt-3">
          {error}
        </InlineMessage>
      )}
    </Modal>
  );
}
