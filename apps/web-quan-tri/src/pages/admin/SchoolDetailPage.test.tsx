import { MESSAGES } from '@dsvhvn/dung-chung';
import type { OrganizationDetail } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { accountOf, envelope, mockApi, userOf } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Quản lý trường, Chi tiết trường: quản trị hệ thống tạo trường cùng quản trị trường đầu tiên, xem / sửa, khóa quản trị
// trường.

function detail(overrides: Partial<OrganizationDetail> = {}): OrganizationDetail {
  return {
    id: 5,
    name: 'Trường THPT Lê Quý Đôn',
    address: '110 Nguyễn Thị Minh Khai, TP. Hồ Chí Minh',
    phone: null,
    email: 'lienhe@lqd.edu.vn',
    status: 'ACTIVE',
    createdAt: '2026-09-26T02:00:00Z',
    updatedAt: null,
    deactivatedAt: null,
    subscription: {
      id: 1,
      planId: 1,
      planName: 'Miễn phí',
      status: 'ACTIVE',
      startDate: '2026-09-26',
      endDate: '2027-09-25',
      isEffective: true,
    },
    teacherQuota: { used: 0, max: 10, planName: 'Miễn phí', canAddTeacher: true },
    orgAdmins: [accountOf(20, { role: 'ORG_ADMIN', fullName: 'Võ Thị Hạnh', username: 'qt.lqd', email: 'hanh@lqd.edu.vn' })],
    ...overrides,
  };
}

const me = () => envelope(200, { data: userOf('ADMIN') });

async function fillCreateForm(user: ReturnType<typeof userEvent.setup>) {
  const info = await screen.findByRole('group', { name: 'Thông tin trường' });
  const admin = screen.getByRole('group', { name: 'Quản trị trường đầu tiên' });
  await user.type(within(info).getByLabelText('Tên trường'), 'Trường THPT Lê Quý Đôn');
  await user.type(within(info).getByLabelText('Email liên hệ của trường'), 'lienhe@lqd.edu.vn');
  await user.type(within(admin).getByLabelText('Họ và tên'), 'Võ Thị Hạnh');
  await user.type(within(admin).getByLabelText('Tên đăng nhập'), 'qt.lqd');
  await user.type(within(admin).getByLabelText('Email'), 'hanh@lqd.edu.vn');
  return { info, admin };
}

