import { checksOnTap, cn, levelOneInstruction, practiceFeedback, readyToCheck, retryAnswer, TAP_LOCK_MS, type PracticeFeedback } from '@dsvhvn/dung-chung';
import type { AnswerCheck, AttemptQuestion, QuestionSubmission, StudentAttempt } from '@dsvhvn/dung-chung/api';
import { AutoReadSwitch, Illustration, LevelOneButton, LevelOneIconLink, LevelOneSpeak, speakVietnamese, useAutoRead, usePrefetchSpeech } from '@dsvhvn/dung-chung/lesson';
import type { IllustrationState } from '@dsvhvn/dung-chung/theme';
import { useEffect, useRef, useState } from 'react';
import { pathOf } from '../access/screens';
import { QuestionInput } from './QuestionInput';
import { levelOneSpeech } from './speech';
import type { QuizAttemptSession } from './useQuizAttempt';

// Bài chơi cấp 1 dạng luyện tập: từng câu một, kiểm ngay khi em trả lời (dạng chọn: chạm là kiểm; ghép cặp, sắp xếp: bấm "Kiểm tra"). Bảng
// phản hồi trượt lên từ dưới: đúng thì khen và nhắc vì sao đúng; sai lần đầu thì gợi ý và cho thử lại; sai lần hai thì chỉ đáp án kèm giải
// thích. Không hiện sao, điểm, đồng hồ hay chữ "Sai" màu đỏ trong lúc chơi; lần trả lời đầu tiên của mỗi câu là lần máy chủ chấm. Vào tiếp
// lượt thì bắt đầu ở câu đầu tiên chưa kiểm; đã kiểm hết thì nộp luôn. Sau khi đổi câu hoặc đóng bảng phản hồi, bỏ qua cú chạm trong
// một khoảng ngắn vì trẻ hay chạm lặp vào chỗ cũ.

type Sheet =
  | { kind: 'feedback'; feedback: PracticeFeedback; check: AnswerCheck; answer: QuestionSubmission }
  | { kind: 'offline'; answer: QuestionSubmission }
  | { kind: 'rejected'; message: string };

const TONE_CLASS: Record<'correct' | 'retry' | 'reveal', string> = {
  correct: 'bg-success-container text-on-success-container',
  retry: 'bg-surface-container-low text-on-surface',
  reveal: 'bg-primary-container text-on-primary-container',
};

const TONE_MASCOT: Record<'correct' | 'retry' | 'reveal', IllustrationState> = {
  correct: 'chuc-mung',
  retry: 'dong-vien',
  reveal: 'chao',
};

/** Câu đầu tiên em chưa kiểm; bằng số câu khi đã kiểm hết. */
function firstUnchecked(questions: readonly AttemptQuestion[]): number {
  const index = questions.findIndex((q) => !q.checked);
  return index === -1 ? questions.length : index;
}

