import { clockOffsetMs, hasAnswer, secondsLeft, submissionToSave, unansweredPositions } from '@dsvhvn/dung-chung';
import { ApiError, type AttemptQuestion, type QuestionSubmission, type StudentApi, type StudentAttempt, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

// Phiên làm bài của một lượt (cùng cách làm với web học tập): giữ câu trả lời của em, lưu từng câu lên máy chủ ngay khi em chọn (ghi đè cả câu), thử lại khi mất kết nối,
// đếm ngược theo giờ máy chủ và tự nộp khi hết giờ, nộp bài. Câu trả lời trên màn hình luôn là bản mới nhất em vừa thao tác; bản lưu trên máy chủ chỉ đuổi theo.
// Lượt dùng chung với web: em làm dở trên web thì mở app làm tiếp được (và ngược lại), mỗi bài chỉ một lượt.

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline';

const TEXT_DELAY_MS = 500;
const RETRY_MS = 3000;

export interface QuizAttemptMessages {
  saveFailed: string;
  submitFailed: string;
}

export interface QuizAttemptSession {
  answers: Record<number, QuestionSubmission | null>;
  setAnswer: (question: AttemptQuestion, answer: QuestionSubmission) => void;
  saveStatus: SaveStatus;
  /** Số giây còn lại tới hạn nộp (theo giờ máy chủ); null nếu không có hạn nộp. */
  remaining: number | null;
  /** Vị trí (từ 1) các câu chưa trả lời. */
  unanswered: number[];
  answeredCount: number;
  submit: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
  /** Đã hết giờ và đang tự nộp. */
  timedOut: boolean;
}

export function useQuizAttempt(
  api: Pick<StudentApi, 'saveAnswer' | 'submit' | 'result'>,
  attempt: StudentAttempt,
  messages: QuizAttemptMessages,
  onFinished: (result: StudentAttemptResult, automatic: boolean) => void,
): QuizAttemptSession {
  const [answers, setAnswers] = useState<Record<number, QuestionSubmission | null>>(() => Object.fromEntries(attempt.questions.map((q) => [q.questionId, q.answer ?? null])));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(attempt.remainingSeconds);

  /** Bản mới nhất chưa gửi của từng câu. */
  const pending = useRef(new Map<number, QuestionSubmission>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const inFlight = useRef<Promise<boolean> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);
  /** Hết giờ: bài nộp ra từ đây là tự nộp dù máy chủ ghi nhận còn trong hạn. */
  const timeUp = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const apiRef = useRef(api);
  const messagesRef = useRef(messages);
  useEffect(() => {
    onFinishedRef.current = onFinished;
    apiRef.current = api;
    messagesRef.current = messages;
  });
  /** `drain` tự gọi lại chính nó (thử lại sau lỗi, câu thêm vào đúng lúc vòng gửi kết thúc) nên đi qua ref. */
  const drainRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

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
      // Chưa lấy được kết quả: lần thử sau (lưu tiếp hoặc nộp) sẽ gặp lại tình huống này.
    }
  }, [attempt.id, finish]);

  /** Gửi lần lượt mọi câu đang chờ. Trả true khi không còn câu nào chờ. */
  const drain = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      let ok = true;
      while (pending.current.size > 0 && !finished.current) {
        const [questionId, body] = pending.current.entries().next().value as [number, QuestionSubmission];
        pending.current.delete(questionId);
        setSaveStatus('saving');
        try {
          await apiRef.current.saveAnswer(attempt.id, questionId, body);
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            pending.current.clear();
            void closedByServer();
            ok = false;
            break;
          }
          if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401) {
            // Máy chủ từ chối câu trả lời này (sai cấu trúc): bỏ qua để không kẹt hàng chờ.
            continue;
          }
          // Mất kết nối hoặc lỗi máy chủ: giữ bản mới nhất (nếu em chưa sửa tiếp) và thử lại sau.
          if (!pending.current.has(questionId)) pending.current.set(questionId, body);
          ok = false;
          break;
        }
      }
      if (pending.current.size === 0 && ok) setSaveStatus((status) => (status === 'saving' ? 'saved' : status));
      else if (!ok && pending.current.size > 0) {
        setSaveStatus('offline');
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          void drainRef.current();
        }, RETRY_MS);
      }
      return ok && pending.current.size === 0;
    })().finally(() => {
      inFlight.current = null;
      // Câu vừa được thêm đúng lúc vòng gửi kết thúc: gửi tiếp (trừ khi đang chờ thử lại sau lỗi).
      if (pending.current.size > 0 && !retryTimer.current && !finished.current) void drainRef.current();
    });
    inFlight.current = run;
    return run;
  }, [attempt.id, closedByServer]);
  useEffect(() => {
    drainRef.current = drain;
  }, [drain]);

  const enqueue = useCallback(
    (question: AttemptQuestion, answer: QuestionSubmission, delay: number) => {
      const existing = timers.current.get(question.questionId);
      if (existing) clearTimeout(existing);
      pending.current.set(question.questionId, submissionToSave(question, answer));
      const fire = () => {
        timers.current.delete(question.questionId);
        void drain();
      };
      if (delay <= 0) fire();
      else timers.current.set(question.questionId, setTimeout(fire, delay));
    },
    [drain],
  );

  const setAnswer = useCallback(
    (question: AttemptQuestion, answer: QuestionSubmission) => {
      setAnswers((current) => ({ ...current, [question.questionId]: answer }));
      // Điền chữ bằng bàn phím: chờ em gõ xong mới lưu; các thao tác chạm lưu ngay.
      const typing = question.questionType === 'FILL_BLANK' && question.wordBank.length === 0;
      enqueue(question, answer, typing ? TEXT_DELAY_MS : 0);
    },
    [enqueue],
  );

  /** Gửi hết câu đang chờ (kể cả câu đang đợi em gõ xong). */
  const flush = useCallback(async (): Promise<boolean> => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (inFlight.current) await inFlight.current;
    return pending.current.size === 0 ? true : drain();
  }, [drain]);

  const submit = useCallback(async () => {
    if (finished.current) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await flush();
      if (finished.current) return;
      if (!saved) {
        setSubmitError(messagesRef.current.saveFailed);
        return;
      }
      const { data } = await apiRef.current.submit(attempt.id);
      finish(data, timeUp.current);
    } catch (error) {
      if (!finished.current) setSubmitError(error instanceof ApiError ? error.message : messagesRef.current.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }, [attempt.id, finish, flush]);

  // Đồng hồ: mỗi giây tính lại từ giờ máy chủ, không cộng dồn nên không trôi khi app bị làm chậm.
  useEffect(() => {
    if (attempt.deadline === null) return;
    // Độ lệch giữa đồng hồ máy chủ và máy em đo một lần lúc tải lượt; mỗi nhịp tính lại từ giờ máy chủ.
    const offset = clockOffsetMs(attempt.serverTime, Date.now());
    const tick = () => setRemaining(secondsLeft(attempt.deadline, offset, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [attempt.deadline, attempt.serverTime]);

  // Hết giờ: tự nộp; mất mạng thì thử lại tới khi nộp được (máy chủ nhận thêm 30 giây ân hạn rồi tự chốt lượt).
  const autoSubmit = useRef(false);
  useEffect(() => {
    if (remaining !== 0 || finished.current) return;
    setTimedOut(true);
    timeUp.current = true;
    if (autoSubmit.current) return;
    autoSubmit.current = true;
    let stopped = false;
    const attemptSubmit = async () => {
      if (stopped || finished.current) return;
      await submit();
      if (!stopped && !finished.current) setTimeout(() => void attemptSubmit(), RETRY_MS);
    };
    void attemptSubmit();
    return () => {
      stopped = true;
    };
  }, [remaining, submit]);

  // Quay lại app (có mạng trở lại, mở lại từ nền) thì lưu ngay các câu đang chờ.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void drainRef.current();
    });
    return () => subscription.remove();
  }, []);

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const unanswered = useMemo(() => unansweredPositions(attempt.questions, answers), [attempt.questions, answers]);
  const answeredCount = attempt.questions.filter((q) => hasAnswer(q, answers[q.questionId])).length;

  return { answers, setAnswer, saveStatus, remaining, unanswered, answeredCount, submit, submitting, submitError, timedOut };
}
