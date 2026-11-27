import { MESSAGES } from '@dsvhvn/dung-chung';
import { ERROR_CODES } from '@dsvhvn/dung-chung/api';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';

// Quên và đặt mật khẩu: trạng thái 1 luôn cùng một câu; trạng thái 2 kiểm liên kết trước, dùng chung cho tài khoản
// mới và quên mật khẩu; liên kết hỏng → báo lỗi + "Gửi lại liên kết"; xong → Đăng nhập, không tự đăng nhập.

const EXPIRES = '2026-09-28T03:00:00Z';

describe('Quên mật khẩu (trạng thái 1)', () => {
  it('email sai định dạng: báo không hợp lệ dưới ô, không gọi API', async () => {
    const calls = mockApi();
    const user = userEvent.setup();
    renderApp('/quen-mat-khau');
    await user.type(await screen.findByLabelText('Email'), 'gv.binh');
    await user.click(screen.getByRole('button', { name: 'Gửi liên kết' }));

    expect(await screen.findByText('Email không hợp lệ: sai định dạng hoặc dài quá 255 ký tự.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('tài khoản không tồn tại: báo lỗi đỏ dưới ô nhập email', async () => {
    mockApi(() =>
      envelope(404, {
        errorCode: ERROR_CODES.notFound,
        message: MESSAGES.accountNotFound,
        errors: { email: MESSAGES.accountNotFound },
      }),
    );
    const user = userEvent.setup();
    renderApp('/quen-mat-khau');
    await user.type(await screen.findByLabelText('Email'), 'khong.co@truong.vn');
    await user.click(screen.getByRole('button', { name: 'Gửi liên kết' }));

    expect(await screen.findByText(MESSAGES.accountNotFound)).toBeInTheDocument();
  });

  it('có tài khoản: hiện thông báo đợi link trong hộp thư, nút đổi thành "Gửi lại liên kết"', async () => {
    const calls = mockApi(() => envelope(200, { message: MESSAGES.forgotPasswordAccepted }));
    const user = userEvent.setup();
    renderApp('/quen-mat-khau');
    await user.type(await screen.findByLabelText('Email'), 'giaovien@truong.vn');
    await user.click(screen.getByRole('button', { name: 'Gửi liên kết' }));

    expect(await screen.findByRole('status')).toHaveTextContent(MESSAGES.forgotPasswordAccepted);
    expect(screen.getByRole('button', { name: 'Gửi lại liên kết' })).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/auth/forgot-password', body: { email: 'giaovien@truong.vn' } });
  });
});

describe('Đặt mật khẩu (trạng thái 2)', () => {
  it('mở /dat-mat-khau không có mã thì về trạng thái 1', async () => {
    mockApi();
    const { router } = renderApp('/dat-mat-khau');
    await screen.findByRole('heading', { level: 1, name: 'Quên mật khẩu' });
    expect(router.state.location.pathname).toBe('/quen-mat-khau');
  });

  it('liên kết hết hạn hoặc đã dùng: báo lỗi và nút "Gửi lại liên kết" về trạng thái 1', async () => {
    mockApi((call) =>
      call.path === '/auth/password-token/check'
        ? envelope(422, { errorCode: ERROR_CODES.passwordLinkInvalid, message: MESSAGES.passwordLinkInvalid })
        : undefined,
    );
    renderApp('/dat-mat-khau?token=cu');
    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.passwordLinkInvalid);
    expect(screen.getByRole('link', { name: 'Gửi lại liên kết' })).toHaveAttribute('href', '/quen-mat-khau');
    expect(screen.queryByLabelText('Mật khẩu mới')).not.toBeInTheDocument();
  });

  it('kiểm mật khẩu mới theo quy tắc mật khẩu và ô nhập lại trước khi gửi', async () => {
    const calls = mockApi((call) =>
      call.path === '/auth/password-token/check' ? envelope(200, { data: { username: 'gv.binh', expiresAt: EXPIRES } }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/dat-mat-khau?token=abc');

    await user.type(await screen.findByLabelText('Mật khẩu mới'), 'matkhau1');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'matkhau2');
    await user.click(screen.getByRole('button', { name: 'Đặt mật khẩu' }));

    expect(await screen.findByText(MESSAGES.passwordPolicy)).toBeInTheDocument();
    expect(screen.getByText('Hai lần nhập mật khẩu chưa giống nhau.')).toBeInTheDocument();
    expect(calls.map((c) => c.path)).toEqual(['/auth/password-token/check']);
  });

  it('đặt mật khẩu lần đầu thành công: toast, về Đăng nhập với tên đăng nhập điền sẵn', async () => {
    const calls = mockApi((call) => {
      if (call.path === '/auth/password-token/check')
        return envelope(200, { data: { username: 'gv.binh', expiresAt: EXPIRES } });
      if (call.path === '/auth/set-password') return envelope(200, { message: 'Đặt mật khẩu thành công.' });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/dat-mat-khau?token=abc');

    expect(await screen.findByLabelText('Tên đăng nhập')).toHaveValue('gv.binh');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'MatKhau2026');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đặt mật khẩu' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(calls[0]?.body).toEqual({ token: 'abc' });
    expect(calls[1]).toMatchObject({ path: '/auth/set-password', body: { token: 'abc', newPassword: 'MatKhau2026' } });
    expect(await screen.findByLabelText('Email hoặc tên đăng nhập')).toHaveValue('gv.binh');
    expect(screen.getByText('Đặt mật khẩu thành công.')).toBeInTheDocument();
  });

  it('liên kết bị thay giữa chừng (máy chủ báo liên kết hỏng khi gửi): chuyển sang báo lỗi liên kết', async () => {
    mockApi((call) => {
      if (call.path === '/auth/password-token/check')
        return envelope(200, { data: { username: 'gv.binh', expiresAt: EXPIRES } });
      if (call.path === '/auth/set-password')
        return envelope(422, { errorCode: ERROR_CODES.passwordLinkInvalid, message: MESSAGES.passwordLinkInvalid });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/dat-mat-khau?token=abc');

    await user.type(await screen.findByLabelText('Mật khẩu mới'), 'MatKhau2026');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đặt mật khẩu' }));

    expect(await screen.findByRole('link', { name: 'Gửi lại liên kết' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(MESSAGES.passwordLinkInvalid);
  });
});