export function RunnerLevelOne({ attempt, session }: { attempt: StudentAttempt; session: QuizAttemptSession }) {
  const questions = attempt.questions;
  const total = questions.length;
  const [index, setIndex] = useState(() => firstUnchecked(questions));
  const [tried, setTried] = useState<Record<number, number[]>>({});
  const [misplaced, setMisplaced] = useState<Record<number, number[]>>({});
  const [reveal, setReveal] = useState<Record<number, QuestionSubmission>>({});
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const lockUntil = useRef(0);
  const [autoRead, setAutoRead] = useAutoRead();
  const readAloud = attempt.readAloud && autoRead;

  const allChecked = index >= total;
  const question = questions[Math.min(index, total - 1)]!;
  const last = index === total - 1;
  const answer = session.answers[question.questionId] ?? null;
  const solved = reveal[question.questionId] ?? null;
  const tapOnly = checksOnTap(question.questionType);
  const lock = () => {
    lockUntil.current = Date.now() + TAP_LOCK_MS;
  };

  // Vào tiếp lượt mà câu nào cũng đã kiểm: nộp luôn.
  const autoSubmitted = useRef(false);
  const { submit } = session;
  useEffect(() => {
    if (allChecked && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit();
    }
  }, [allChecked, submit]);

  // Vào mỗi câu thì nhờ máy chủ tạo trước tiếng lời đọc của câu này (nội dung, phương án, hướng dẫn), lời hướng dẫn riêng và câu kế tiếp.
  const upcoming = questions.slice(index, index + 2);
  usePrefetchSpeech(
    upcoming.flatMap((q) => [levelOneSpeech(q), levelOneInstruction(q.questionType)]),
    !allChecked,
  );

  // Câu hỏi tự đọc khi em sang câu; bảng phản hồi tự đọc khi hiện (khi bật "Tự đọc to").
  useEffect(() => {
    if (readAloud && !allChecked) void speakVietnamese(levelOneSpeech(question));
  }, [allChecked, question, readAloud]);
  const sheetSpeech = sheetText(sheet).speech;
  useEffect(() => {
    if (readAloud && sheetSpeech) void speakVietnamese(sheetSpeech);
  }, [readAloud, sheetSpeech]);

  const runCheck = async (body: QuestionSubmission) => {
    const outcome = await session.check(question, body);
    if (outcome.kind === 'closed') return;
    if (outcome.kind === 'offline') return setSheet({ kind: 'offline', answer: body });
    if (outcome.kind === 'rejected') return setSheet({ kind: 'rejected', message: outcome.message });
    const { check } = outcome;
    const feedback = practiceFeedback(question, check, { last });
    if (feedback.done) {
      setReveal((current) => ({ ...current, [question.questionId]: feedback.tone === 'correct' ? body : check.correctAnswer }));
      // Chỉ đáp án sau lần sai thứ hai: phương án vừa chọn cũng làm mờ như lần trước.
      const picked = body.selectedIndex;
      if (feedback.tone === 'reveal' && typeof picked === 'number') {
        setTried((current) => ({ ...current, [question.questionId]: [...(current[question.questionId] ?? []), picked] }));
      }
    } else if (question.questionType === 'ORDERING') {
      setMisplaced((current) => ({ ...current, [question.questionId]: check.parts.flatMap((ok, item) => (ok ? [] : [item])) }));
    }
    setSheet({ kind: 'feedback', feedback, check, answer: body });
  };

  const onChange = (next: QuestionSubmission) => {
    if (sheet || solved || session.checking || Date.now() < lockUntil.current) return;
    session.setAnswer(question, next);
    if (tapOnly) void runCheck(next);
  };

  const goNext = () => {
    setSheet(null);
    lock();
    if (last) {
      void session.submit();
      return;
    }
    setIndex(index + 1);
    window.scrollTo?.({ top: 0 });
  };

  const onSheetAction = () => {
    if (!sheet) return;
    if (sheet.kind === 'offline') {
      setSheet(null);
      void runCheck(sheet.answer);
      return;
    }
    if (sheet.kind === 'rejected') {
      setSheet(null);
      lock();
      return;
    }
    if (sheet.feedback.done) return goNext();
    // Thử lại: dạng chọn làm mờ phương án vừa chọn; ghép cặp gỡ các cặp sai; sắp xếp giữ nguyên để em đổi chỗ.
    const picked = sheet.answer.selectedIndex;
    if (typeof picked === 'number') setTried((current) => ({ ...current, [question.questionId]: [...(current[question.questionId] ?? []), picked] }));
    session.setAnswer(question, retryAnswer(question, sheet.answer, sheet.check) ?? {});
    setSheet(null);
    lock();
  };

  if (allChecked) {
    return (
      <section data-bo-cuc="cap-1" className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-4 text-center">
        <title>{`${attempt.quizName ?? 'Bài chơi'} · DiViet`}</title>
        <Illustration state="chuc-mung" className="size-[104px] rounded-full bg-surface-container-low" />
        <h1 className="text-[28px] font-bold text-on-surface">{session.submitError ? 'Chưa nộp được bài.' : 'Em chơi xong rồi! Đang mở kết quả…'}</h1>
        {session.submitError && (
          <>
            <p className="text-[20px] text-on-surface">{session.submitError}</p>
            <LevelOneButton onClick={() => void session.submit()} disabled={session.submitting}>
              Thử lại
            </LevelOneButton>
          </>
        )}
      </section>
    );
  }

  const done = (q: AttemptQuestion, i: number) => i < index || Boolean(reveal[q.questionId]) || (q.checked && i !== index);
  const text = sheetText(sheet);

  return (
    <section data-bo-cuc="cap-1" className="min-h-dvh bg-background">
      <title>{`${attempt.quizName ?? 'Bài chơi'} · DiViet`}</title>
      <header className="sticky top-0 z-10 border-b-2 border-border bg-surface">
        <div className="mx-auto flex max-w-[960px] items-center gap-3 px-4 py-2">
          <LevelOneIconLink to={pathOf('learnHome')} icon="pause" label="Tạm dừng" />
          <p className="sr-only">{`Câu ${index + 1} trên ${total}`}</p>
          <span aria-hidden="true" className="flex flex-1 flex-wrap items-center justify-center gap-2">
            {questions.map((q, i) => (
              <i
                key={q.questionId}
                className={cn(
                  'block rounded-full',
                  i === index ? 'size-[22px] bg-primary ring-4 ring-primary/25' : done(q, i) ? 'size-3.5 bg-primary/70' : 'size-3.5 bg-border',
                )}
              />
            ))}
          </span>
          <Illustration state="chao" className="size-12 rounded-full bg-surface-container-low" />
        </div>
      </header>

      <div className={cn('mx-auto flex max-w-[960px] flex-col gap-4 px-4 pt-5', sheet ? 'pb-80' : 'pb-10')}>
        <article aria-label={`Câu ${index + 1}`} className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <LevelOneSpeak text={levelOneSpeech(question)} label="Nghe câu hỏi" size={64} />
            <h1 className="min-w-0 flex-1 pt-1 text-(length:--dsv-question-size) leading-(--dsv-question-line-height) font-bold text-on-surface">
              {question.questionType === 'FILL_BLANK' ? 'Điền từ vào chỗ trống' : question.content}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LevelOneSpeak text={levelOneInstruction(question.questionType)} label="Nghe hướng dẫn" size={40} soft />
            <p className="text-[19px] leading-snug font-medium text-on-surface-variant">{levelOneInstruction(question.questionType).replace(/\.$/u, '')}</p>
          </div>
          {question.imageUrl && <img src={question.imageUrl} alt="" className="max-h-72 w-full rounded-[20px] object-cover" loading="lazy" />}
          <QuestionInput
            key={question.questionId}
            question={question}
            answer={solved ?? answer}
            onChange={onChange}
            level={1}
            disabled={session.checking || session.submitting || sheet !== null}
            marks={{
              tried: new Set(tried[question.questionId] ?? []),
              reveal: solved,
              misplaced: new Set(misplaced[question.questionId] ?? []),
            }}
          />
          {!tapOnly && !solved && (
            <LevelOneButton
              className="w-full"
              disabled={!readyToCheck(question, answer) || session.checking || sheet !== null}
              aria-busy={session.checking || undefined}
              onClick={() => answer && Date.now() >= lockUntil.current && void runCheck(answer)}
            >
              Kiểm tra
            </LevelOneButton>
          )}
          {solved && !sheet && (
            <LevelOneButton className="w-full" onClick={goNext} disabled={session.submitting}>
              {last ? 'Xong rồi!' : 'Câu tiếp'}
            </LevelOneButton>
          )}
        </article>
        {attempt.readAloud && (
          <AutoReadSwitch
            on={autoRead}
            onChange={(on) => {
              setAutoRead(on);
            }}
            className="self-start text-[16px]"
          />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {text.title ? `${text.title} ${text.body}` : ''}
      </p>
      {sheet && (
        <FeedbackSheet
          tone={sheet.kind === 'feedback' ? sheet.feedback.tone : 'retry'}
          title={text.title}
          body={text.body}
          speech={text.speech}
          action={text.action}
          busy={session.submitting}
          error={sheet.kind === 'feedback' && sheet.feedback.done && last ? session.submitError : null}
          onAction={onSheetAction}
        />
      )}
    </section>
  );
}

/** Chữ của bảng phản hồi đang mở. */
function sheetText(sheet: Sheet | null): { title: string; body: string; speech: string; action: string } {
  if (!sheet) return { title: '', body: '', speech: '', action: '' };
  if (sheet.kind === 'offline') {
    const title = 'Mạng đang chập chờn.';
    return { title, body: 'Em bấm Thử lại nhé.', speech: 'Mạng đang chập chờn. Em bấm Thử lại nhé.', action: 'Thử lại' };
  }
  if (sheet.kind === 'rejected') return { title: 'Mình làm lại nhé.', body: sheet.message, speech: sheet.message, action: 'Thử lại' };
  const { feedback } = sheet;
  return { title: feedback.title, body: feedback.text, speech: feedback.speech, action: feedback.action };
}

interface FeedbackSheetProps {
  tone: 'correct' | 'retry' | 'reveal';
  title: string;
  body: string;
  speech: string;
  action: string;
  busy: boolean;
  error: string | null;
  onAction: () => void;
}

/** Bảng phản hồi trượt lên từ dưới: linh vật, tiêu đề, lời giải thích, nút nghe và một nút đi tiếp. */
function FeedbackSheet({ tone, title, body, speech, action, busy, error, onAction }: FeedbackSheetProps) {
  const button = useRef<HTMLButtonElement>(null);
  // Bảng vừa hiện: đưa con trỏ vào nút để em bấm Enter là đi tiếp.
  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="fixed inset-x-0 bottom-0 z-40" aria-labelledby="bang-phan-hoi" aria-describedby="bang-phan-hoi-chu">
      <div
        className={cn(
          'dsv-sheet-up mx-auto flex max-w-[960px] flex-col gap-3 rounded-t-[28px] px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgb(0_0_0/0.18)] sm:px-6',
          TONE_CLASS[tone],
        )}
      >
        <div className="flex items-center gap-3">
          <Illustration state={TONE_MASCOT[tone]} className="size-14 rounded-full bg-surface" />
          <h2 id="bang-phan-hoi" className="min-w-0 flex-1 text-[24px] leading-tight font-bold">
            {title}
          </h2>
          <LevelOneSpeak text={speech} label="Nghe lại" size={56} />
        </div>
        <p id="bang-phan-hoi-chu" className="text-[20px] leading-[1.5]">
          {body}
        </p>
        {error && <p className="text-[18px] font-bold">{error}</p>}
        <LevelOneButton ref={button} className="w-full" onClick={onAction} disabled={busy} aria-busy={busy || undefined}>
          {action}
        </LevelOneButton>
      </div>
    </section>
  );
}
