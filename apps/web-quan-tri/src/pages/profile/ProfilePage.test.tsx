import { MESSAGES } from '@dsvhvn/dung-chung';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '../../lib/auth/session';
import { envelope, mockApi, sessionOf, userOf } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Hồ sơ cá nhân: dùng chung 3 vai trò; tab Thông tin sửa họ tên, số điện thoại, ảnh đại diện (tải ảnh lên, gỡ ảnh); tab
// Đổi mật khẩu nhận access token mới.

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
    });
    expect(sessionStore.getSession()?.user.fullName).toBe('Trần Văn Bình An');
  });

  describe('ảnh đại diện', () => {
    const jpg = (name = 'toi.jpg') => new File([new Uint8Array(2048)], name, { type: 'image/jpeg' });
    const withAvatar = { ...userOf('TEACHER'), avatarUrl: '/files/images/0123456789abcdef0123456789abcdef.webp' };

    it('chưa có ảnh thì hiện chữ cái đầu và không có nút Gỡ ảnh; có ảnh thì hiện ảnh và nút Gỡ ảnh', async () => {
      signInAs('TEACHER');
      mockApi((call) => (call.path === '/me' && call.method === 'GET' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
      renderApp('/tai-khoan');

      expect(await screen.findByRole('button', { name: 'Chọn ảnh' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Gỡ ảnh' })).not.toBeInTheDocument();
    });

    it('tệp sai định dạng hoặc quá 5 MB bị từ chối ngay khi chọn, không gọi API', async () => {
      signInAs('TEACHER');
      const calls = mockApi((call) => (call.path === '/me' && call.method === 'GET' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
      const user = userEvent.setup({ applyAccept: false });
      renderApp('/tai-khoan');

      const input = await screen.findByLabelText('Chọn tệp ảnh đại diện');
      await user.upload(input, new File(['GIF89a'], 'anh-dong.gif', { type: 'image/gif' }));
      expect(await screen.findByText('Tệp ảnh không hợp lệ: chỉ nhận định dạng JPG, PNG hoặc WEBP.')).toBeInTheDocument();
      await user.upload(input, new File([new Uint8Array(6 * 1024 * 1024)], 'to.png', { type: 'image/png' }));
      expect(await screen.findByText('Tệp ảnh không hợp lệ: tối đa 5 MB, tệp này 6,0 MB.')).toBeInTheDocument();

      expect(screen.queryByRole('button', { name: 'Tải ảnh lên' })).not.toBeInTheDocument();
      expect(calls.some((c) => c.path === '/me/avatar')).toBe(false);
    });

    it('chọn ảnh hợp lệ rồi tải lên: gửi multipart chỉ có tệp, cập nhật phiên và báo thành công', async () => {
      signInAs('TEACHER');
      const calls = mockApi((call) => {
        if (call.path === '/me' && call.method === 'GET') return envelope(200, { data: userOf('TEACHER') });
        if (call.path === '/me/avatar' && call.method === 'POST')
          return envelope(200, { data: withAvatar, message: 'Cập nhật ảnh đại diện thành công.' });
        return undefined;
      });
      const user = userEvent.setup();
      renderApp('/tai-khoan');

      await user.upload(await screen.findByLabelText('Chọn tệp ảnh đại diện'), jpg());
      expect(await screen.findByText('toi.jpg')).toBeInTheDocument();
      expect(screen.getByText('(2 KB)')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tải ảnh lên' }));

      expect(await screen.findByText('Cập nhật ảnh đại diện thành công.')).toBeInTheDocument();
      expect(calls.find((c) => c.path === '/me/avatar')?.body).toEqual({ file: { fileName: 'toi.jpg', size: 2048 } });
      expect(sessionStore.getSession()?.user.avatarUrl).toBe(withAvatar.avatarUrl);
      expect(await screen.findByRole('button', { name: 'Gỡ ảnh' })).toBeInTheDocument();
    });

    // jsdom không có URL.createObjectURL và không giải mã ảnh: giả hai thứ đó để kiểm bước thử giải mã trước khi xem trước.
    // Trả lại jsdom nguyên trạng sau mỗi test (Image do vi.unstubAllGlobals của setup lo).
    afterEach(() => {
      delete (URL as { createObjectURL?: unknown }).createObjectURL;
      delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    });

    function stubPreview(decodes: boolean) {
      const revoke = vi.fn<(url: string) => void>();
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:xem-truoc' });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
      class FakeImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        naturalWidth = decodes ? 64 : 0;
        set src(_url: string) {
          queueMicrotask(() => (decodes ? this.onload?.() : this.onerror?.()));
        }
      }
      vi.stubGlobal('Image', FakeImage);
      return revoke;
    }

    it('tệp đổi đuôi thành .jpg nhưng không phải ảnh bị từ chối sau khi thử giải mã: không xem trước, không gọi API', async () => {
      signInAs('TEACHER');
      const calls = mockApi((call) => (call.path === '/me' && call.method === 'GET' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
      const revoke = stubPreview(false);
      const user = userEvent.setup();
      renderApp('/tai-khoan');

      await user.upload(await screen.findByLabelText('Chọn tệp ảnh đại diện'), new File(['đây là chữ, không phải ảnh'], 'gia-anh.jpg', { type: 'image/jpeg' }));

      expect(await screen.findByText('Tệp ảnh không hợp lệ: không đọc được, tệp không phải ảnh hoặc đã bị hỏng.')).toBeInTheDocument();
      expect(screen.queryByAltText('Ảnh đại diện mới (xem trước)')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Tải ảnh lên' })).not.toBeInTheDocument();
      expect(revoke).toHaveBeenCalledWith('blob:xem-truoc');
      expect(calls.some((c) => c.path === '/me/avatar')).toBe(false);
    });

    it('ảnh giải mã được thì hiện xem trước và nút Tải ảnh lên', async () => {
      signInAs('TEACHER');
      mockApi((call) => (call.path === '/me' && call.method === 'GET' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
      stubPreview(true);
      const user = userEvent.setup();
      renderApp('/tai-khoan');

      await user.upload(await screen.findByLabelText('Chọn tệp ảnh đại diện'), jpg());

      expect(await screen.findByAltText('Ảnh đại diện mới (xem trước)')).toHaveAttribute('src', 'blob:xem-truoc');
      expect(screen.getByRole('button', { name: 'Tải ảnh lên' })).toBeInTheDocument();
    });

    it('chọn rồi bấm Hủy thì không gọi API', async () => {
      signInAs('TEACHER');
      const calls = mockApi((call) => (call.path === '/me' && call.method === 'GET' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
      const user = userEvent.setup();
      renderApp('/tai-khoan');

      await user.upload(await screen.findByLabelText('Chọn tệp ảnh đại diện'), jpg());
      await user.click(await screen.findByRole('button', { name: 'Hủy' }));

      expect(screen.getByRole('button', { name: 'Chọn ảnh' })).toBeInTheDocument();
      expect(calls.some((c) => c.path === '/me/avatar')).toBe(false);
    });

    it('máy chủ từ chối tệp: hiện câu của máy chủ, ảnh hiện tại giữ nguyên', async () => {
      signInAs('TEACHER');
      const message = 'Tệp ảnh không hợp lệ: không đọc được, tệp không phải ảnh hoặc đã bị hỏng.';
      mockApi((call) => {
        if (call.path === '/me' && call.method === 'GET') return envelope(200, { data: userOf('TEACHER') });
        if (call.path === '/me/avatar') return envelope(400, { errorCode: 'INVALID', message, errors: { file: message } });
        return undefined;
      });
      const user = userEvent.setup();
      renderApp('/tai-khoan');

      await user.upload(await screen.findByLabelText('Chọn tệp ảnh đại diện'), jpg());
      await user.click(await screen.findByRole('button', { name: 'Tải ảnh lên' }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(sessionStore.getSession()?.user.avatarUrl).toBeNull();
    });

    it('Gỡ ảnh: gọi DELETE, xóa ảnh khỏi phiên và báo thành công', async () => {
      sessionStore.setSession(sessionOf('TEACHER', { user: withAvatar }));
      const calls = mockApi((call) => {
        if (call.path === '/me' && call.method === 'GET') return envelope(200, { data: withAvatar });
        if (call.path === '/me/avatar' && call.method === 'DELETE')
          return envelope(200, { data: userOf('TEACHER'), message: 'Gỡ ảnh đại diện thành công.' });
        return undefined;
      });
      const user = userEvent.setup();
      renderApp('/tai-khoan');

      await user.click(await screen.findByRole('button', { name: 'Gỡ ảnh' }));

      expect(await screen.findByText('Gỡ ảnh đại diện thành công.')).toBeInTheDocument();
      expect(calls.some((c) => c.path === '/me/avatar' && c.method === 'DELETE')).toBe(true);
      expect(sessionStore.getSession()?.user.avatarUrl).toBeNull();
      expect(screen.queryByRole('button', { name: 'Gỡ ảnh' })).not.toBeInTheDocument();
    });
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
