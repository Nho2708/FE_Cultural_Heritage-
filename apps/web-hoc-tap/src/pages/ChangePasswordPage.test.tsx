import { MESSAGES } from '@dsvhvn/dung-chung';
import { STUDENT_ENDPOINTS } from '@dsvhvn/dung-chung/api';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { sessionStore } from '../lib/auth/session';
import { envelope, mockApi, sessionWireOf, studentOf } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Đổi mật khẩu của học sinh: chế độ bắt buộc (lần đầu) và tự đổi (từ menu tài khoản).

const newToken = (student = studentOf(4)) => sessionWireOf(student, 'token-moi');

describe('Đổi mật khẩu — bắt buộc', () => {
  it('mở trang khác khi đang bị buộc đổi mật khẩu thì về Đổi mật khẩu, giữ trang để mở tiếp', async () => {
    signInAs(studentOf(4, { mustChangePassword: true }));
    mockApi();
    const { router } = renderApp('/tien-do');
    await waitFor(() => expect(router.state.location.pathname).toBe('/doi-mat-khau'));
    expect(router.state.location.search).toBe('?sau=%2Ftien-do');
    expect(await screen.findByRole('heading', { level: 1, name: 'Chào Nguyễn Minh An' })).toBeInTheDocument();
  });

  it('không hỏi mật khẩu hiện tại; danh sách quy tắc đánh dấu khi đạt; hai lần nhập phải giống nhau', async () => {
    signInAs(studentOf(4, { mustChangePassword: true }));
    const calls = mockApi();
    const user = userEvent.setup();
    renderApp('/doi-mat-khau');

    expect(await screen.findByText(MESSAGES.studentMustChangePassword)).toBeInTheDocument();
    expect(screen.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Hủy' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Mật khẩu mới'), 'MatKhau1');
    const rules = screen.getByRole('list', { name: 'Quy tắc mật khẩu' });
    expect(rules).toHaveTextContent('Dài 8-64 ký tự (đã đạt)');
    expect(rules).toHaveTextContent('Có chữ số (đã đạt)');

    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2');
    await user.click(screen.getByRole('button', { name: 'Đặt mật khẩu và bắt đầu học' }));
    expect(await screen.findByText('Hai lần nhập mật khẩu chưa giống nhau.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('đổi xong: gửi mật khẩu mới, nhận token mới, tắt cờ buộc đổi, vào trang đang chờ mở với bộ giao diện cấp 1', async () => {
    signInAs(studentOf(2, { mustChangePassword: true }));
    const calls = mockApi((call) =>
      call.path === STUDENT_ENDPOINTS.password ? envelope(200, { data: newToken(studentOf(2)), message: 'Đổi mật khẩu thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    const { router } = renderApp('/doi-mat-khau?sau=%2Ftien-do');

    await user.type(await screen.findByLabelText('Mật khẩu mới'), 'MatKhauMoi9');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhauMoi9');
    await user.click(screen.getByRole('button', { name: 'Đặt mật khẩu và bắt đầu học' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tien-do'));
    expect(calls.find((c) => c.path === STUDENT_ENDPOINTS.password)).toMatchObject({
      method: 'PUT',
      body: { currentPassword: null, newPassword: 'MatKhauMoi9', confirmNewPassword: 'MatKhauMoi9' },
      authorization: 'Bearer access-hoc-sinh',
    });
    expect(sessionStore.getSession()).toMatchObject({ accessToken: 'token-moi', user: { mustChangePassword: false } });
    expect(document.documentElement).toHaveAttribute('data-bo-giao-dien', 'cap-1');
  });

  it('mật khẩu mới trùng mật khẩu tạm: máy chủ báo dưới ô Mật khẩu mới', async () => {
    signInAs(studentOf(4, { mustChangePassword: true }));
    mockApi(() =>
      envelope(400, { errorCode: 'SAME_PASSWORD', message: MESSAGES.samePassword, errors: { newPassword: MESSAGES.samePassword } }),
    );
    const user = userEvent.setup();
    renderApp('/doi-mat-khau');

    await user.type(await screen.findByLabelText('Mật khẩu mới'), 'Tam2k9Pq');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Tam2k9Pq');
    await user.click(screen.getByRole('button', { name: 'Đặt mật khẩu và bắt đầu học' }));

    expect(await screen.findByText('Mật khẩu mới phải khác mật khẩu cũ.')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Đổi mật khẩu — tự đổi', () => {
  it('có ô mật khẩu hiện tại, nút hủy và thanh điều hướng; gửi cả mật khẩu hiện tại', async () => {
    signInAs(studentOf(11));
    const calls = mockApi((call) => {
      if (call.path === STUDENT_ENDPOINTS.password) return envelope(200, { data: newToken() });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/doi-mat-khau');

    expect(await screen.findByRole('heading', { level: 1, name: 'Đổi mật khẩu' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hủy' })).toHaveAttribute('href', '/hoc');

    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'MatKhau2026');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'MatKhau2027');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'MatKhau2027');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/hoc'));
    expect(calls.find((c) => c.path === STUDENT_ENDPOINTS.password)?.body).toEqual({
      currentPassword: 'MatKhau2026',
      newPassword: 'MatKhau2027',
      confirmNewPassword: 'MatKhau2027',
    });
  });
});
