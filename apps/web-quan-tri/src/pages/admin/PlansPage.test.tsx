import { MESSAGES } from '@dsvhvn/dung-chung';
import type { Plan } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '@dsvhvn/dung-chung/api';
import { FREE_PLAN, planOf } from '../../test/billingFixtures';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Gói dịch vụ — quản trị hệ thống: bảng gói, tạo và sửa ở khung bên phải, bật tắt bán, gói Miễn phí bị khóa.

const BASIC = planOf(2, { name: 'Cơ bản', schoolCount: 5 });
const ADVANCED = planOf(3, { name: 'Nâng cao', price: 3_990_000, maxTeachers: 30, maxAiRequests: 1000, schoolCount: 2 });
const OLD = planOf(4, { name: 'Tiêu chuẩn', price: 1_490_000, isActive: false });

vi.setConfig({ testTimeout: 20_000 });

function api(plans: Plan[], extra?: (call: FetchCall) => Response | undefined, role: StaffRole = 'ADMIN') {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf(role) });
      if (call.path === '/admin/plans' && call.method === 'GET') return envelope(200, { data: plans });
      return undefined;
    },
  );
}

const rowOf = (name: string) => screen.getByRole('button', { name: `Sửa gói ${name}` }).closest('tr') as HTMLElement;

