import { TAP_LOCK_MS, checksOnTap, practiceFeedback, readyToCheck, retryAnswer, submissionToSave, type PracticeFeedback } from '@dsvhvn/dung-chung';
import { ApiError, type AnswerCheck, type AttemptQuestion, type QuestionSubmission, type StudentApi, type StudentAttempt, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { serverErrorText } from '../serverErrorText';

// Phiên bài chơi cấp 1 dạng luyện tập (cùng cách làm với web học tập): mỗi câu kiểm ngay trên máy chủ, không lưu nháp. Dạng chọn kiểm khi em
// chạm; ghép cặp và sắp xếp kiểm khi em bấm "Kiểm tra". Đúng thì khen; sai lần đầu thì gợi ý rồi cho thử lại (phương án vừa chọn sai bị làm
// mờ); sai lần hai thì chỉ đáp án kèm giải thích. Lần trả lời đầu tiên của mỗi câu là lần được chấm (máy chủ giữ). Vào tiếp lượt thì bắt đầu
// ở câu đầu tiên chưa kiểm; đã kiểm hết thì nộp luôn. Sau khi đổi câu hoặc đóng bảng phản hồi, cú chạm trong 400 ms bị bỏ qua (trẻ hay chạm
// lặp vào chỗ cũ). Mất mạng khi kiểm thì hiện bảng "Thử lại", gửi lại đúng câu trả lời đó; lượt đã chốt ở máy chủ (409) thì sang kết quả.

/**
 * `answer`: em đang trả lời. `checking`: đang kiểm. `feedback`: bảng phản hồi đang mở. `offline`: kiểm hay nộp không tới được máy chủ,
 * chờ em bấm "Thử lại". `submitting`: đang nộp bài.
 */
export type PracticePhase = 'answer' | 'checking' | 'feedback' | 'offline' | 'submitting';

export type DotState = 'done' | 'current' | 'todo';

export interface PracticeSession {
  index: number;
  question: AttemptQuestion;
  total: number;
  /** Câu trả lời đang hiện trên câu (đáp án đúng khi đã chỉ đáp án). */
  answer: QuestionSubmission | null;
  /** Phương án đã chọn sai ở câu này: làm mờ và khóa. */
  wrong: ReadonlySet<number>;
  /** Câu đã xong và câu trả lời đang hiện là đáp án đúng (sáng viền xanh, dấu tích). */
  solved: boolean;
  /** Đúng sai từng phần sau lần thử chưa đúng gần nhất (ghép cặp, sắp xếp), để gợi ý phần cần sửa. */
  marks: readonly boolean[] | null;
  feedback: PracticeFeedback | null;
  phase: PracticePhase;
  /** Lời máy chủ khi từ chối câu trả lời (thiếu cặp, trống). */
  error: string | null;
  dots: DotState[];
  /** Bấm "Kiểm tra" được (ghép cặp, sắp xếp đã làm đủ). */
  canCheck: boolean;
  setAnswer: (next: QuestionSubmission) => void;
  check: () => void;
  /** Nút của bảng phản hồi: thử lại, câu tiếp, hoặc nộp ở câu cuối. */
  act: () => void;
  /** Nút "Thử lại" của bảng mất mạng. */
  retry: () => void;
}

export function usePracticeAttempt(
  api: Pick<StudentApi, 'checkAnswer' | 'submit' | 'result'>,
  attempt: StudentAttempt,
  messages: { checkFailed: string },
  onFinished: (result: StudentAttemptResult, automatic: boolean) => void,
): PracticeSession {
  const questions = attempt.questions;
  const total = questions.length;
  const [done, setDone] = useState<ReadonlySet<number>>(() => new Set(questions.filter((q) => q.checked).map((q) => q.questionId)));
  const [index, setIndex] = useState(() => {
    const first = questions.findIndex((q) => !q.checked);
    return first >= 0 ? first : Math.max(0, total - 1);
  });
  const question = questions[index]!;
  const [answer, setAnswerState] = useState<QuestionSubmission | null>(null);
  const [wrong, setWrong] = useState<ReadonlySet<number>>(() => new Set());
  const [solved, setSolved] = useState(false);
  const [marks, setMarks] = useState<readonly boolean[] | null>(null);
  const [lastCheck, setLastCheck] = useState<AnswerCheck | null>(null);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  // Vào tiếp một lượt đã kiểm hết các câu thì nộp luôn, nên bắt đầu ở trạng thái đang nộp.
  const allChecked = total === 0 || questions.every((q) => q.checked);
  const [phase, setPhase] = useState<PracticePhase>(allChecked ? 'submitting' : 'answer');
  const [error, setError] = useState<string | null>(null);

  /** Việc cần làm lại khi em bấm "Thử lại" ở bảng mất mạng: kiểm lại đúng câu trả lời vừa gửi, hoặc nộp lại. */
  const [pendingRetry, setPendingRetry] = useState<{ kind: 'check'; body: QuestionSubmission } | { kind: 'submit' } | null>(null);
  const lockUntil = useRef(0);
  const finished = useRef(false);
  const apiRef = useRef(api);
  const onFinishedRef = useRef(onFinished);
  const messagesRef = useRef(messages);
  useEffect(() => {
    apiRef.current = api;
    onFinishedRef.current = onFinished;
    messagesRef.current = messages;
  });

  const finish = useCallback((result: StudentAttemptResult, automatic: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onFinishedRef.current(result, automatic);
  }, []);

  /** Lượt đã chốt ở máy chủ (đã nộp hoặc quá hạn): chuyển sang kết quả. */
  const closedByServer = useCallback(async () => {
    try {
      const { data } = await apiRef.current.result(attempt.id);
      finish(data, true);
    } catch {
      setPhase('offline');
    }
  }, [attempt.id, finish]);

  /** Gửi lệnh nộp (trạng thái "đang nộp" đã bật trước đó). */
  const sendSubmit = useCallback(async () => {
    if (finished.current) return;
    try {
      const { data } = await apiRef.current.submit(attempt.id);
      finish(data, false);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        await closedByServer();
        return;
      }
      setPendingRetry({ kind: 'submit' });
      setPhase('offline');
    }
  }, [attempt.id, closedByServer, finish]);

  const submit = useCallback(async () => {
    setPhase('submitting');
    await sendSubmit();
  }, [sendSubmit]);

  const submittedOnOpen = useRef(false);
  useEffect(() => {
    if (submittedOnOpen.current || !allChecked) return;
    submittedOnOpen.current = true;
    void sendSubmit();
  }, [allChecked, sendSubmit]);

  /** Câu kế tiếp chưa xong sau câu đang làm; -1 nếu không còn. */
  const nextOpen = useCallback((from: number, finishedIds: ReadonlySet<number>) => questions.findIndex((q, i) => i > from && !finishedIds.has(q.questionId)), [questions]);

  const runCheck = useCallback(
    async (body: QuestionSubmission) => {
      setPhase('checking');
      setError(null);
      try {
        const { data } = await apiRef.current.checkAnswer(attempt.id, question.questionId, submissionToSave(question, body));
        const last = nextOpen(index, done) < 0;
        const result = practiceFeedback(question, data, { last });
        setLastCheck(data);
        setFeedback(result);
        if (result.tone === 'retry') {
          if (checksOnTap(question.questionType) && typeof body.selectedIndex === 'number') {
            const picked = body.selectedIndex;
            setWrong((current) => new Set(current).add(picked));
          }
          setMarks(question.questionType === 'MATCHING' || question.questionType === 'ORDERING' ? data.parts : null);
        } else {
          setSolved(true);
          setMarks(null);
          if (result.tone === 'reveal') setAnswerState(data.correctAnswer);
        }
        setPhase('feedback');
      } catch (failure) {
        if (failure instanceof ApiError && failure.status === 409) {
          await closedByServer();
          return;
        }
        if (failure instanceof ApiError && failure.status >= 400 && failure.status < 500 && failure.status !== 401 && failure.status !== 408 && failure.status !== 429) {
          // Máy chủ từ chối câu trả lời này (trống, nối chưa đủ cặp): báo lời của máy chủ, em sửa rồi kiểm lại.
          setError(serverErrorText(failure, messagesRef.current.checkFailed));
          if (checksOnTap(question.questionType)) setAnswerState(null);
          setPhase('answer');
          return;
        }
        setPendingRetry({ kind: 'check', body });
        setPhase('offline');
      }
    },
    [attempt.id, closedByServer, done, index, nextOpen, question],
  );

  const setAnswer = useCallback(
    (next: QuestionSubmission) => {
      if (phase !== 'answer' || solved || Date.now() < lockUntil.current) return;
      if (checksOnTap(question.questionType) && typeof next.selectedIndex === 'number' && wrong.has(next.selectedIndex)) return;
      setAnswerState(next);
      setError(null);
      setMarks(null);
      if (checksOnTap(question.questionType)) void runCheck(next);
    },
    [phase, question.questionType, runCheck, solved, wrong],
  );

  const check = useCallback(() => {
    if (phase !== 'answer' || solved || Date.now() < lockUntil.current || !readyToCheck(question, answer)) return;
    void runCheck(answer!);
  }, [answer, phase, question, runCheck, solved]);

  const act = useCallback(() => {
    if (phase !== 'feedback' || !feedback || !lastCheck) return;
    if (!feedback.done) {
      // Thử lại: ghép cặp gỡ cặp sai, sắp xếp giữ nguyên để em đổi chỗ, dạng chọn bỏ chọn.
      setAnswerState(retryAnswer(question, answer, lastCheck));
      setFeedback(null);
      setPhase('answer');
      lockUntil.current = Date.now() + TAP_LOCK_MS;
      return;
    }
    const finishedIds = new Set(done).add(question.questionId);
    setDone(finishedIds);
    const next = nextOpen(index, finishedIds);
    setFeedback(null);
    if (next < 0) {
      void submit();
      return;
    }
    setIndex(next);
    setAnswerState(null);
    setWrong(new Set());
    setSolved(false);
    setMarks(null);
    setLastCheck(null);
    setPhase('answer');
    lockUntil.current = Date.now() + TAP_LOCK_MS;
  }, [answer, done, feedback, index, lastCheck, nextOpen, phase, question, submit]);

  const retry = useCallback(() => {
    if (phase !== 'offline') return;
    setPendingRetry(null);
    if (pendingRetry?.kind === 'check') void runCheck(pendingRetry.body);
    else if (pendingRetry?.kind === 'submit') void submit();
    else void closedByServer();
  }, [closedByServer, pendingRetry, phase, runCheck, submit]);

  const dots = useMemo<DotState[]>(() => questions.map((q, i) => (i === index ? 'current' : done.has(q.questionId) ? 'done' : 'todo')), [done, index, questions]);

  return {
    index,
    question,
    total,
    answer,
    wrong,
    solved,
    marks,
    feedback,
    phase,
    error,
    dots,
    canCheck: phase === 'answer' && !solved && readyToCheck(question, answer),
    setAnswer,
    check,
    act,
    retry,
  };
}
