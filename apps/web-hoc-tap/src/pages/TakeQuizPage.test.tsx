import { ATTEMPT_ENDPOINTS, type AttemptQuestion, type SchoolLevel, type StudentAttempt, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockApi, studentOf, studentServer, type FetchCall } from '../test/fixtures';
import { attemptOf, introOf, questionOf, resultOf, SERVER_NOW } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

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
}

function quizServer(level: SchoolLevel, options: ServerOptions) {
  const student = studentOf(level === 1 ? 4 : level === 3 ? 11 : 7);
  signInAs(student);
  const result = options.result ?? resultOf(level);
  return mockApi(
    studentServer(student),
    (call) => {
      if (call.path === ATTEMPT_ENDPOINTS.quiz(9)) return envelope(200, { data: options.intro ?? introOf(level) });
      if (call.path === ATTEMPT_ENDPOINTS.start(9) && call.method === 'POST') return options.start?.(call) ?? envelope(201, { data: options.attempt });
      if (call.path.startsWith(`/student/attempts/31/answers/`) && call.method === 'PUT') {
        return options.save?.(call) ?? envelope(200, { data: { questionId: 11, answered: true, savedAt: SERVER_NOW, answeredCount: 1, questionCount: 3, remainingSeconds: null } });
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
    const calls = quizServer(2, { attempt, result: resultOf(2, { status: 'EXPIRED', statusLabel: 'Hết giờ, tự nộp' }) });
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

describe('Làm bài kiểm tra — cấp 1 (từng câu, nút lớn)', () => {
  it('không đồng hồ, hàng sao tiến độ, nút Tiếp nhé và Xong rồi!, câu cuối còn câu trống thì hỏi làm tiếp hay nộp', async () => {
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
    const calls = quizServer(1, { attempt: attemptOf(1, questions(2)) });
    const user = userEvent.setup();
    const { router } = renderApp(PATH, OPEN.state);

    expect(await screen.findByRole('heading', { level: 2, name: 'Câu hỏi số 1?' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạm dừng' })).toHaveAttribute('href', '/hoc');
    expect(screen.getByText('0 trên 2 sao')).toBeInTheDocument();
    expect(screen.getAllByText('Câu 1 / 2')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Nghe đọc câu hỏi' }));
    expect(spoken[0]).toMatch(/^Câu hỏi số 1\?\. Đáp án A: Vua Gia Long\. Đáp án B: Vua Minh Mạng/);

    await user.click(screen.getByRole('radio', { name: 'Vua Gia Long' }));
    expect(await screen.findByText('1 trên 2 sao')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getAllByText('Câu 2 / 2')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Xong rồi!' }));
    const dialog = await screen.findByRole('dialog', { name: 'Em muốn làm tiếp hay nộp?' });
    expect(within(dialog).getByText('Em còn 1 câu chưa làm.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Làm tiếp' }));

    await user.click(screen.getByRole('radio', { name: 'Vua Tự Đức' }));
    await user.click(screen.getByRole('button', { name: 'Xong rồi!' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/ket-qua/31'));
    expect(calls.filter((c) => c.path === ATTEMPT_ENDPOINTS.submit(31))).toHaveLength(1);
    expect(await screen.findByText('Giỏi quá! Em được 3 sao, em thật xuất sắc!')).toBeInTheDocument();
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
