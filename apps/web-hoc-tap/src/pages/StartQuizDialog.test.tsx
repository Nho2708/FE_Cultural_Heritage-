import { ATTEMPT_ENDPOINTS } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { introOf } from '../test/quizFixtures';
import { quizOf, studentLessonOf } from '../test/lessonFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Hộp thoại "Bắt đầu bài kiểm tra" trên trang bài học: số câu, thời gian, giờ đóng, lời nhắc một lần; nút theo việc em làm được.

function open(intro: ReturnType<typeof introOf>, quizState: 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' = 'OPEN') {
  const student = studentOf(7);
  signInAs(student);
  const lesson = studentLessonOf(2, { quizzes: [quizOf(9, { name: 'Kiểm tra 15 phút: Kinh thành Huế', state: quizState })] });
  mockApi(
    (call) => (call.path === '/student/lessons/BH7F3K2Q' ? envelope(200, { data: lesson }) : undefined),
    (call) => (call.path === ATTEMPT_ENDPOINTS.quiz(9) ? envelope(200, { data: intro }) : undefined),
    studentServer(student),
  );
  return renderApp('/bai-hoc/BH7F3K2Q');
}

async function openQuizTab(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(await screen.findByRole('tab', { name: 'Bài kiểm tra' }));
  await user.click(await screen.findByRole('button', { name: label }));
  return screen.findByRole('dialog', { name: 'Kiểm tra 15 phút: Kinh thành Huế' });
}

describe('Hộp thoại Bắt đầu bài kiểm tra', () => {
  it('chưa làm: giới thiệu bài, Bắt đầu đi thẳng vào bài (không nhập mã lần hai), Để sau đóng hộp thoại', async () => {
    const user = userEvent.setup();
    const { router } = open(introOf(2));
    const dialog = await openQuizTab(user, /^Làm bài/);
    expect(await within(dialog).findByText('10 câu')).toBeInTheDocument();
    expect(within(dialog).getByText('15 phút')).toBeInTheDocument();
    expect(within(dialog).getByText(/Đóng lúc/)).toBeInTheDocument();
    expect(within(dialog).getByText('Hướng dẫn của thầy cô')).toBeInTheDocument();
    expect(within(dialog).getByText('Mỗi em chỉ làm một lần, hết giờ bài tự nộp')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Để sau' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Kiểm tra 15 phút: Kinh thành Huế' })).not.toBeInTheDocument());

    const again = await openQuizTab(user, /^Làm bài/);
    await user.click(await within(again).findByRole('button', { name: 'Bắt đầu' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH7F3K2Q/kiem-tra/9'));
    expect(router.state.location.state).toEqual({ confirmed: true });
  });

  it('đang làm dở: nút Làm tiếp; đã nộp: nút Xem kết quả dẫn tới kết quả', async () => {
    const user = userEvent.setup();
    const first = open(introOf(2, { action: 'CONTINUE', attemptId: 31, attemptStatus: 'IN_PROGRESS', state: 'IN_PROGRESS' }), 'IN_PROGRESS');
    const dialog = await openQuizTab(user, /^Làm tiếp/);
    expect(await within(dialog).findByRole('button', { name: 'Làm tiếp' })).toBeInTheDocument();
    first.unmount();

    const second = open(introOf(2, { action: 'VIEW_RESULT', attemptId: 31, attemptStatus: 'SUBMITTED', state: 'SUBMITTED' }), 'SUBMITTED');
    const viewed = await openQuizTab(user, /^Xem kết quả/);
    await user.click(await within(viewed).findByRole('button', { name: 'Xem kết quả' }));
    await waitFor(() => expect(second.router.state.location.pathname).toBe('/ket-qua/31'));
  });
});