describe('Chi tiết trường — tạo mới', () => {
  it('Quản lý trường → "Tạo trường" mở Chi tiết trường ở trạng thái tạo mới', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return me();
      if (call.path.startsWith('/admin/organizations?'))
        return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/truong');
    expect(await screen.findByText('Chưa có trường nào.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: 'Tạo trường' })[0]!);
    await waitFor(() => expect(router.state.location.pathname).toBe('/quan-tri/truong/moi'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Tạo trường' })).toBeInTheDocument();
  });

  it('gửi thông tin trường + quản trị trường đầu tiên trong một lần, toast "Đã gửi email đặt mật khẩu", chuyển sang trang chi tiết', async () => {
    signInAs('ADMIN');
    const calls = mockApi((call) => {
      if (call.path === '/me') return me();
      if (call.path === '/admin/organizations' && call.method === 'POST')
        return envelope(201, { data: detail(), message: MESSAGES.passwordLinkSent('hanh@lqd.edu.vn') });
      if (call.path === '/admin/organizations/5') return envelope(200, { data: detail() });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/truong/moi');

    await fillCreateForm(user);
    await user.click(screen.getByRole('button', { name: 'Tạo trường' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/quan-tri/truong/5'));
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      name: 'Trường THPT Lê Quý Đôn',
      address: null,
      phone: null,
      email: 'lienhe@lqd.edu.vn',
      orgAdmin: { fullName: 'Võ Thị Hạnh', username: 'qt.lqd', email: 'hanh@lqd.edu.vn', phone: null },
    });
    expect(await screen.findByText(MESSAGES.passwordLinkSent('hanh@lqd.edu.vn'))).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Trường THPT Lê Quý Đôn' })).toBeInTheDocument();
  });

  it('trùng tên đăng nhập của quản trị trường: lỗi `orgAdmin.username` hiện dưới đúng ô của nhóm quản trị trường', async () => {
    signInAs('ADMIN');
    const taken = MESSAGES.taken('Tên đăng nhập', 'qt.lqd');
    mockApi((call) => {
      if (call.path === '/me') return me();
      if (call.path === '/admin/organizations')
        return envelope(409, { errorCode: 'DUPLICATE', message: taken, errors: { 'orgAdmin.username': taken } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/truong/moi');

    const { admin } = await fillCreateForm(user);
    await user.click(screen.getByRole('button', { name: 'Tạo trường' }));

    expect(await within(admin).findByText(taken)).toBeInTheDocument();
    expect(within(admin).getByLabelText('Tên đăng nhập')).toHaveAttribute('aria-invalid', 'true');
  });

  it('bỏ trống: báo bắt buộc nhập cho tên trường và cả ba ô bắt buộc của quản trị trường, không gọi API', async () => {
    signInAs('ADMIN');
    const calls = mockApi((call) => (call.path === '/me' ? me() : undefined));
    const user = userEvent.setup();
    renderApp('/quan-tri/truong/moi');

    await user.click(await screen.findByRole('button', { name: 'Tạo trường' }));
    expect(await screen.findByText('Vui lòng nhập tên trường.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập họ tên.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập tên đăng nhập.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });
});

describe('Chi tiết trường — xem / sửa', () => {
  it('hiện gói hiện tại chỉ đọc và danh sách quản trị trường; khóa quản trị trường', async () => {
    signInAs('ADMIN');
    const calls = mockApi((call) => {
      if (call.path === '/me') return me();
      if (call.path === '/admin/organizations/5') return envelope(200, { data: detail() });
      if (call.path === '/admin/organizations/5/org-admins/20/lock')
        return envelope(200, { data: accountOf(20, { status: 'LOCKED' }), message: 'Khóa tài khoản thành công.' });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/truong/5');

    const plan = await screen.findByRole('region', { name: 'Gói hiện tại' });
    expect(within(plan).getByText('Miễn phí')).toBeInTheDocument();
    expect(within(plan).getByText('Đang hiệu lực')).toBeInTheDocument();
    expect(within(plan).getByText('25/09/2027')).toBeInTheDocument();

    const admins = screen.getByRole('table', { name: 'Quản trị trường của Trường THPT Lê Quý Đôn' });
    await user.click(within(admins).getByRole('button', { name: 'Khóa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Khóa tài khoản' });
    await user.click(within(dialog).getByRole('button', { name: 'Khóa' }));
    expect(await screen.findByText('Khóa tài khoản thành công.')).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/admin/organizations/5/org-admins/20/lock')).toBe(true);
  });

  it('trường đã ngừng: không sửa được, không có "Thêm quản trị trường", "Ngừng trường"', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return me();
      if (call.path === '/admin/organizations/5')
        return envelope(200, { data: detail({ status: 'DEACTIVATED', deactivatedAt: '2026-09-26T05:00:00Z' }) });
      return undefined;
    });
    renderApp('/quan-tri/truong/5');

    expect(await screen.findByText('Trường đã ngừng nên không sửa được thông tin.')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên trường')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Thêm quản trị trường' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ngừng trường' })).not.toBeInTheDocument();
  });

  it('trường không tồn tại: câu 404 của máy chủ, không có nút thử lại', async () => {
    signInAs('ADMIN');
    const message = MESSAGES.blocked('xem trường', 'Không tìm thấy trường.');
    mockApi((call) => (call.path === '/me' ? me() : envelope(404, { errorCode: 'BLOCKED', message })));
    renderApp('/quan-tri/truong/999');

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });
});
