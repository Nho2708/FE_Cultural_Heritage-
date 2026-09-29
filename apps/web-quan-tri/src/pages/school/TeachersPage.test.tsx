import { MESSAGES } from '@dsvhvn/dung-chung';
import type { Account, MyOrganization, TeacherQuota } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { accountOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Giáo viên của trường và Biểu mẫu tài khoản: bộ đếm hạn mức, thêm giáo viên, khóa / mở, xóa mềm.

const FREE = { used: 2, max: 10, planName: 'Miễn phí', canAddTeacher: true } satisfies TeacherQuota;

function org(quota: TeacherQuota, effective = true): MyOrganization {
  return {
    id: 10,
    name: 'Trường THCS Nguyễn Du',
    address: null,
    phone: null,
    email: null,
    subscription: {
      id: 1,
      planId: 1,
      planName: 'Miễn phí',
      status: effective ? 'ACTIVE' : 'EXPIRED',
      startDate: '2025-09-26',
      endDate: '2026-09-25',
      isEffective: effective,
    },
    teacherQuota: quota,
  };
}

function api(teachers: Account[], quota: TeacherQuota, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ORG_ADMIN') });
      if (call.path === '/org') return envelope(200, { data: org(quota, quota.max !== null) });
      if (call.path.startsWith('/org/teachers') && call.method === 'GET')
        return envelope(200, {
          data: { items: teachers, page: 1, pageSize: 20, totalItems: teachers.length, totalPages: 1, quota },
        });
      return undefined;
    },
  );
}

describe('Giáo viên của trường', () => {
  it('bảng giáo viên kèm bộ đếm "x / tối đa giáo viên" và trạng thái tiếng Việt', async () => {
    signInAs('ORG_ADMIN');
    api([accountOf(1, { fullName: 'Nguyễn Văn An' }), accountOf(2, { status: 'LOCKED' })], FREE);
    renderApp('/truong/giao-vien');

    const table = await screen.findByRole('table', { name: 'Giáo viên của trường' });
    expect(within(table).getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(within(table).getByText('Hoạt động')).toBeInTheDocument();
    expect(within(table).getByText('Bị khóa')).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Mở khóa' })).toBeInTheDocument();
    expect(screen.getByText('2 / 10 giáo viên')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm giáo viên' })).toBeEnabled();
  });

  it('đủ hạn mức: khóa "Thêm giáo viên" và hiện câu báo hạn mức giáo viên', async () => {
    signInAs('ORG_ADMIN');
    api([accountOf(1), accountOf(2)], { used: 2, max: 2, planName: 'Miễn phí', canAddTeacher: false });
    renderApp('/truong/giao-vien');

    expect(await screen.findByText(MESSAGES.teacherLimitReached(2, 2, 'Miễn phí'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm giáo viên' })).toBeDisabled();
  });

  it('trường không có gói hiệu lực: thanh báo gói hết hiệu lực và khóa "Thêm giáo viên"', async () => {
    signInAs('ORG_ADMIN');
    api([], { used: 0, max: null, planName: null, canAddTeacher: false });
    renderApp('/truong/giao-vien');

    expect(await screen.findByText(MESSAGES.noEffectivePlan('25/09/2026'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm giáo viên' })).toBeDisabled();
  });

  it('thêm giáo viên: kiểm biểu mẫu, gửi đúng thân yêu cầu, toast "Đã gửi email đặt mật khẩu", tải lại bảng', async () => {
    signInAs('ORG_ADMIN');
    const created = accountOf(3, { fullName: 'Lê Thị Cúc', username: 'gv.cuc', email: 'cuc@thcs.vn' });
    const calls = api([], FREE, (call) =>
      call.path === '/org/teachers' && call.method === 'POST'
        ? envelope(201, { data: created, message: MESSAGES.passwordLinkSent('cuc@thcs.vn') })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/giao-vien');

    await user.click(await screen.findByRole('button', { name: 'Thêm giáo viên' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm giáo viên' });
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await within(dialog).findByText('Vui lòng nhập họ tên.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập tên đăng nhập.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập email.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Họ và tên'), ' Lê Thị Cúc ');
    await user.type(within(dialog).getByLabelText('Tên đăng nhập'), 'gv.cuc');
    await user.type(within(dialog).getByLabelText('Email'), 'cuc@thcs.vn');
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await screen.findByText(MESSAGES.passwordLinkSent('cuc@thcs.vn'))).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      fullName: 'Lê Thị Cúc',
      username: 'gv.cuc',
      email: 'cuc@thcs.vn',
      phone: null,
    });
    await waitFor(() => expect(calls.filter((c) => c.path.startsWith('/org/teachers?')).length).toBeGreaterThan(1));
  });

  it('trùng email: báo dưới ô Email trong hộp thoại; chạm hạn mức giữa chừng: báo In line', async () => {
    signInAs('ORG_ADMIN');
    const taken = MESSAGES.taken('Email', 'cuc@thcs.vn');
    const limit = MESSAGES.teacherLimitReached(10, 10, 'Miễn phí');
    let attempt = 0;
    api([], FREE, (call) => {
      if (call.path !== '/org/teachers' || call.method !== 'POST') return undefined;
      attempt += 1;
      return attempt === 1
        ? envelope(409, { errorCode: 'DUPLICATE', message: taken, errors: { email: taken } })
        : envelope(422, { errorCode: 'TEACHER_LIMIT_REACHED', message: limit });
    });
    const user = userEvent.setup();
    renderApp('/truong/giao-vien');

    await user.click(await screen.findByRole('button', { name: 'Thêm giáo viên' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm giáo viên' });
    await user.type(within(dialog).getByLabelText('Họ và tên'), 'Lê Thị Cúc');
    await user.type(within(dialog).getByLabelText('Tên đăng nhập'), 'gv.cuc');
    await user.type(within(dialog).getByLabelText('Email'), 'cuc@thcs.vn');
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await within(dialog).findByText(taken)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');

    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(limit);
  });

  it('khóa giáo viên qua hộp xác nhận chung, toast "… thành công." của máy chủ', async () => {
    signInAs('ORG_ADMIN');
    const teacher = accountOf(7, { fullName: 'Đỗ Minh Khang' });
    const calls = api([teacher], FREE, (call) =>
      call.path === '/org/teachers/7/lock'
        ? envelope(200, { data: { ...teacher, status: 'LOCKED' }, message: 'Khóa tài khoản thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/giao-vien');

    await user.click(await screen.findByRole('button', { name: 'Khóa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Khóa tài khoản' });
    expect(dialog).toHaveTextContent(MESSAGES.confirm('khóa tài khoản', 'Đỗ Minh Khang'));
    await user.click(within(dialog).getByRole('button', { name: 'Khóa' }));

    expect(await screen.findByText('Khóa tài khoản thành công.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/org/teachers/7/lock')).toBe(true);
  });

  it('lọc theo trạng thái ghi lên URL bằng chữ Việt không dấu và gửi giá trị enum cho API', async () => {
    signInAs('ORG_ADMIN');
    const calls = api([accountOf(1)], FREE);
    const user = userEvent.setup();
    const { router } = renderApp('/truong/giao-vien');

    await user.selectOptions(await screen.findByLabelText('Trạng thái'), 'Bị khóa');
    await waitFor(() => expect(router.state.location.search).toBe('?trang-thai=bi-khoa'));
    await waitFor(() => expect(calls.some((c) => c.path.includes('status=LOCKED'))).toBe(true));
  });
});
