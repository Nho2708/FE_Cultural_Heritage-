import { MESSAGES } from '@dsvhvn/dung-chung';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { sessionStore } from '../../lib/auth/session';
import { envelope, mockApi, userOf } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Hồ sơ cá nhân: dùng chung 3 vai trò; tab Thông tin sửa họ tên, số điện thoại, ảnh; tab Đổi mật khẩu nhận access
// token mới.

describe('Hồ sơ cá nhân', () => {
  it('hiện email, tên đăng nhập, vai trò, trường chỉ đọc; lưu họ tên và số điện thoại', async () => {
    signInAs('TEACHER');
    const updated = { ...userOf('TEACHER'), fullName: 'Trần Văn Bình An', phone: '0901234567' };
    const calls = mockApi((call) => {
      if (call.path === '/me' && call.method === 'GET') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === '/me' && call.method === 'PUT') return envelope(200, { data: updated, message: 'Lưu hồ sơ thành công.' });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/tai-khoan');

    const facts = await screen.findByText('Tên đăng nhập');
    const list = facts.closest('dl')!;
    expect(within(list).getByText('gv.binh')).toBeInTheDocument();
    expect(within(list).getByText('Giáo viên')).toBeInTheDocument();
    expect(within(list).getByText('Trường THCS Nguyễn Du')).toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('Họ và tên'));
    await user.type(screen.getByLabelText('Họ và tên'), 'Trần Văn Bình An');
    await user.type(screen.getByLabelText('Số điện thoại'), '0901234567');
    await user.click(save);

    expect(await screen.findByText('Lưu hồ sơ thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
      fullName: 'Trần Văn Bình An',
      phone: '0901234567',
      avatarUrl: null,
    });
    expect(sessionStore.getSession()?.user.fullName).toBe('Trần Văn Bình An');
  });

  it('đổi mật khẩu: kiểm ô nhập lại, gửi mật khẩu hiện tại + mới, thay access token của phiên', async () => {
    signInAs('ADMIN');
    const calls = mockApi((call) => {
      if (call.path === '/me' && call.method === 'GET') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/me/password')
        return envelope(200, {
          data: { tokenType: 'Bearer', accessToken: 'token-moi', expiresAt: new Date(Date.now() + 3600_000).toISOString() },
          message: 'Đổi mật khẩu thành công.',
        });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/tai-khoan?tab=doi-mat-khau');

    await user.type(await screen.findByLabelText('Mật khẩu hiện tại'), 'MatKhau2025');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'MatKhau2026');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2027');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(await screen.findByText('Hai lần nhập mật khẩu chưa giống nhau.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Nhập lại mật khẩu mới'));
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByText('Đổi mật khẩu thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/me/password')?.body).toEqual({
      currentPassword: 'MatKhau2025',
      newPassword: 'MatKhau2026',
    });
    expect(sessionStore.getSession()?.accessToken).toBe('token-moi');
  });

  it('sai mật khẩu hiện tại: câu của máy chủ dưới đúng ô', async () => {
    signInAs('ORG_ADMIN');
    const message = 'Mật khẩu hiện tại không hợp lệ: không khớp với mật khẩu đang dùng.';
    mockApi((call) => {
      if (call.path === '/me' && call.method === 'GET') return envelope(200, { data: userOf('ORG_ADMIN') });
      if (call.path === '/me/password') return envelope(400, { errorCode: 'INVALID', message, errors: { currentPassword: message } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/tai-khoan?tab=doi-mat-khau');

    await user.type(await screen.findByLabelText('Mật khẩu hiện tại'), 'Sai12345');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'MatKhau2026');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveAttribute('aria-invalid', 'true');
  });

  it('mật khẩu mới trùng mật khẩu hiện tại: máy chủ báo dưới ô Mật khẩu mới', async () => {
    signInAs('TEACHER');
    mockApi((call) => {
      if (call.path === '/me' && call.method === 'GET') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === '/me/password')
        return envelope(400, { errorCode: 'SAME_PASSWORD', message: MESSAGES.samePassword, errors: { newPassword: MESSAGES.samePassword } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/tai-khoan?tab=doi-mat-khau');

    await user.type(await screen.findByLabelText('Mật khẩu hiện tại'), 'MatKhau2026');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'MatKhau2026');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2026');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByText('Mật khẩu mới phải khác mật khẩu cũ.')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveAttribute('aria-invalid', 'true');
  });
});
