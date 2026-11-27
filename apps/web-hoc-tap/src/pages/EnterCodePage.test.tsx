import { ERROR_CODES } from '@dsvhvn/dung-chung/api';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { rememberLesson } from '../lessons/recent';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { studentLessonOf } from '../test/lessonFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Nhập mã bài học: gõ tay, tự chuẩn hóa, báo sai không lộ mã có ở lớp khác hay không, bị chặn khi nhập sai quá nhiều lần.

const WRONG = 'Mã bài học chưa đúng hoặc không dành cho lớp của em. Em hãy kiểm tra lại mã thầy cô đã đưa.';

describe('Nhập mã bài học', () => {
  it('mã sai dạng báo ngay, không gọi máy chủ (không tính vào giới hạn nhập sai)', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student));
    const user = userEvent.setup();
    renderApp('/nhap-ma');

    await user.type(await screen.findByLabelText('Mã bài học hoặc mã bài kiểm tra'), 'BH7F3K20');
    await user.click(screen.getByRole('button', { name: 'Mở' }));

    expect(await screen.findByText(/Mã gồm 8 ký tự, bắt đầu bằng BH \(bài học\)/)).toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith('/student/lessons/'))).toBe(false);

    await user.clear(screen.getByLabelText('Mã bài học hoặc mã bài kiểm tra'));
    await user.click(screen.getByRole('button', { name: 'Mở' }));
    expect(await screen.findByText('Vui lòng nhập mã.')).toBeInTheDocument();
  });

  it('mã gõ thường có khoảng trắng và gạch vẫn đúng; mở được thì sang trang bài học theo cấp của lớp em', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student), (call) =>
      call.path === '/student/lessons/BH7F3K2Q' ? envelope(200, { data: studentLessonOf(2) }) : undefined,
    );
    const user = userEvent.setup();
    const { router } = renderApp('/nhap-ma');

    await user.type(await screen.findByLabelText('Mã bài học hoặc mã bài kiểm tra'), 'bh 7f3-k2q');
    expect(screen.getByLabelText('Mã bài học hoặc mã bài kiểm tra')).toHaveValue('BH 7F3-K2Q');
    await user.click(screen.getByRole('button', { name: 'Mở' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH7F3K2Q'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Ngọ Môn và Kinh thành Huế' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-2');
    expect(calls.filter((c) => c.path === '/student/lessons/BH7F3K2Q').length).toBeGreaterThan(0);
  });

  it('mã bài kiểm tra: vào thẳng bài kiểm tra, không qua trang bài học', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(studentServer(student), (call) =>
      call.path === '/student/lessons/KT4M9P2R' ? envelope(200, { data: { ...studentLessonOf(2), accessCode: 'BH7F3K2Q', focusQuizId: 31 } }) : undefined,
    );
    const user = userEvent.setup();
    const { router } = renderApp('/nhap-ma');

    await user.type(await screen.findByLabelText('Mã bài học hoặc mã bài kiểm tra'), 'kt4m9p2r');
    await user.click(screen.getByRole('button', { name: 'Mở' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH7F3K2Q/kiem-tra/31'));
  });

  it('mã chưa đúng, bài chưa xuất bản hoặc của lớp khác: cùng một câu 404', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(studentServer(student), (call) =>
      call.path.startsWith('/student/lessons/') ? envelope(404, { errorCode: ERROR_CODES.blocked, message: WRONG }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/nhap-ma');

    await user.type(await screen.findByLabelText('Mã bài học hoặc mã bài kiểm tra'), 'BH7F3K2Q');
    await user.click(screen.getByRole('button', { name: 'Mở' }));
    expect(await screen.findByText(WRONG)).toBeInTheDocument();
    expect(screen.getByLabelText('Mã bài học hoặc mã bài kiểm tra')).toHaveAttribute('aria-invalid', 'true');
  });

  it('nhập sai quá nhiều lần: hiện câu chặn của máy chủ và khóa nút mở bài', async () => {
    const student = studentOf(7);
    signInAs(student);
    const blocked = 'Em đã nhập sai mã quá nhiều lần. Em hãy thử lại sau 15 phút.';
    mockApi(studentServer(student), (call) =>
      call.path.startsWith('/student/lessons/') ? envelope(429, { errorCode: ERROR_CODES.blocked, message: blocked }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/nhap-ma');

    await user.type(await screen.findByLabelText('Mã bài học hoặc mã bài kiểm tra'), 'BH7F3K2Z');
    await user.click(screen.getByRole('button', { name: 'Mở' }));
    expect(await screen.findByText(blocked)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở' })).toBeDisabled();
  });

  it('các mã em đã mở gần đây trên máy này dẫn tới bài học; em khác dùng chung máy không thấy', async () => {
    const student = studentOf(7);
    signInAs(student);
    rememberLesson(student.id, { code: 'BH7F3K2Q', title: 'Ngọ Môn và Kinh thành Huế' });
    rememberLesson(999, { code: 'BH2K7P5M', title: 'Bài của em khác' });
    mockApi(studentServer(student));
    renderApp('/nhap-ma');

    const link = await screen.findByRole('link', { name: /Ngọ Môn và Kinh thành Huế/ });
    expect(link).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q');
    expect(screen.queryByText('Bài của em khác')).not.toBeInTheDocument();
  });

  it('chưa đăng nhập: chuyển tới đăng nhập, sau đăng nhập quay lại đúng đường dẫn bài học', async () => {
    mockApi();
    const { router } = renderApp('/bai-hoc/BH7F3K2Q');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(router.state.location.state).toMatchObject({ from: '/bai-hoc/BH7F3K2Q' });
  });
});
