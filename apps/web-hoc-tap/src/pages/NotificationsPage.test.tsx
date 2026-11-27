import type { StudentNotification } from '@dsvhvn/dung-chung/api';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Thông báo của em: nút chuông báo số chưa đọc, trang Thông báo liệt kê bài thầy cô giao, bấm thì đánh dấu đã đọc và mở bài ngay.

const lesson: StudentNotification = {
  id: 1,
  kind: 'LESSON',
  title: 'Bài học mới: Ngọ Môn',
  body: 'Về nhà đọc trước thứ Sáu.',
  lessonId: 7,
  lessonCode: 'BH7F3K2Q',
  quizId: null,
  createdAt: '2026-10-30T02:00:00Z',
  isRead: false,
};
const quiz: StudentNotification = { ...lesson, id: 2, kind: 'QUIZ', title: 'Bài kiểm tra mới: Ngọ Môn', quizId: 31, isRead: true };

const page = (items: StudentNotification[]) => ({
  items,
  page: 1,
  pageSize: 30,
  totalItems: items.length,
  totalPages: 1,
  unreadCount: items.filter((i) => !i.isRead).length,
});

describe('Thông báo của em', () => {
  it('nút chuông báo số chưa đọc và mở trang Thông báo', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(studentServer(student), (call) => (call.path.startsWith('/student/notifications') ? envelope(200, { data: page([lesson, quiz]) }) : undefined));
    const user = userEvent.setup();
    const { router } = renderApp('/hoc');

    await user.click(await screen.findByRole('link', { name: 'Thông báo, 1 chưa đọc' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/thong-bao'));
    expect(await screen.findByText('Bài học mới: Ngọ Môn')).toBeInTheDocument();
    expect(screen.getByText('Bài kiểm tra mới: Ngọ Môn')).toBeInTheDocument();
  });

  it('bấm thông báo bài học: đánh dấu đã đọc rồi mở bài bằng mã', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student), (call) => {
      if (call.path === '/student/notifications/1/read') return envelope(200, { data: null });
      return call.path.startsWith('/student/notifications') ? envelope(200, { data: page([lesson]) }) : undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/thong-bao');

    await user.click(await screen.findByRole('button', { name: /Bài học mới: Ngọ Môn/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH7F3K2Q'));
    expect(calls.some((c) => c.method === 'POST' && c.path === '/student/notifications/1/read')).toBe(true);
  });

  it('bấm thông báo bài kiểm tra đã đọc: vào thẳng bài kiểm tra, không gọi đánh dấu lần nữa', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student), (call) => (call.path.startsWith('/student/notifications') ? envelope(200, { data: page([quiz]) }) : undefined));
    const user = userEvent.setup();
    const { router } = renderApp('/thong-bao');

    await user.click(await screen.findByRole('button', { name: /Bài kiểm tra mới: Ngọ Môn/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH7F3K2Q/kiem-tra/31'));
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('chưa có thông báo nào', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(studentServer(student), (call) => (call.path.startsWith('/student/notifications') ? envelope(200, { data: page([]) }) : undefined));
    renderApp('/thong-bao');
    expect(await screen.findByText('Em chưa có thông báo nào.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã đọc hết' })).not.toBeInTheDocument();
  });

  it('đánh dấu đã đọc hết', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student), (call) => {
      if (call.path === '/student/notifications/read-all') return envelope(200, { data: null });
      return call.path.startsWith('/student/notifications') ? envelope(200, { data: page([lesson]) }) : undefined;
    });
    const user = userEvent.setup();
    renderApp('/thong-bao');

    await user.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc hết' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/student/notifications/read-all')).toBe(true));
  });
});
