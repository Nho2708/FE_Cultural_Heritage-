import { ATTEMPT_ENDPOINTS, type AttemptQuestion, type SchoolLevel, type StudentAttempt, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '../lib/auth/session';
import { envelope, mockApi, sessionOf, studentOf, studentServer, type FetchCall } from '../test/fixtures';
import { attemptOf, checkOf, introOf, questionOf, resultOf, SERVER_NOW } from '../test/quizFixtures';
import { renderApp } from '../test/renderApp';

// Làm bài kiểm tra: trang giới thiệu, bắt đầu, ba bố cục theo cấp, lưu từng câu, nộp, hết giờ tự nộp, mất kết nối, lượt đã nộp.

const PATH = '/bai-hoc/BH7F3K2Q/kiem-tra/9';
const OPEN = { state: { confirmed: true } };

function questions(count = 3): AttemptQuestion[] {
  return Array.from({ length: count }, (_, i) =>
    questionOf({ questionId: 11 + i, position: i + 1, content: `Câu hỏi số ${i + 1}?`, typeName: i === 1 ? 'Đúng/Sai' : 'Một đáp án đúng' }),
  );
}

interface ServerOptions {
  attempt: StudentAttempt;
  intro?: ReturnType<typeof introOf>;
  result?: StudentAttemptResult;
  start?: (call: FetchCall) => Response | undefined;
  save?: (call: FetchCall) => Response | Promise<Response> | undefined;
  submit?: (call: FetchCall) => Response | undefined;
  /** Bài chơi cấp 1: máy chủ kiểm một câu; mặc định là đúng. */
  check?: (call: FetchCall) => Response | undefined;
}

function quizServer(level: SchoolLevel, options: ServerOptions) {
  const student = studentOf(level === 1 ? 4 : level === 3 ? 11 : 7);
  // Phiên hết hạn xa để test đổi giờ hệ thống (bài hết giờ) không làm phiên bị coi là hết hạn.
  sessionStore.setSession(sessionOf(student, { expiresAt: Date.parse('2099-01-01T00:00:00Z') }));
  const result = options.result ?? resultOf(level);
  return mockApi(
    studentServer(student),
    (call) => {
      if (call.path === ATTEMPT_ENDPOINTS.quiz(9)) return envelope(200, { data: options.intro ?? introOf(level) });
      if (call.path === ATTEMPT_ENDPOINTS.start(9) && call.method === 'POST') return options.start?.(call) ?? envelope(201, { data: options.attempt });
      if (call.path.startsWith(`/student/attempts/31/answers/`) && call.method === 'PUT') {
        return options.save?.(call) ?? envelope(200, { data: { questionId: 11, answered: true, savedAt: SERVER_NOW, answeredCount: 1, questionCount: 3, remainingSeconds: null } });
      }
      if (call.path.endsWith('/check') && call.method === 'POST') {
        const questionId = Number(call.path.split('/')[5]);
        return options.check?.(call) ?? envelope(200, { data: checkOf(questionOf({ questionId }), { questionId }) });
      }
      if (call.path === ATTEMPT_ENDPOINTS.submit(31) && call.method === 'POST') return options.submit?.(call) ?? envelope(200, { data: result });
      if (call.path === ATTEMPT_ENDPOINTS.result(31)) return envelope(200, { data: result });
      return undefined;
    },
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Làm bài kiểm tra — trang giới thiệu và bắt đầu', () => {
  it('mở thẳng đường dẫn: hiện giới thiệu (số câu, thời gian, lời nhắc một lần), chưa tạo lượt; bấm Bắt đầu mới tạo lượt', async () => {
    const calls = quizServer(2, { attempt: attemptOf(2, questions()) });
    const user = userEvent.setup();
    renderApp(PATH);

    expect(await screen.findByRole('heading', { level: 1, name: 'Kiểm tra 15 phút: Kinh thành Huế' })).toBeInTheDocument();
    expect(screen.getByText('10 câu')).toBeInTheDocument();
    expect(screen.getByText('15 phút')).toBeInTheDocument();
    expect(screen.getByText('Hướng dẫn của thầy cô')).toBeInTheDocument();
    expect(screen.getByText('Mỗi em chỉ làm một lần, hết giờ bài tự nộp')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Câu hỏi số 1?' })).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'POST' && c.path === ATTEMPT_ENDPOINTS.start(9))).toHaveLength(1);
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-2');
  });

  it('đang làm dở: nút Làm tiếp; đã nộp: chuyển thẳng sang kết quả; chưa mở: chỉ có Đóng và câu giờ mở', async () => {
    quizServer(2, { attempt: attemptOf(2, questions()), intro: introOf(2, { action: 'CONTINUE', actionLabel: 'Làm tiếp', state: 'IN_PROGRESS', attemptId: 31, attemptStatus: 'IN_PROGRESS' }) });
    const first = renderApp(PATH);
    expect(await screen.findByRole('button', { name: 'Làm tiếp' })).toBeInTheDocument();
    first.unmount();

    quizServer(2, { attempt: attemptOf(2, questions()), intro: introOf(2, { action: 'VIEW_RESULT', state: 'SUBMITTED', attemptId: 31, attemptStatus: 'SUBMITTED' }) });
    const second = renderApp(PATH);
    await waitFor(() => expect(second.router.state.location.pathname).toBe('/ket-qua/31'));
    second.unmount();

    quizServer(2, { attempt: attemptOf(2, questions()), intro: introOf(2, { action: 'NOT_OPEN', state: 'NOT_OPEN', notice: 'Bài kiểm tra chưa mở. Thời gian làm bài: từ 07:00 01/10/2026.' }) });
    renderApp(PATH);
    expect(await screen.findByText(/chưa mở\. Thời gian làm bài/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
  });

  it('máy chủ từ chối bắt đầu (đã đóng): hiện câu của máy chủ và lối về bài học', async () => {
    quizServer(2, {
      attempt: attemptOf(2, questions()),
      start: () => envelope(422, { errorCode: 'BLOCKED', message: 'Bài kiểm tra đã đóng.' }),
    });
    renderApp(PATH, OPEN.state);
    expect(await screen.findByText('Bài kiểm tra đã đóng.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về bài học' })).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q');
  });

  it('bắt đầu gặp 409 (đã nộp ở nơi khác): đi xem kết quả', async () => {
    quizServer(2, {
      attempt: attemptOf(2, questions()),
      start: () => envelope(409, { errorCode: 'BLOCKED', message: 'Em đã nộp bài này rồi.' }),
    });
    const { router } = renderApp(PATH, OPEN.state);
    // Trang giới thiệu lần đầu vẫn nói START; lần hỏi lại sau 409 trả lượt đã nộp.
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/(ket-qua\/\d+|bai-hoc\/BH7F3K2Q)$/));
  });
});

describe('Làm bài kiểm tra — cấp 2 (cân bằng)', () => {
  it('đồng hồ, bảng số câu, lưu từng câu ngay khi chọn, nộp có xác nhận liệt kê câu chưa trả lời', async () => {
    const calls = quizServer(2, { attempt: attemptOf(2, questions()) });
    const user = userEvent.setup();
    const { router } = renderApp(PATH, OPEN.state);

    expect(await screen.findByRole('heading', { level: 2, name: 'Câu hỏi số 1?' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('15:00');
    expect(screen.getByText('Đã trả lời 0 / 3 câu. Bấm vào số để chuyển tới câu đó.')).toBeInTheDocument();
    expect(screen.queryByText('Tiếp nhé')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Vua Minh Mạng' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.path).toBe('/student/attempts/31/answers/11');
    expect(put.body).toEqual({ selectedIndex: 1 });
    expect(await screen.findByText(/Đã lưu câu trả lời lúc/)).toBeInTheDocument();
    expect(screen.getByText('Đã trả lời 1 / 3 câu. Bấm vào số để chuyển tới câu đó.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Câu sau' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Câu hỏi số 2?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Câu 1, đã trả lời' }));
    expect(screen.getByRole('radio', { name: 'Vua Minh Mạng' })).toBeChecked();

    // Bỏ chọn bằng cách chọn lại không có; nộp khi còn 2 câu trống.
    await user.click(screen.getByRole('button', { name: 'Nộp bài' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nộp bài kiểm tra?' });
    expect(within(dialog).getByText(/Em còn 2 câu chưa trả lời/)).toBeInTheDocument();
    expect(within(dialog).getByText('Câu chưa trả lời:')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Quay lại làm bài' }));
    expect(calls.some((c) => c.path.endsWith('/submit'))).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Nộp bài' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Nộp bài kiểm tra?' })).getByRole('button', { name: 'Nộp bài' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/ket-qua/31'));
    expect(calls.filter((c) => c.path === ATTEMPT_ENDPOINTS.submit(31))).toHaveLength(1);
    expect(await screen.findByText('Em đạt 8/10 điểm (8/10 câu đúng) trong 12 phút 30 giây.')).toBeInTheDocument();
  });

  it('câu đã lưu từ lần trước hiện lại khi vào tiếp lượt', async () => {
    const saved = questions().map((q, i) => (i === 0 ? { ...q, answered: true, answer: { selectedIndex: 2 } } : q));
    quizServer(2, { attempt: attemptOf(2, saved) });
    renderApp(PATH, OPEN.state);
    expect(await screen.findByRole('radio', { name: 'Vua Tự Đức' })).toBeChecked();
    expect(screen.getByText('Đã trả lời 1 / 3 câu. Bấm vào số để chuyển tới câu đó.')).toBeInTheDocument();
  });

  it('mất kết nối khi lưu: báo mất kết nối, giữ câu trả lời trên màn hình và lưu lại khi có mạng', async () => {
    let online = false;
    const calls = quizServer(2, {
      attempt: attemptOf(2, questions()),
      save: () => (online ? envelope(200, { data: { questionId: 11, answered: true, savedAt: SERVER_NOW, answeredCount: 1, questionCount: 3, remainingSeconds: null } }) : Promise.reject(new TypeError('Failed to fetch'))),
    });
    const user = userEvent.setup();
    renderApp(PATH, OPEN.state);
    await user.click(await screen.findByRole('radio', { name: 'Vua Gia Long' }));

    expect(await screen.findByText(/Mất kết nối\. Đang thử lưu lại câu trả lời/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Vua Gia Long' })).toBeChecked();

    online = true;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByText(/Đã lưu câu trả lời lúc/)).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'PUT').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/Mất kết nối/)).not.toBeInTheDocument();
  });

  it('hết giờ: tự nộp với các câu đã lưu rồi sang kết quả có câu báo hết giờ', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(SERVER_NOW));
    const attempt = attemptOf(2, questions(), { deadline: '2026-10-06T08:00:03.000Z', remainingSeconds: 3 });
    // Máy chủ nhận bài đúng hạn nên ghi là đã nộp; giao diện vẫn báo đây là bài tự nộp khi hết giờ.
    const calls = quizServer(2, { attempt });
    const { router } = renderApp(PATH, OPEN.state);

    expect(await screen.findByRole('timer')).toHaveTextContent('00:03');
    expect(screen.getByRole('timer')).toHaveTextContent('sắp hết giờ');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    await waitFor(() => expect(router.state.location.pathname).toBe('/ket-qua/31'));
    expect(calls.filter((c) => c.path === ATTEMPT_ENDPOINTS.submit(31))).toHaveLength(1);
    expect(await screen.findByText(/Đã hết thời gian làm bài\. Bài của em đã được nộp tự động/)).toBeInTheDocument();
  });

  it('lưu gặp 409 (máy chủ đã chốt lượt vì quá hạn): chuyển sang kết quả', async () => {
    const calls = quizServer(2, {
      attempt: attemptOf(2, questions()),
      save: () => envelope(409, { errorCode: 'BLOCKED', message: 'Bài đã được nộp.' }),
      result: resultOf(2, { status: 'EXPIRED', statusLabel: 'Hết giờ, tự nộp' }),
    });
    const user = userEvent.setup();
    const { router } = renderApp(PATH, OPEN.state);
    await user.click(await screen.findByRole('radio', { name: 'Vua Gia Long' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/ket-qua/31'));
    expect(calls.some((c) => c.path === ATTEMPT_ENDPOINTS.result(31))).toBe(true);
  });
});

describe('Làm bài kiểm tra — cấp 1 (bài chơi luyện tập)', () => {
  /** Máy chủ kiểm câu: lần lượt trả các kết quả trong `answers`, hết thì coi là đúng. */
  function checks(...answers: Array<(call: FetchCall) => Response>) {
    let n = 0;
    return (call: FetchCall) => {
      const next = answers[n];
      n += 1;
      if (next) return next(call);
      const questionId = Number(call.path.split('/')[5]);
      return envelope(200, { data: checkOf(questionOf({ questionId }), { questionId }) });
    };
  }
  const checkCalls = (calls: FetchCall[]) => calls.filter((c) => c.path.endsWith('/check') && c.method === 'POST');

  it('chạm là kiểm: đúng thì khen kèm giải thích; không sao, không đồng hồ, không số câu, không lưu nháp; câu cuối "Xong rồi!" thì nộp', async () => {
    const qs = questions(2);
    const calls = quizServer(1, {
      attempt: attemptOf(1, qs),
      check: checks(() => envelope(200, { data: checkOf(qs[0]!, { explanation: 'Vua Gia Long cho khởi công Kinh thành năm 1805.' }) })),
    });
    const user = userEvent.setup();
    const { router } = renderApp(PATH, OPEN.state);

    expect(await screen.findByRole('heading', { level: 1, name: 'Câu hỏi số 1?' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(screen.getByRole('link', { name: 'Tạm dừng' })).toHaveAttribute('href', '/hoc');
    expect(screen.getByText('Câu 1 trên 2')).toBeInTheDocument();
    expect(screen.getByText('Em chọn câu trả lời nhé')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(/sao/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Câu 1 \/ 2/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Câu trước' })).not.toBeInTheDocument();
    expect(screen.queryByText(/lưu/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vua Gia Long' }));
    const sheet = await screen.findByRole('region', { name: 'Đúng rồi!' });
    expect(within(sheet).getByText('Vua Gia Long cho khởi công Kinh thành năm 1805.')).toBeInTheDocument();
    expect(checkCalls(calls)[0]).toMatchObject({ path: ATTEMPT_ENDPOINTS.check(31, 11), body: { selectedIndex: 0 } });
    expect(screen.getByRole('button', { name: 'Vua Gia Long, đáp án đúng' })).toBeDisabled();

    await user.click(within(sheet).getByRole('button', { name: 'Câu tiếp' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Câu hỏi số 2?' })).toBeInTheDocument();
    expect(screen.getByText('Câu 2 trên 2')).toBeInTheDocument();

    // Chạm ngay sau khi đổi câu bị bỏ qua (trẻ hay chạm lặp); chờ qua khoảng khóa rồi chạm.
    await new Promise((resolve) => setTimeout(resolve, 450));
    await user.click(screen.getByRole('button', { name: 'Vua Tự Đức' }));
    const last = await screen.findByRole('region', { name: 'Giỏi quá!' });
    await user.click(within(last).getByRole('button', { name: 'Xong rồi!' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/ket-qua/31'));
    expect(calls.filter((c) => c.path === ATTEMPT_ENDPOINTS.submit(31))).toHaveLength(1);
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('sai lần đầu: gợi ý, Thử lại làm mờ hình vừa chọn; sai lần hai: chỉ đáp án đúng kèm giải thích, không có chữ "Sai"', async () => {
    const image = questionOf({
      questionId: 21,
      questionType: 'IMAGE_CHOICE',
      typeName: 'Chọn hình đúng',
      content: 'Đâu là Chùa Một Cột?',
      options: [
        { content: null, imageUrl: 'https://anh.test/1.jpg' },
        { content: null, imageUrl: 'https://anh.test/2.jpg' },
        { content: null, imageUrl: 'https://anh.test/3.jpg' },
      ],
    });
    const wrong = (tryCount: number, explanation: string | null = null) => () =>
      envelope(200, { data: checkOf(image, { isCorrect: false, firstTryCorrect: false, tryCount, parts: [false], correctAnswer: { selectedIndex: 2 }, explanation }) });
    const calls = quizServer(1, { attempt: attemptOf(1, [image]), check: checks(wrong(1), wrong(2, 'Chùa đứng trên một cây cột giữa hồ.')) });
    const user = userEvent.setup();
    renderApp(PATH, OPEN.state);

    expect(await screen.findByText('Em chạm vào hình đúng')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hình thứ nhất' }));
    const hint = await screen.findByRole('region', { name: 'Chưa phải hình này.' });
    expect(within(hint).getByText('Em nhớ lại câu chuyện rồi chọn hình khác nhé!')).toBeInTheDocument();
    await user.click(within(hint).getByRole('button', { name: 'Thử lại' }));
    expect(screen.getByRole('button', { name: 'Hình thứ nhất, em đã chọn, chưa đúng' })).toBeDisabled();

    await new Promise((resolve) => setTimeout(resolve, 450));
    await user.click(screen.getByRole('button', { name: 'Hình thứ hai' }));
    const shown = await screen.findByRole('region', { name: 'Đáp án đúng ở đây nè!' });
    expect(within(shown).getByText('Chùa đứng trên một cây cột giữa hồ.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hình thứ ba, đáp án đúng' })).toBeInTheDocument();
    expect(screen.queryByText(/^Sai/)).not.toBeInTheDocument();
    expect(checkCalls(calls).map((c) => c.body)).toEqual([{ selectedIndex: 0 }, { selectedIndex: 1 }]);
    expect(within(shown).getByRole('button', { name: 'Xong rồi!' })).toBeInTheDocument();
  });

  it('ghép cặp chỉ chạm: nút Kiểm tra bật khi nối đủ; gần đúng thì gỡ cặp sai để em nối lại', async () => {
    const matching = questionOf({
      questionId: 31,
      questionType: 'MATCHING',
      typeName: 'Ghép cặp',
      content: 'Nối hình với tên.',
      options: [],
      leftItems: [
        { content: null, imageUrl: 'https://anh.test/1.jpg' },
        { content: null, imageUrl: 'https://anh.test/2.jpg' },
      ],
      rightItems: ['Ngọ Môn', 'Văn Miếu'],
    });
    quizServer(1, {
      attempt: attemptOf(1, [matching]),
      check: checks(() => envelope(200, { data: checkOf(matching, { isCorrect: false, firstTryCorrect: false, parts: [true, false], correctAnswer: { matches: [0, 1] } }) })),
    });
    const user = userEvent.setup();
    renderApp(PATH, OPEN.state);

    const check = await screen.findByRole('button', { name: 'Kiểm tra' });
    expect(check).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^Hình 1/ }));
    await user.click(screen.getByRole('button', { name: 'Ngọ Môn' }));
    await user.click(screen.getByRole('button', { name: /^Hình 2/ }));
    await user.click(screen.getByRole('button', { name: 'Văn Miếu' }));
    expect(check).toBeEnabled();
    await user.click(check);
    const hint = await screen.findByRole('region', { name: 'Gần đúng rồi!' });
    expect(within(hint).getByText(/Em nối đúng 1 trên 2 cặp/)).toBeInTheDocument();
    await user.click(within(hint).getByRole('button', { name: 'Thử lại' }));
    expect(screen.getByRole('button', { name: 'Hình 1, đã nối với Ngọ Môn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hình 2, chưa nối' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toBeDisabled();
  });

  it('mất mạng khi kiểm: bảng "Mạng đang chập chờn", Thử lại gửi lại đúng câu trả lời đó', async () => {
    const qs = questions(1);
    const calls = quizServer(1, {
      attempt: attemptOf(1, qs),
      check: checks(() => envelope(503, { errorCode: 'SYSTEM_ERROR', message: 'Hệ thống đang bận.' })),
    });
    const user = userEvent.setup();
    renderApp(PATH, OPEN.state);

    await user.click(await screen.findByRole('button', { name: 'Vua Minh Mạng' }));
    const offline = await screen.findByRole('region', { name: 'Mạng đang chập chờn.' });
    await user.click(within(offline).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('region', { name: 'Đúng rồi!' })).toBeInTheDocument();
    expect(checkCalls(calls).map((c) => c.body)).toEqual([{ selectedIndex: 1 }, { selectedIndex: 1 }]);
  });

  it('vào tiếp lượt: bắt đầu ở câu đầu tiên chưa kiểm; đã kiểm hết thì nộp luôn', async () => {
    const qs = questions(3).map((q, i) => (i === 0 ? { ...q, checked: true, answered: true, answer: { selectedIndex: 0 } } : q));
    const first = quizServer(1, { attempt: attemptOf(1, qs) });
    const view = renderApp(PATH, OPEN.state);
    expect(await screen.findByRole('heading', { level: 1, name: 'Câu hỏi số 2?' })).toBeInTheDocument();
    expect(screen.getByText('Câu 2 trên 3')).toBeInTheDocument();
    expect(first.filter((c) => c.path === ATTEMPT_ENDPOINTS.submit(31))).toHaveLength(0);
    view.unmount();

    const done = qs.map((q) => ({ ...q, checked: true }));
    const second = quizServer(1, { attempt: attemptOf(1, done) });
    const { router } = renderApp(PATH, OPEN.state);
    await waitFor(() => expect(router.state.location.pathname).toBe('/ket-qua/31'));
    expect(second.filter((c) => c.path === ATTEMPT_ENDPOINTS.submit(31))).toHaveLength(1);
  });
});

describe('Làm bài kiểm tra — cấp 1 tự đọc câu hỏi', () => {
  function stubSpeech() {
    const spoken: string[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: () => undefined, speak: (u: { text: string }) => spoken.push(u.text) });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    return spoken;
  }

  it('câu hỏi tự đọc kèm các phương án và lời hướng dẫn, bảng phản hồi tự đọc; tắt được và nhớ lựa chọn', async () => {
    window.localStorage.clear();
    const spoken = stubSpeech();
    quizServer(1, { attempt: attemptOf(1, questions(2)) });
    const user = userEvent.setup();
    renderApp(PATH, OPEN.state);

    expect(await screen.findByRole('heading', { level: 1, name: 'Câu hỏi số 1?' })).toBeInTheDocument();
    await waitFor(() => expect(spoken).toHaveLength(1));
    expect(spoken[0]).toBe('Câu hỏi số 1? A: Vua Gia Long. B: Vua Minh Mạng. C: Vua Tự Đức. Em chọn câu trả lời nhé.');

    await user.click(screen.getByRole('button', { name: 'Vua Gia Long' }));
    await waitFor(() => expect(spoken).toHaveLength(2));
    expect(spoken[1]).toBe('Đúng rồi! Em nhớ bài giỏi lắm!');

    await user.click(screen.getByRole('switch', { name: 'Tự đọc to' }));
    expect(window.localStorage.getItem('dsvhvn.hoc-tap.tu-doc')).toBe('0');
    await user.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Câu hỏi số 2?' })).toBeInTheDocument();
    expect(spoken).toHaveLength(2);
    window.localStorage.clear();
  });
});

describe('Làm bài kiểm tra — cấp 3 (gọn, đồng hồ, tư liệu ghim)', () => {
  it('bảng số câu nằm ngang, đánh dấu xem lại, tư liệu của nhóm câu hiện bên trái', async () => {
    const passage = 'Huống chi thành Đại La, kinh đô cũ của Cao Vương.';
    const list = [
      questionOf({ questionId: 11, content: 'Câu thường?' }),
      questionOf({ questionId: 12, questionType: 'SOURCE_READING', typeName: 'Đọc tư liệu', content: 'Vì sao chọn Đại La?', passage, passageSource: 'Chiếu dời đô' }),
      questionOf({ questionId: 13, questionType: 'SOURCE_READING', typeName: 'Đọc tư liệu', content: 'Đại La có lợi thế gì?', passage, passageSource: 'Chiếu dời đô' }),
    ];
    quizServer(3, { attempt: attemptOf(3, list) });
    const user = userEvent.setup();
    renderApp(PATH, OPEN.state);

    expect(await screen.findByRole('heading', { level: 2, name: 'Câu thường?' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-3');
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Tư liệu' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Câu 2, chưa trả lời' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Vì sao chọn Đại La?' })).toBeInTheDocument();
    expect(screen.getByText('Tư liệu dùng cho câu 2 – 3 · luôn ghim khi em cuộn')).toBeInTheDocument();
    expect(screen.getByText(passage)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Đánh dấu xem lại' }));
    expect(screen.getByRole('button', { name: 'Đã đánh dấu xem lại' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Câu 2, chưa trả lời, đã đánh dấu xem lại' })).toBeInTheDocument();
    expect(screen.getByText(/Đánh dấu xem lại 1/)).toBeInTheDocument();
  });
});
