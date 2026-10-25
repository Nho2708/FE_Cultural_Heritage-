import { ApiError, type StudentAttempt, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { act, create } from 'react-test-renderer';
import { answerCheck, attemptQuestion, practiceAttempt } from './testKit';
import { usePracticeAttempt, type PracticeSession } from './usePracticeAttempt';

// Bài chơi cấp 1 dạng luyện tập: kiểm từng câu ngay, sai lần đầu cho thử lại (phương án sai bị khóa), sai lần hai chỉ đáp án, vào tiếp ở câu
// chưa kiểm, chống chạm lặp 400 ms, mất mạng thì gửi lại đúng câu trả lời, lượt đã chốt thì sang kết quả.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RESULT = { attemptId: 7 } as StudentAttemptResult;
const ok = <T,>(data: T) => ({ data, message: null });
const MESSAGES = { checkFailed: 'Mạng đang chập chờn.' };

type Api = Parameters<typeof usePracticeAttempt>[0];

function setup(attempt: StudentAttempt, api: Partial<Api>) {
  const full: Api = { checkAnswer: jest.fn(), submit: jest.fn(async () => ok(RESULT)), result: jest.fn(async () => ok(RESULT)), ...api } as Api;
  const finished: Array<{ result: StudentAttemptResult; automatic: boolean }> = [];
  const holder: { current: PracticeSession | null } = { current: null };
  function Harness() {
    holder.current = usePracticeAttempt(full, attempt, MESSAGES, (result, automatic) => finished.push({ result, automatic }));
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<Harness />);
  });
  return { session: () => holder.current!, api: full, finished, unmount: () => act(() => renderer.unmount()) };
}

