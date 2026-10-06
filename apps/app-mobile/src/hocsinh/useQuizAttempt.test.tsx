import { ApiError, type AttemptQuestion, type StudentAttempt, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { act, create } from 'react-test-renderer';
import { useQuizAttempt, type QuizAttemptSession } from './useQuizAttempt';

// Phiên làm bài: lưu từng câu ngay khi chọn, thử lại khi mất kết nối, nộp lưu nốt các câu đang chờ, hết giờ tự nộp, lượt đã chốt ở máy chủ chuyển sang kết quả.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function question(id: number, overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: id,
    position: id,
    point: 1,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: `Câu ${id}`,
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [
      { content: 'A', imageUrl: null },
      { content: 'B', imageUrl: null },
    ],
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    partsTotal: 1,
    answered: false,
    answer: null,
    ...overrides,
  };
}

function attemptOf(overrides: Partial<StudentAttempt> = {}): StudentAttempt {
  return {
    id: 7,
    quizId: 3,
    quizName: 'Bài kiểm tra',
    lessonId: 1,
    lessonTitle: 'Bài học',
    level: 2,
    layout: 'STANDARD',
    readAloud: false,
    showsClock: true,
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString(),
    deadline: null,
    remainingSeconds: null,
    serverTime: new Date().toISOString(),
    timeLimitMinutes: null,
    questionCount: 2,
    answeredCount: 0,
    totalPoint: 2,
    questions: [question(1), question(2)],
    ...overrides,
  };
}

const RESULT = { attemptId: 7 } as StudentAttemptResult;
const MESSAGES = { saveFailed: 'Chưa lưu được', submitFailed: 'Chưa nộp được' };

function setup(attempt: StudentAttempt, api: Parameters<typeof useQuizAttempt>[0]) {
  const finished: Array<{ result: StudentAttemptResult; automatic: boolean }> = [];
  const holder: { current: QuizAttemptSession | null } = { current: null };
  function Harness() {
    holder.current = useQuizAttempt(api, attempt, MESSAGES, (result, automatic) => finished.push({ result, automatic }));
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<Harness />);
  });
  return { session: () => holder.current!, finished, unmount: () => act(() => renderer.unmount()) };
}

const ok = <T,>(data: T) => ({ data, message: null });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('phiên làm bài', () => {
  it('lưu ngay câu em vừa chọn và đếm số câu đã trả lời', async () => {
    const saveAnswer = jest.fn(async () => ok({}) as never);
    const harness = setup(attemptOf(), { saveAnswer, submit: jest.fn(), result: jest.fn() });
    expect(harness.session().unanswered).toEqual([1, 2]);

    await act(async () => harness.session().setAnswer(attemptOf().questions[0]!, { selectedIndex: 1 }));

    expect(saveAnswer).toHaveBeenCalledWith(7, 1, { selectedIndex: 1 });
    expect(harness.session().answeredCount).toBe(1);
    expect(harness.session().unanswered).toEqual([2]);
    expect(harness.session().saveStatus).toBe('saved');
    harness.unmount();
  });

  it('mất kết nối thì giữ bản mới nhất và thử lại sau 3 giây', async () => {
    const saveAnswer = jest.fn().mockRejectedValueOnce(new ApiError(0, 'SYSTEM_ERROR', 'mất mạng')).mockResolvedValue(ok({}));
    const harness = setup(attemptOf(), { saveAnswer, submit: jest.fn(), result: jest.fn() });

    await act(async () => harness.session().setAnswer(attemptOf().questions[0]!, { selectedIndex: 0 }));
    expect(harness.session().saveStatus).toBe('offline');
    expect(saveAnswer).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(saveAnswer).toHaveBeenCalledTimes(2);
    expect(harness.session().saveStatus).toBe('saved');
    harness.unmount();
  });

  it('nộp bài lưu nốt các câu đang chờ rồi báo kết quả không phải tự nộp', async () => {
    const saveAnswer = jest.fn(async () => ok({}) as never);
    const submit = jest.fn(async () => ok(RESULT));
    const harness = setup(attemptOf(), { saveAnswer, submit, result: jest.fn() });

    await act(async () => harness.session().setAnswer(attemptOf().questions[0]!, { selectedIndex: 1 }));
    await act(async () => harness.session().submit());

    expect(submit).toHaveBeenCalledWith(7);
    expect(harness.finished).toEqual([{ result: RESULT, automatic: false }]);
    harness.unmount();
  });

  it('chưa lưu được thì không nộp và báo câu thông báo', async () => {
    const saveAnswer = jest.fn().mockRejectedValue(new ApiError(0, 'SYSTEM_ERROR', 'mất mạng'));
    const submit = jest.fn();
    const harness = setup(attemptOf(), { saveAnswer, submit, result: jest.fn() });

    await act(async () => harness.session().setAnswer(attemptOf().questions[0]!, { selectedIndex: 1 }));
    await act(async () => harness.session().submit());

    expect(submit).not.toHaveBeenCalled();
    expect(harness.session().submitError).toBe(MESSAGES.saveFailed);
    harness.unmount();
  });

  it('lượt đã chốt ở máy chủ (409) thì lấy kết quả và chuyển sang kết quả', async () => {
    const saveAnswer = jest.fn().mockRejectedValue(new ApiError(409, 'CONFLICT', 'đã nộp'));
    const result = jest.fn(async () => ok(RESULT));
    const harness = setup(attemptOf(), { saveAnswer, submit: jest.fn(), result });

    await act(async () => harness.session().setAnswer(attemptOf().questions[0]!, { selectedIndex: 0 }));

    expect(result).toHaveBeenCalledWith(7);
    expect(harness.finished).toEqual([{ result: RESULT, automatic: true }]);
    harness.unmount();
  });

  it('hết giờ thì tự nộp và đánh dấu là tự nộp', async () => {
    const submit = jest.fn(async () => ok(RESULT));
    const now = Date.now();
    const attempt = attemptOf({ deadline: new Date(now + 2000).toISOString(), serverTime: new Date(now).toISOString(), remainingSeconds: 2 });
    const harness = setup(attempt, { saveAnswer: jest.fn(), submit, result: jest.fn() });
    expect(harness.session().remaining).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    expect(harness.session().timedOut).toBe(true);
    expect(submit).toHaveBeenCalled();
    expect(harness.finished[0]?.automatic).toBe(true);
    harness.unmount();
  });
});
