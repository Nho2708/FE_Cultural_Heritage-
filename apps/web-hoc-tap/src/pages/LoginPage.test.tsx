import { MESSAGES } from '@dsvhvn/dung-chung';
import { ERROR_CODES, STUDENT_ENDPOINTS } from '@dsvhvn/dung-chung/api';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { sessionStore } from '../lib/auth/session';
import { envelope, mockApi, sessionWireOf, studentOf } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Học sinh đăng nhập bằng mã học sinh + mật khẩu; lần đầu (mật khẩu tạm) chuyển sang Đổi mật khẩu.

describe('Học sinh đăng nhập', () => {
  it('có dòng nhắc quên mật khẩu, dòng chỉ thầy cô sang trang quản trị; không có liên kết quên mật khẩu qua email', async () => {
    mockApi();
    renderApp('/dang-nhap');
    expect(await screen.findByRole('heading', { level: 1, name: 'Học sinh đăng nhập' })).toBeInTheDocument();
    expect(screen.getByText('Quên mật khẩu?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở trang quản trị' })).toHaveAttribute('href', 'http://quantri.test');
    expect(screen.queryByRole('link', { name: /quên mật khẩu/i })).not.toBeInTheDocument();
  });

  it('để trống thì báo bắt buộc nhập dưới cả hai ô, không gọi API', async () => {
    const calls = mockApi();
    const user = userEvent.setup();
    renderApp('/dang-nhap');
    await user.click(await screen.findByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Vui lòng nhập mã học sinh.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('mã học sinh tự viết hoa, bỏ khoảng trắng và dấu gạch; đăng nhập xong vào trang học với bộ giao diện theo cấp', async () => {
    const calls = mockApi((call) => {
      if (call.path === STUDENT_ENDPOINTS.login) return envelope(200, { data: sessionWireOf(studentOf(8)) });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Mã học sinh'), 'hs 8k2-qx7');
    expect(screen.getByLabelText('Mã học sinh')).toHaveValue('HS8K2QX7');
    await user.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/hoc'));
    expect(calls.find((c) => c.path === STUDENT_ENDPOINTS.login)?.body).toEqual({ studentCode: 'HS8K2QX7', password: 'MatKhau2026' });
    expect(sessionStore.getSession()?.accessToken).toBe('token-hoc-sinh');
    expect(await screen.findByRole('heading', { level: 1, name: 'Trang học của em' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-bo-giao-dien', 'cap-2');
  });

  it('lần đầu đăng nhập bằng mật khẩu tạm: sang Đổi mật khẩu, không có thanh điều hướng', async () => {
    mockApi((call) =>
      call.path === STUDENT_ENDPOINTS.login
        ? envelope(200, { data: sessionWireOf(studentOf(7, { mustChangePassword: true })) })
        : undefined,
    );
    const user = userEvent.setup();
    const { router } = renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Mã học sinh'), 'HS8K2QX7');
    await user.type(screen.getByLabelText('Mật khẩu'), 'Tam2k9Pq');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/doi-mat-khau'));
    expect(await screen.findByText(MESSAGES.studentMustChangePassword)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Điều hướng chính' })).not.toBeInTheDocument();
  });

  it('sai mã hoặc mật khẩu: câu chung của máy chủ In line, xóa ô mật khẩu', async () => {
    mockApi(() => envelope(401, { errorCode: ERROR_CODES.studentInvalidCredentials, message: MESSAGES.studentInvalidCredentials }));
    const user = userEvent.setup();
    renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Mã học sinh'), 'HS8K2QX7');
    await user.type(screen.getByLabelText('Mật khẩu'), 'SaiMatKhau1');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Mã học sinh hoặc mật khẩu chưa đúng. Em hãy kiểm tra lại phiếu đăng nhập.');
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
  });

  it('tạm khóa hoặc bị vô hiệu: hiện nguyên câu của máy chủ, giữ mã học sinh đã gõ', async () => {
    const blocked = MESSAGES.studentCannotSignIn('Em đã nhập sai nhiều lần. Em hãy thử lại sau 15 phút hoặc nhờ thầy cô đặt lại mật khẩu.');
    mockApi((call) =>
      call.path === STUDENT_ENDPOINTS.login ? envelope(403, { errorCode: ERROR_CODES.studentAccountBlocked, message: blocked }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Mã học sinh'), 'HS8K2QX7');
    await user.type(screen.getByLabelText('Mật khẩu'), 'SaiMatKhau1');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText(blocked)).toBeInTheDocument();
    expect(screen.getByLabelText('Mã học sinh')).toHaveValue('HS8K2QX7');
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
  });

  it('máy chủ chưa có cửa đăng nhập học sinh (404 hoặc "không có quyền"): báo lỗi hệ thống, không báo sai quyền', async () => {
    mockApi(() => envelope(401, { errorCode: ERROR_CODES.forbidden, message: MESSAGES.forbidden }));
    const user = userEvent.setup();
    renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Mã học sinh'), 'HS8K2QX7');
    await user.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.systemError);
  });

  it('mở đường dẫn bài học khi chưa đăng nhập: báo cần đăng nhập, đăng nhập xong mở lại đúng bài', async () => {
    mockApi((call) => (call.path === STUDENT_ENDPOINTS.login ? envelope(200, { data: sessionWireOf(studentOf(10)) }) : undefined));
    const user = userEvent.setup();
    const { router } = renderApp('/bai-hoc/BH7F3K2Q');

    expect(await screen.findByText(MESSAGES.studentSignInToOpenLesson)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dang-nhap');
    await user.type(screen.getByLabelText('Mã học sinh'), 'HS8K2QX7');
    await user.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH7F3K2Q'));
    expect(document.documentElement).toHaveAttribute('data-bo-giao-dien', 'cap-3');
  });

  it('nhấn quên mật khẩu: mã học sinh không tồn tại báo đỏ dưới ô nhập', async () => {
    mockApi(() =>
      envelope(404, {
        errorCode: ERROR_CODES.notFound,
        message: MESSAGES.studentAccountNotFound,
        errors: { studentCode: MESSAGES.studentAccountNotFound },
      }),
    );
    const user = userEvent.setup();
    renderApp('/dang-nhap');

    await user.click(await screen.findByRole('button', { name: 'Quên mật khẩu?' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Tìm tài khoản học sinh' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Mã học sinh'), 'HSUNKNOWN');
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(await screen.findByText(MESSAGES.studentAccountNotFound)).toBeInTheDocument();
  });

  it('nhấn quên mật khẩu: mã học sinh tồn tại báo thành công đã gửi giáo viên', async () => {
    const calls = mockApi(() =>
      envelope(200, {
        data: { studentName: 'Vũ Thảo My', teacherName: 'Trần Thị Minh Anh' },
        message: MESSAGES.studentPasswordResetRequested,
      }),
    );
    const user = userEvent.setup();
    renderApp('/dang-nhap');

    await user.click(await screen.findByRole('button', { name: 'Quên mật khẩu?' }));
    await user.type(screen.getByLabelText('Mã học sinh'), 'HSHUWAND');
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(await screen.findByText(MESSAGES.studentPasswordResetRequested)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi lại yêu cầu' })).toBeInTheDocument();
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: STUDENT_ENDPOINTS.forgotPassword,
      body: { studentCode: 'HSHUWAND' },
    });

    await user.click(screen.getByRole('button', { name: 'Đã nhớ mật khẩu? Quay lại đăng nhập' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Học sinh đăng nhập' })).toBeInTheDocument();
  });
});