const pass = async (ms = 450) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('bài chơi luyện tập cấp 1', () => {
  const three = () => [attemptQuestion(1), attemptQuestion(2), attemptQuestion(3)];

  it('chạm là kiểm ngay; đúng thì khen kèm giải thích rồi sang câu tiếp', async () => {
    const checkAnswer = jest.fn(async () => ok(answerCheck(1)));
    const harness = setup(practiceAttempt(three()), { checkAnswer });
    expect(harness.session().dots).toEqual(['current', 'todo', 'todo']);

    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    expect(checkAnswer).toHaveBeenCalledWith(7, 1, { selectedIndex: 1 });
    expect(harness.session().phase).toBe('feedback');
    expect(harness.session().feedback).toMatchObject({ tone: 'correct', title: 'Đúng rồi!', text: 'Chùa đứng trên một cây cột đá giữa hồ.', action: 'Câu tiếp' });
    expect(harness.session().solved).toBe(true);

    await act(async () => harness.session().act());
    expect(harness.session().index).toBe(1);
    expect(harness.session().dots).toEqual(['done', 'current', 'todo']);
    expect(harness.session().answer).toBeNull();
    harness.unmount();
  });

  it('sai lần đầu: gợi ý, làm mờ phương án sai, thử lại; sai lần hai: chỉ đáp án đúng', async () => {
    const checkAnswer = jest
      .fn()
      .mockResolvedValueOnce(ok(answerCheck(1, { isCorrect: false, firstTryCorrect: false, tryCount: 1, parts: [false] })))
      .mockResolvedValueOnce(ok(answerCheck(1, { isCorrect: false, firstTryCorrect: false, tryCount: 2, parts: [false], correctAnswer: { selectedIndex: 1 } })));
    const harness = setup(practiceAttempt(three()), { checkAnswer });

    await act(async () => harness.session().setAnswer({ selectedIndex: 0 }));
    expect(harness.session().feedback).toMatchObject({ tone: 'retry', title: 'Chưa phải hình này.', action: 'Thử lại' });
    expect([...harness.session().wrong]).toEqual([0]);

    await act(async () => harness.session().act());
    expect(harness.session().phase).toBe('answer');
    expect(harness.session().answer).toBeNull();
    // Phương án đã chọn sai không chạm lại được.
    await pass();
    await act(async () => harness.session().setAnswer({ selectedIndex: 0 }));
    expect(checkAnswer).toHaveBeenCalledTimes(1);

    await act(async () => harness.session().setAnswer({ selectedIndex: 2 }));
    expect(checkAnswer).toHaveBeenCalledTimes(2);
    expect(harness.session().feedback).toMatchObject({ tone: 'reveal', title: 'Đáp án đúng ở đây nè!', action: 'Câu tiếp' });
    expect(harness.session().answer).toEqual({ selectedIndex: 1 });
    expect(harness.session().solved).toBe(true);
    harness.unmount();
  });

  it('bỏ qua cú chạm trong 400 ms sau khi đóng bảng phản hồi hoặc đổi câu', async () => {
    const checkAnswer = jest.fn(async () => ok(answerCheck(1)));
    const harness = setup(practiceAttempt(three()), { checkAnswer });
    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    await act(async () => harness.session().act());

    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    expect(checkAnswer).toHaveBeenCalledTimes(1);
    await pass();
    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    expect(checkAnswer).toHaveBeenCalledTimes(2);
    harness.unmount();
  });

  it('ghép cặp chỉ kiểm khi nối đủ và bấm Kiểm tra; thử lại giữ các cặp đúng, gỡ cặp sai', async () => {
    const matching = attemptQuestion(1, { questionType: 'MATCHING', options: [], leftItems: [{ content: 'Hình 1', imageUrl: null }, { content: 'Hình 2', imageUrl: null }], rightItems: ['Chùa', 'Cầu'], partsTotal: 2 });
    const checkAnswer = jest.fn(async () => ok(answerCheck(1, { isCorrect: false, firstTryCorrect: false, tryCount: 1, parts: [true, false], correctAnswer: { matches: [0, 1] } })));
    const harness = setup(practiceAttempt([matching, attemptQuestion(2)]), { checkAnswer });

    await act(async () => harness.session().setAnswer({ matches: [0, null] }));
    expect(checkAnswer).not.toHaveBeenCalled();
    expect(harness.session().canCheck).toBe(false);
    await act(async () => harness.session().setAnswer({ matches: [0, 0] }));
    expect(harness.session().canCheck).toBe(true);

    await act(async () => harness.session().check());
    expect(checkAnswer).toHaveBeenCalledWith(7, 1, { matches: [0, 0] });
    expect(harness.session().feedback).toMatchObject({ tone: 'retry', title: 'Gần đúng rồi!' });
    expect(harness.session().marks).toEqual([true, false]);

    await act(async () => harness.session().act());
    expect(harness.session().answer).toEqual({ matches: [0, null] });
    harness.unmount();
  });

  it('vào tiếp lượt thì bắt đầu ở câu đầu tiên chưa kiểm', async () => {
    const questions = [attemptQuestion(1, { checked: true, answered: true, answer: { selectedIndex: 1 } }), attemptQuestion(2), attemptQuestion(3)];
    const harness = setup(practiceAttempt(questions), {});
    expect(harness.session().index).toBe(1);
    expect(harness.session().question.questionId).toBe(2);
    expect(harness.session().dots).toEqual(['done', 'current', 'todo']);
    harness.unmount();
  });

  it('đã kiểm hết các câu thì nộp luôn khi vào lại', async () => {
    const questions = [attemptQuestion(1, { checked: true }), attemptQuestion(2, { checked: true })];
    const submit = jest.fn(async () => ok(RESULT));
    const harness = setup(practiceAttempt(questions), { submit });
    await act(async () => {
      await Promise.resolve();
    });
    expect(submit).toHaveBeenCalledWith(7);
    expect(harness.finished).toEqual([{ result: RESULT, automatic: false }]);
    harness.unmount();
  });

  it('câu cuối "Xong rồi!" thì nộp bài và sang kết quả', async () => {
    const checkAnswer = jest.fn(async () => ok(answerCheck(2)));
    const submit = jest.fn(async () => ok(RESULT));
    const harness = setup(practiceAttempt([attemptQuestion(1, { checked: true }), attemptQuestion(2)]), { checkAnswer, submit });
    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    expect(harness.session().feedback?.action).toBe('Xong rồi!');
    await act(async () => harness.session().act());
    expect(submit).toHaveBeenCalledTimes(1);
    expect(harness.finished).toEqual([{ result: RESULT, automatic: false }]);
    harness.unmount();
  });

  it('mất mạng khi kiểm: hiện bảng Thử lại và gửi lại đúng câu trả lời đó', async () => {
    const checkAnswer = jest.fn().mockRejectedValueOnce(new ApiError(0, 'SYSTEM_ERROR', 'mất mạng')).mockResolvedValueOnce(ok(answerCheck(1)));
    const harness = setup(practiceAttempt(three()), { checkAnswer });
    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    expect(harness.session().phase).toBe('offline');

    await act(async () => harness.session().retry());
    expect(checkAnswer).toHaveBeenCalledTimes(2);
    expect(checkAnswer).toHaveBeenLastCalledWith(7, 1, { selectedIndex: 1 });
    expect(harness.session().phase).toBe('feedback');
    harness.unmount();
  });

  it('lượt đã chốt ở máy chủ (409) thì lấy kết quả và chuyển sang kết quả', async () => {
    const checkAnswer = jest.fn().mockRejectedValue(new ApiError(409, 'CONFLICT', 'đã nộp'));
    const result = jest.fn(async () => ok(RESULT));
    const harness = setup(practiceAttempt(three()), { checkAnswer, result });
    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    expect(result).toHaveBeenCalledWith(7);
    expect(harness.finished).toEqual([{ result: RESULT, automatic: true }]);
    harness.unmount();
  });

  it('máy chủ từ chối câu trả lời (400) thì báo lời của máy chủ, em làm lại được', async () => {
    const checkAnswer = jest.fn().mockRejectedValueOnce(new ApiError(400, 'VALIDATION_ERROR', 'Em hãy chọn câu trả lời trước khi kiểm tra.'));
    const harness = setup(practiceAttempt(three()), { checkAnswer });
    await act(async () => harness.session().setAnswer({ selectedIndex: 1 }));
    expect(harness.session().phase).toBe('answer');
    expect(harness.session().error).toBe('Em hãy chọn câu trả lời trước khi kiểm tra.');
    harness.unmount();
  });
});
