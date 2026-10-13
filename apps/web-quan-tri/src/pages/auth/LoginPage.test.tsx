import { MESSAGES } from '@dsvhvn/dung-chung';
import { ERROR_CODES, type LoginResult, type StaffProfile, type StaffRole } from '@dsvhvn/dung-chung/api';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { sessionStore } from '../../lib/auth/session';
import { envelope, mockApi, userOf } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';

// Đăng nhập web quản trị: một ô email hoặc tên đăng nhập, sai thông tin và tài khoản bị chặn báo In line, vào trang
// mặc định theo vai trò.

function loginResult(role: StaffRole): LoginResult<StaffProfile> {
  return {
    tokenType: 'Bearer',
    accessToken: `token-${role}`,
    expiresAt: new Date(Date.now() + 8 * 3600_000).toISOString(),
    user: userOf(role),
  };
}

describe('màn hình Đăng nhập', () => {
  it('để trống thì báo bắt buộc nhập dưới cả hai ô, không gọi API', async () => {
    const calls = mockApi();
    const user = userEvent.setup();
    renderApp('/dang-nhap');
    await user.click(await screen.findByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Vui lòng nhập email hoặc tên đăng nhập.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('đăng nhập bằng tên đăng nhập, lưu access token và vào trang mặc định của vai trò', async () => {
    const calls = mockApi((call) =>
      call.path === '/auth/login' ? envelope(200, { data: loginResult('ORG_ADMIN'), message: 'Đăng nhập thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    const { router } = renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Email hoặc tên đăng nhập'), '  qt.thcs.a ');
    await user.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/truong'));
    expect(calls.find((c) => c.path === '/auth/login')?.body).toEqual({ emailOrUsername: 'qt.thcs.a', password: 'MatKhau2026' });
    expect(sessionStore.getSession()?.accessToken).toBe('token-ORG_ADMIN');
    expect(await screen.findByText(MESSAGES.success('Đăng nhập'))).toBeInTheDocument();
  });

  it('quay lại trang bị chặn trước khi đăng nhập', async () => {
    mockApi((call) => (call.path === '/auth/login' ? envelope(200, { data: loginResult('ADMIN') }) : undefined));
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/nhat-ky');

    await user.type(await screen.findByLabelText('Email hoặc tên đăng nhập'), 'admin.nho');
    await user.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/quan-tri/nhat-ky'));
  });

  it('sai thông tin (kể cả tài khoản học sinh): câu chung In line, không nói sai ô nào, xóa ô mật khẩu', async () => {
    mockApi(() => envelope(401, { errorCode: ERROR_CODES.invalidCredentials, message: MESSAGES.invalidCredentials }));
    const user = userEvent.setup();
    renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Email hoặc tên đăng nhập'), 'gv.binh');
    await user.type(screen.getByLabelText('Mật khẩu'), 'SaiMatKhau1');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.invalidCredentials);
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
    expect(screen.getByLabelText('Email hoặc tên đăng nhập')).toHaveValue('gv.binh');
  });

  it('tài khoản bị chặn: câu "không đăng nhập được" kèm lý do của máy chủ', async () => {
    const message = MESSAGES.cannotSignIn('Trường của bạn đã ngừng sử dụng nền tảng.');
    mockApi(() => envelope(403, { errorCode: ERROR_CODES.accountBlocked, message }));
    const user = userEvent.setup();
    renderApp('/dang-nhap');

    await user.type(await screen.findByLabelText('Email hoặc tên đăng nhập'), 'gv.binh@truong.vn');
    await user.type(screen.getByLabelText('Mật khẩu'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('phiên bị máy chủ kết thúc vì tài khoản bị khóa: hiện lại lý do ở màn hình Đăng nhập', async () => {
    mockApi();
    sessionStore.clear(MESSAGES.cannotSignIn('Tài khoản đã bị khóa.'));
    renderApp('/dang-nhap');
    expect(await screen.findByRole('alert')).toHaveTextContent('Tài khoản không đăng nhập được. Tài khoản đã bị khóa.');
  });

  it('điền sẵn tên đăng nhập sau khi đặt mật khẩu', async () => {
    mockApi();
    renderApp('/dang-nhap', { login: 'gv.binh' });
    expect(await screen.findByLabelText('Email hoặc tên đăng nhập')).toHaveValue('gv.binh');
  });

  it('phiên đang mở bị máy chủ từ chối (token hết hạn, mật khẩu đổi ở nơi khác): về Đăng nhập với câu "phiên đã hết"', async () => {
    sessionStore.setSession({ accessToken: 'cu', expiresAt: Date.now() + 3600_000, user: userOf('TEACHER') });
    mockApi(() => envelope(401, { errorCode: ERROR_CODES.forbidden, message: MESSAGES.forbidden }));
    const { router } = renderApp('/tai-khoan');

    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.sessionExpired);
  });

  it('dòng dẫn trường chưa dùng sang trang Dành cho nhà trường của web học tập, mở ở tab mới', async () => {
    mockApi();
    renderApp('/dang-nhap');

    const link = await screen.findByRole('link', { name: /Xem giới thiệu cho nhà trường/ });
    expect(link).toHaveAttribute('href', 'http://hoc.test/nha-truong');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.closest('p')).toHaveTextContent(/^Trường bạn chưa dùng Học di sản\?/);
  });
});