describe('Gói dịch vụ', () => {
  it('bảng gói có giá, thời hạn, hạn mức, đang bán và số trường đang dùng; gói Miễn phí bị khóa công tắc', async () => {
    signInAs('ADMIN');
    api([FREE_PLAN, BASIC, ADVANCED, OLD]);
    renderApp('/quan-tri/goi');

    const table = await screen.findByRole('table', { name: 'Gói dịch vụ' });
    expect(within(table).getByText('1.990.000 ₫')).toBeInTheDocument();
    expect(within(table).getByText('3.990.000 ₫')).toBeInTheDocument();
    expect(within(table).getByText('0 ₫')).toBeInTheDocument();
    expect(within(rowOf('Cơ bản')).getByRole('switch', { name: 'Đang bán gói Cơ bản' })).toBeChecked();
    expect(within(rowOf('Tiêu chuẩn')).getByRole('switch', { name: 'Đang bán gói Tiêu chuẩn' })).not.toBeChecked();
    expect(within(rowOf('Miễn phí')).getByRole('switch', { name: 'Đang bán gói Miễn phí' })).toBeDisabled();
    expect(within(rowOf('Nâng cao')).getAllByRole('cell').at(-1)).toHaveTextContent('2');
    expect(screen.getByText(/Gói Miễn phí không tắt, không xóa được/)).toBeInTheDocument();
    // Không có thao tác xóa gói.
    expect(screen.queryByRole('button', { name: /xóa/i })).not.toBeInTheDocument();
  });

  it('sửa gói: điền sẵn, đổi giá, lưu bằng PUT đúng thân yêu cầu rồi tải lại bảng', async () => {
    signInAs('ADMIN');
    const calls = api([FREE_PLAN, BASIC], (call) =>
      call.path === '/admin/plans/2' && call.method === 'PUT'
        ? envelope(200, { data: { ...BASIC, price: 2_490_000 }, message: 'Lưu gói thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('button', { name: 'Sửa gói Cơ bản' }));
    const form = await screen.findByRole('form', { name: 'Sửa gói' });
    expect(within(form).getByLabelText('Tên')).toHaveValue('Cơ bản');
    expect(within(form).getByLabelText('Giá (đồng)')).toHaveValue('1.990.000');
    expect(within(form).getByLabelText('Thời hạn (ngày)')).toHaveValue('365');
    expect(within(form).getByText(/5 trường đang dùng/)).toBeInTheDocument();

    await user.clear(within(form).getByLabelText('Giá (đồng)'));
    await user.type(within(form).getByLabelText('Giá (đồng)'), '2490000');
    await user.click(within(form).getByRole('button', { name: 'Lưu' }));

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
        name: 'Cơ bản',
        price: 2_490_000,
        durationDays: 365,
        maxTeachers: 10,
        maxAiRequests: 300,
      }),
    );
    expect(await screen.findByText('Lưu gói thành công.')).toBeInTheDocument();
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/plans' && c.method === 'GET').length).toBeGreaterThan(1));
  });

  it('gói Miễn phí: tên và giá chỉ đọc, công tắc bán bị khóa', async () => {
    signInAs('ADMIN');
    api([FREE_PLAN, BASIC]);
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('button', { name: 'Sửa gói Miễn phí' }));
    const form = await screen.findByRole('form', { name: 'Sửa gói' });
    expect(within(form).getByLabelText('Tên')).toHaveAttribute('readonly');
    expect(within(form).getByLabelText('Giá (đồng)')).toHaveAttribute('readonly');
    expect(within(form).getByLabelText('Giá (đồng)')).toHaveValue('0');
    expect(within(form).getByRole('switch', { name: 'Đang bán' })).toBeDisabled();
  });

  it('tạo gói để trống: báo lỗi từng ô bằng câu của danh mục, không gửi yêu cầu', async () => {
    signInAs('ADMIN');
    const calls = api([FREE_PLAN]);
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('button', { name: 'Tạo gói' }));
    const form = await screen.findByRole('form', { name: 'Tạo gói' });
    await user.clear(within(form).getByLabelText('Thời hạn (ngày)'));
    await user.click(within(form).getByRole('button', { name: 'Lưu' }));

    expect(await within(form).findByText(MESSAGES.required('tên gói'))).toBeInTheDocument();
    expect(within(form).getByText(MESSAGES.required('giá gói'))).toBeInTheDocument();
    expect(within(form).getByText(MESSAGES.required('thời hạn'))).toBeInTheDocument();
    expect(within(form).getByText(MESSAGES.required('số giáo viên tối đa'))).toBeInTheDocument();
    expect(within(form).getByText(MESSAGES.required('số lượt AI mỗi kỳ'))).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('giá 0 hoặc quá một tỷ đồng bị chặn; giá có dấu chấm nghìn được nhận', async () => {
    signInAs('ADMIN');
    const plans = [FREE_PLAN];
    const calls = api(plans, (call) => {
      if (call.path !== '/admin/plans' || call.method !== 'POST') return undefined;
      const created = planOf(9, { name: 'Gói mới', price: 990_000 });
      plans.push(created);
      return envelope(201, { data: created, message: 'Tạo gói thành công.' });
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('button', { name: 'Tạo gói' }));
    const form = await screen.findByRole('form', { name: 'Tạo gói' });
    await user.type(within(form).getByLabelText('Tên'), 'Gói mới');
    await user.type(within(form).getByLabelText('Số giáo viên tối đa'), '5');
    await user.type(within(form).getByLabelText('Lượt AI mỗi kỳ'), '50');

    await user.type(within(form).getByLabelText('Giá (đồng)'), '0');
    await user.click(within(form).getByRole('button', { name: 'Lưu' }));
    expect(await within(form).findByText(/gói Miễn phí là gói giá 0 duy nhất/)).toBeInTheDocument();

    await user.clear(within(form).getByLabelText('Giá (đồng)'));
    await user.type(within(form).getByLabelText('Giá (đồng)'), '1000000000');
    await user.click(within(form).getByRole('button', { name: 'Lưu' }));
    expect(await within(form).findByText(/từ 0 đến 999\.999\.999/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.clear(within(form).getByLabelText('Giá (đồng)'));
    await user.type(within(form).getByLabelText('Giá (đồng)'), '990.000');
    await user.click(within(form).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        name: 'Gói mới',
        price: 990_000,
        durationDays: 365,
        maxTeachers: 5,
        maxAiRequests: 50,
      }),
    );
    // Tạo xong, khung chuyển sang sửa chính gói vừa tạo.
    expect(await screen.findByRole('form', { name: 'Sửa gói' })).toBeInTheDocument();
  });

  it('tên trùng (409) hiện dưới ô Tên', async () => {
    signInAs('ADMIN');
    api([FREE_PLAN, BASIC], (call) =>
      call.path === '/admin/plans' && call.method === 'POST'
        ? envelope(409, { errorCode: 'DUPLICATE', message: 'Tên gói "Cơ bản" đã được sử dụng cho một tài khoản khác.', errors: { name: 'Tên gói "Cơ bản" đã được sử dụng.' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('button', { name: 'Tạo gói' }));
    const form = await screen.findByRole('form', { name: 'Tạo gói' });
    await user.type(within(form).getByLabelText('Tên'), 'Cơ bản');
    await user.type(within(form).getByLabelText('Giá (đồng)'), '1990000');
    await user.type(within(form).getByLabelText('Số giáo viên tối đa'), '5');
    await user.type(within(form).getByLabelText('Lượt AI mỗi kỳ'), '50');
    await user.click(within(form).getByRole('button', { name: 'Lưu' }));

    expect(await within(form).findByText('Tên gói "Cơ bản" đã được sử dụng.')).toBeInTheDocument();
  });

  it('tắt bán trên bảng phải xác nhận; hủy xác nhận thì không gửi, xác nhận thì POST disable', async () => {
    signInAs('ADMIN');
    const calls = api([FREE_PLAN, BASIC], (call) =>
      call.path === '/admin/plans/2/disable' ? envelope(200, { data: { ...BASIC, isActive: false }, message: 'Tắt bán gói thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('switch', { name: 'Đang bán gói Cơ bản' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tắt bán gói?' });
    expect(within(dialog).getByText(/Bạn có chắc muốn tắt bán "gói Cơ bản"\?/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(calls.some((c) => c.path.endsWith('/disable'))).toBe(false);

    await user.click(screen.getByRole('switch', { name: 'Đang bán gói Cơ bản' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Tắt bán gói?' })).getByRole('button', { name: 'Tắt bán' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/admin/plans/2/disable' && c.method === 'POST')).toBe(true));
    expect(await screen.findByText('Tắt bán gói thành công.')).toBeInTheDocument();
  });

  it('bật bán lại gói đã tắt không cần xác nhận', async () => {
    signInAs('ADMIN');
    const calls = api([FREE_PLAN, OLD], (call) =>
      call.path === '/admin/plans/4/enable' ? envelope(200, { data: { ...OLD, isActive: true } }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('switch', { name: 'Đang bán gói Tiêu chuẩn' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/admin/plans/4/enable' && c.method === 'POST')).toBe(true));
  });

  it('công tắc "Đang bán" trong khung sửa áp cùng lần lưu', async () => {
    signInAs('ADMIN');
    const calls = api([FREE_PLAN, BASIC], (call) => {
      if (call.path === '/admin/plans/2' && call.method === 'PUT') return envelope(200, { data: BASIC });
      if (call.path === '/admin/plans/2/disable') return envelope(200, { data: { ...BASIC, isActive: false } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/goi');

    await user.click(await screen.findByRole('button', { name: 'Sửa gói Cơ bản' }));
    const form = await screen.findByRole('form', { name: 'Sửa gói' });
    await user.click(within(form).getByRole('switch', { name: 'Đang bán' }));
    await user.click(within(form).getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(calls.some((c) => c.path === '/admin/plans/2/disable')).toBe(true));
    const order = calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path}`);
    expect(order).toEqual(['PUT /admin/plans/2', 'POST /admin/plans/2/disable']);
  });

  it('quản trị trường không mở được màn hình này', async () => {
    signInAs('ORG_ADMIN');
    api([], undefined, 'ORG_ADMIN');
    renderApp('/quan-tri/goi');
    expect(await screen.findByRole('heading', { level: 1, name: MESSAGES.forbidden })).toBeInTheDocument();
  });
});
