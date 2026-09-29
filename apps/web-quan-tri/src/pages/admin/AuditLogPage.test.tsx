import type { AuditLog } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Nhật ký thao tác: bảng chỉ đọc, lọc trên URL bằng chữ Việt không dấu, mở dòng xem giá trị cũ / mới.

const LOG: AuditLog = {
  id: 41,
  createdAt: '2026-09-26T03:15:00Z',
  userId: 3,
  username: 'qt.thcs.a',
  fullName: 'Phạm Thị Hiệu Trưởng',
  actorRole: 'ORG_ADMIN',
  actorRoleLabel: 'Quản trị trường',
  action: 'ACCOUNT_LOCKED',
  actionLabel: 'Khóa tài khoản',
  targetType: 'users',
  targetId: 12,
  oldValue: '{"status":"ACTIVE"}',
  newValue: '{"status":"LOCKED"}',
  ipAddress: '127.0.0.1',
};

describe('Nhật ký thao tác', () => {
  it('bảng chỉ đọc: nhãn tiếng Việt, giờ Việt Nam, không có nút sửa / xóa; mở dòng xem giá trị cũ / mới', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path.startsWith('/admin/audit-logs'))
        return envelope(200, { data: { items: [LOG], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/nhat-ky');

    const table = await screen.findByRole('table', { name: 'Nhật ký thao tác' });
    expect(within(table).getByText('10:15 26/09/2026')).toBeInTheDocument();
    expect(within(table).getByText('Khóa tài khoản')).toBeInTheDocument();
    expect(within(table).getByText('Tài khoản #12')).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /sửa|xóa/i })).not.toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: 'Xem' }));
    expect(within(table).getByText('Giá trị cũ')).toBeInTheDocument();
    expect(within(table).getByText('Hoạt động')).toBeInTheDocument();
    expect(within(table).getAllByText('Bị khóa')).toHaveLength(1);
  });

  it('lọc hành động và khoảng ngày: URL chữ Việt không dấu, API nhận enum và mốc giờ Việt Nam', async () => {
    signInAs('ADMIN');
    const calls = mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path.startsWith('/admin/audit-logs'))
        return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/nhat-ky');

    await user.selectOptions(await screen.findByLabelText('Hành động'), 'Đăng nhập web quản trị');
    await user.type(screen.getByLabelText('Từ ngày'), '26/09/2026');
    await user.click(screen.getByRole('button', { name: 'Lọc' }));

    await waitFor(() => expect(router.state.location.search).toBe('?hanh-dong=dang-nhap&tu-ngay=2026-09-26'));
    await waitFor(() => {
      const last = calls.filter((c) => c.path.startsWith('/admin/audit-logs')).at(-1)!;
      const query = new URLSearchParams(last.path.split('?')[1]);
      expect(query.get('action')).toBe('LOGIN');
      expect(query.get('from')).toBe('2026-09-26T00:00:00+07:00');
    });
    expect(
      await screen.findByText('Không tìm thấy kết quả phù hợp. Hãy bớt tiêu chí lọc hoặc thử từ khóa khác.'),
    ).toBeInTheDocument();
  });

  it('ngày gõ theo dạng ngày/tháng/năm: sai dạng hoặc đến ngày trước từ ngày báo không hợp lệ dưới ô, không đổi bộ lọc', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path.startsWith('/admin/audit-logs'))
        return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/nhat-ky');

    await user.type(await screen.findByLabelText('Từ ngày'), '26/09/2026');
    await user.type(screen.getByLabelText('Đến ngày'), '20/09/2026');
    await user.click(screen.getByRole('button', { name: 'Lọc' }));

    expect(await screen.findByText('Đến ngày không hợp lệ: không được trước Từ ngày.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');

    await user.clear(screen.getByLabelText('Từ ngày'));
    await user.type(screen.getByLabelText('Từ ngày'), '31/02/2026');
    await user.click(screen.getByRole('button', { name: 'Lọc' }));
    expect(await screen.findByText('Từ ngày không hợp lệ: nhập theo dạng ngày/tháng/năm, ví dụ 26/09/2026.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });
});
