import { MESSAGES } from '@dsvhvn/dung-chung';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { billingApi, type BillingState } from '../../test/billingApi';
import { invoiceOf, noPlanOverview, overviewOf, paymentOf, schoolOf, subscriptionOf } from '../../test/billingFixtures';
import { envelope } from '../../test/fixtures';
import { gateway } from '../../lib/gateway';
import { renderApp, signInAs } from '../../test/renderApp';

// Trường và gói — quản trị trường: tab Gói và hạn mức (gói đang dùng, hạn mức, hủy gói, kích hoạt gói Miễn phí, yêu cầu mua chưa
// thanh toán), tab Hóa đơn và giao dịch, thanh báo gói hết hiệu lực.

vi.setConfig({ testTimeout: 15_000 });

const PLAN_TAB = '/truong/thong-tin?tab=goi-va-han-muc';
let open: MockInstance<(url: string) => void>;

beforeEach(() => {
  open = vi.spyOn(gateway, 'open').mockImplementation(() => undefined);
});

describe('Trường và gói — tab Gói và hạn mức', () => {
  it('có ba tab và tab nằm trên URL; mặc định là Thông tin trường', async () => {
    signInAs('ORG_ADMIN');
    billingApi();
    renderApp('/truong/thong-tin');
    expect(await screen.findByRole('tab', { name: 'Thông tin trường', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Gói và hạn mức' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hóa đơn và giao dịch' })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Gói và hạn mức' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Cơ bản' })).toBeInTheDocument();
  });

  it('gói đang dùng: trạng thái, ngày, còn lại, hạn mức giáo viên và lượt AI, ba nút', async () => {
    signInAs('ORG_ADMIN');
    billingApi();
    renderApp(PLAN_TAB);

    expect(await screen.findByRole('heading', { level: 2, name: 'Cơ bản' })).toBeInTheDocument();
    expect(screen.getByText('Đang hiệu lực')).toBeInTheDocument();
    expect(screen.getByText('1.990.000 ₫ · tối đa 10 giáo viên · 300 lượt AI mỗi kỳ')).toBeInTheDocument();
    expect(screen.getByText('29/09/2026')).toBeInTheDocument();
    expect(screen.getByText('28/09/2027')).toBeInTheDocument();
    expect(screen.getByText('364 ngày')).toBeInTheDocument();
    expect(screen.getByText('8 / 10')).toBeInTheDocument();
    expect(screen.getByText('120 / 300')).toBeInTheDocument();
    expect(screen.getByText(/Kỳ hiện tại từ 29\/09\/2026 đến 28\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gia hạn' })).toHaveAttribute('href', '/truong/chon-goi?goi=2');
    expect(screen.getByRole('link', { name: 'Nâng cấp' })).toHaveAttribute('href', '/truong/chon-goi');
    expect(screen.getByRole('button', { name: 'Hủy gói' })).toBeInTheDocument();
    // Có gói hiệu lực thì không có nút kích hoạt gói Miễn phí.
    expect(screen.queryByRole('button', { name: 'Kích hoạt gói Miễn phí' })).not.toBeInTheDocument();
  });

  it('gói Miễn phí đang dùng: chỉ "Nâng cấp", không gia hạn, không hủy', async () => {
    signInAs('ORG_ADMIN');
    billingApi({
      overview: overviewOf({
        current: subscriptionOf({ planId: 1, planName: 'Miễn phí', price: 0, isFree: true, daysLeft: 20, maxTeachers: 2, maxAiRequests: 20 }),
        canCancelCurrent: false,
        cancelConfirmation: null,
      }),
    });
    renderApp(PLAN_TAB);

    expect(await screen.findByRole('heading', { level: 2, name: 'Miễn phí' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nâng cấp' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gia hạn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy gói' })).not.toBeInTheDocument();
  });

  it('đã có gói gia hạn chờ bắt đầu: khóa "Gia hạn" và báo ngày gói gia hạn bắt đầu', async () => {
    signInAs('ORG_ADMIN');
    billingApi({
      overview: overviewOf({
        upcoming: subscriptionOf({ id: 8, planName: 'Cơ bản', status: 'ACTIVE', startDate: '2027-09-29', endDate: '2028-09-28', isEffective: false }),
        canCancelCurrent: false,
        cancelConfirmation: null,
      }),
    });
    renderApp(PLAN_TAB);

    expect(await screen.findByRole('button', { name: 'Gia hạn' })).toBeDisabled();
    expect(screen.getByText(/Gói gia hạn Cơ bản đã thanh toán, có hiệu lực 29\/09\/2027 – 28\/09\/2028/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy gói' })).not.toBeInTheDocument();
  });

  it('hủy gói: hộp xác nhận hiện câu của máy chủ, "Giữ gói" không gửi gì, "Hủy gói" gọi hủy rồi cập nhật tab', async () => {
    signInAs('ORG_ADMIN');
    const state: BillingState = {};
    const calls = billingApi(state, (call) => {
      if (call.path !== '/org/subscriptions/5/cancel' || call.method !== 'POST') return undefined;
      state.overview = noPlanOverview();
      return envelope(200, { data: state.overview, message: 'Hủy thành công.' });
    });
    const user = userEvent.setup();
    renderApp(PLAN_TAB);

    await user.click(await screen.findByRole('button', { name: 'Hủy gói' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hủy gói Cơ bản?' });
    expect(within(dialog).getByText(/Gói sẽ kết thúc ngay, không được hoàn tiền/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Giữ gói' }));
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Hủy gói' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Hủy gói Cơ bản?' })).getByRole('button', { name: 'Hủy gói' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/org/subscriptions/5/cancel' && c.method === 'POST')).toBe(true));
    expect(await screen.findByText('Hủy thành công.')).toBeInTheDocument();
    expect(await screen.findByText('Trường chưa có gói hiệu lực')).toBeInTheDocument();
  });

  it('không có gói hiệu lực: "Mua gói", "Kích hoạt gói Miễn phí" và các quyền lợi còn lại; thanh báo trên cùng có "Mua gói"', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ overview: noPlanOverview() });
    renderApp(PLAN_TAB);

    expect(await screen.findByText('Trường chưa có gói hiệu lực')).toBeInTheDocument();
    expect(screen.getByText(/Gói Miễn phí của trường đã hết hạn ngày 26\/09\/2026/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Mua gói' }).length).toBe(2);
    expect(screen.getAllByRole('link', { name: 'Mua gói' })[0]).toHaveAttribute('href', '/truong/chon-goi');
    expect(screen.getByRole('button', { name: 'Kích hoạt gói Miễn phí' })).toBeInTheDocument();
    expect(screen.getByText('8 tài khoản')).toBeInTheDocument();
    expect(screen.getByText('Không dùng được')).toBeInTheDocument();
    expect(screen.getByText('Tạm khóa')).toBeInTheDocument();
    expect(screen.getByText('Vẫn học bình thường')).toBeInTheDocument();
  });

  it('kích hoạt gói Miễn phí: xác nhận rồi POST, gói hiện ngay, không qua VNPay', async () => {
    signInAs('ORG_ADMIN');
    const state: BillingState = { overview: noPlanOverview() };
    const calls = billingApi(state, (call) => {
      if (call.path !== '/org/billing/free-plan' || call.method !== 'POST') return undefined;
      state.overview = overviewOf({ current: subscriptionOf({ planId: 1, planName: 'Miễn phí', price: 0, isFree: true }) });
      return envelope(200, { data: state.overview, message: 'Kích hoạt gói Miễn phí thành công.' });
    });
    const user = userEvent.setup();
    renderApp(PLAN_TAB);

    await user.click(await screen.findByRole('button', { name: 'Kích hoạt gói Miễn phí' }));
    const dialog = await screen.findByRole('dialog', { name: 'Kích hoạt gói Miễn phí?' });
    expect(within(dialog).getByText(/Bạn có chắc muốn kích hoạt gói "Miễn phí"\?/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Kích hoạt' }));

    await waitFor(() => expect(calls.some((c) => c.path === '/org/billing/free-plan' && c.method === 'POST')).toBe(true));
    expect(await screen.findByText('Kích hoạt gói Miễn phí thành công.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Miễn phí' })).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  it('yêu cầu mua chưa thanh toán: hiện hóa đơn và số tiền, "Thanh toán" chuyển sang VNPay, mua thêm bị khóa', async () => {
    signInAs('ORG_ADMIN');
    const calls = billingApi(
      {
        overview: overviewOf({
          pending: {
            subscriptionId: 9,
            planId: 3,
            planName: 'Nâng cao',
            invoiceId: 31,
            invoiceNumber: 'HD20261006-000031',
            amount: 3_990_000,
            dueAt: '2026-10-07T03:15:00Z',
            hasWaitingPayment: false,
          },
          canCancelCurrent: false,
          cancelConfirmation: null,
        }),
      },
      (call) =>
        call.path === '/org/invoices/31/pay' && call.method === 'POST'
          ? envelope(200, {
              data: {
                invoice: invoiceOf(31, { canPay: true, status: 'UNPAID' }),
                paymentId: 77,
                paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=77',
                expiresAt: '2026-10-06T04:00:00Z',
                kind: 'UPGRADE',
              },
            })
          : undefined,
    );
    const user = userEvent.setup();
    renderApp(PLAN_TAB);

    const card = await screen.findByRole('region', { name: 'Yêu cầu mua gói chưa thanh toán' });
    expect(within(card).getByText('HD20261006-000031')).toBeInTheDocument();
    expect(within(card).getByText('3.990.000 ₫')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nâng cấp' })).toBeDisabled();

    await user.click(within(card).getByRole('button', { name: 'Thanh toán' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=77'));
    expect(calls.some((c) => c.path === '/org/invoices/31/pay' && c.method === 'POST')).toBe(true);
  });

  it('hủy yêu cầu mua chưa thanh toán: xác nhận rồi gọi hủy theo mã đăng ký', async () => {
    signInAs('ORG_ADMIN');
    const state: BillingState = {
      overview: overviewOf({
        pending: { subscriptionId: 9, planId: 3, planName: 'Nâng cao', invoiceId: 31, invoiceNumber: 'HD20261006-000031', amount: 3_990_000, dueAt: null, hasWaitingPayment: false },
      }),
    };
    const calls = billingApi(state, (call) => {
      if (call.path !== '/org/subscriptions/9/cancel') return undefined;
      state.overview = overviewOf();
      return envelope(200, { data: state.overview, message: 'Hủy thành công.' });
    });
    const user = userEvent.setup();
    renderApp(PLAN_TAB);

    await user.click(await screen.findByRole('button', { name: 'Hủy yêu cầu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hủy yêu cầu mua gói?' });
    expect(within(dialog).getByText(/Hóa đơn HD20261006-000031 sẽ bị hủy/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Hủy yêu cầu' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/org/subscriptions/9/cancel')).toBe(true));
    expect(await screen.findByText('Hủy thành công.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Yêu cầu mua gói chưa thanh toán' })).not.toBeInTheDocument();
  });

  it('thanh báo gói hết hiệu lực có liên kết "Mua gói" tới Chọn gói', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ overview: noPlanOverview() });
    renderApp('/truong/giao-vien');
    expect(await screen.findByText(MESSAGES.noEffectivePlan('26/09/2026'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mua gói' })).toHaveAttribute('href', '/truong/chon-goi');
  });
});

describe('Thanh báo gói hết hiệu lực', () => {
  it('gói bị hủy: không ghi ngày hết hiệu lực vì gói đã kết thúc ngay', async () => {
    signInAs('ORG_ADMIN');
    const cancelled = { ...schoolOf(false), subscription: { ...schoolOf(false).subscription!, status: 'CANCELLED' as const, endDate: '2027-10-06' } };
    billingApi({ overview: noPlanOverview() }, (call) => (call.path === '/org' ? envelope(200, { data: cancelled }) : undefined));
    renderApp('/truong/giao-vien');
    expect(await screen.findByText(MESSAGES.noEffectivePlan(null))).toBeInTheDocument();
    expect(screen.queryByText(/hết hiệu lực từ ngày/)).not.toBeInTheDocument();
  });
});

describe('Trường và gói — tab Hóa đơn và giao dịch', () => {
  const unpaid = invoiceOf(31, { description: 'Nâng cấp gói Nâng cao', amount: 3_990_000, status: 'UNPAID', canPay: true, dueAt: '2026-10-07T03:15:00Z' });
  const paid = invoiceOf(30);
  const cancelled = invoiceOf(24, { status: 'CANCELLED', description: 'Mua gói Cơ bản' });

  it('bảng hóa đơn: số, nội dung, tiền, trạng thái, ngày xuất, hạn; "Thanh toán" chỉ ở hóa đơn còn thanh toán được', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ invoices: [unpaid, paid, cancelled] });
    renderApp('/truong/thong-tin?tab=hoa-don');

    const table = await screen.findByRole('table', { name: 'Hóa đơn của trường' });
    expect(within(table).getByText('HD20261006-000031')).toBeInTheDocument();
    expect(within(table).getByText('Nâng cấp gói Nâng cao')).toBeInTheDocument();
    expect(within(table).getByText('3.990.000 ₫')).toBeInTheDocument();
    expect(within(table).getByText('Chưa thanh toán')).toBeInTheDocument();
    expect(within(table).getByText('Đã thanh toán')).toBeInTheDocument();
    expect(within(table).getByText('Đã hủy')).toBeInTheDocument();
    expect(within(table).getAllByRole('button', { name: /^Thanh toán hóa đơn/ })).toHaveLength(1);
    expect(screen.getByText(/không phải hóa đơn giá trị gia tăng/)).toBeInTheDocument();
  });

  it('mở dòng hóa đơn xem các giao dịch với mã VNPay, thời điểm, số tiền và trạng thái', async () => {
    signInAs('ORG_ADMIN');
    billingApi({
      invoices: [paid],
      details: {
        30: {
          invoice: paid,
          payments: [
            paymentOf(41, { providerTransactionId: '14568213', status: 'SUCCEEDED' }),
            paymentOf(40, { providerTransactionId: null, status: 'FAILED', paidAt: null }),
          ],
        },
      },
    });
    const user = userEvent.setup();
    renderApp('/truong/thong-tin?tab=hoa-don');

    await user.click(await screen.findByRole('button', { name: /^Xem giao dịch của hóa đơn HD20261006-000030/ }));
    expect(await screen.findByText('Giao dịch của hóa đơn HD20261006-000030')).toBeInTheDocument();
    expect(screen.getByText('Mã giao dịch VNPay 14568213')).toBeInTheDocument();
    expect(screen.getByText('Chưa có mã giao dịch VNPay')).toBeInTheDocument();
    expect(screen.getByText('Thành công')).toBeInTheDocument();
    expect(screen.getByText('Thất bại')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Thu gọn của hóa đơn HD20261006-000030/ }));
    expect(screen.queryByText('Mã giao dịch VNPay 14568213')).not.toBeInTheDocument();
  });

  it('"Thanh toán" tạo giao dịch mới và chuyển trình duyệt sang địa chỉ VNPay máy chủ trả', async () => {
    signInAs('ORG_ADMIN');
    const calls = billingApi({ invoices: [unpaid] }, (call) =>
      call.path === '/org/invoices/31/pay' && call.method === 'POST'
        ? envelope(200, {
            data: { invoice: unpaid, paymentId: 78, paymentUrl: 'https://sandbox.vnpayment.vn/pay?x=1', expiresAt: '2026-10-06T04:00:00Z', kind: 'UPGRADE' },
          })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/thong-tin?tab=hoa-don');

    await user.click(await screen.findByRole('button', { name: 'Thanh toán hóa đơn HD20261006-000031' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/pay?x=1'));
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('địa chỉ thanh toán không phải http hoặc https bị từ chối, không chuyển trang', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ invoices: [unpaid] }, (call) =>
      call.path === '/org/invoices/31/pay'
        ? envelope(200, { data: { invoice: unpaid, paymentId: 78, paymentUrl: 'javascript:alert(1)', expiresAt: '2026-10-06T04:00:00Z', kind: null } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/thong-tin?tab=hoa-don');

    await user.click(await screen.findByRole('button', { name: 'Thanh toán hóa đơn HD20261006-000031' }));
    expect(await screen.findByText(MESSAGES.systemError)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  it('hóa đơn quá hạn: máy chủ từ chối (422) thì hiện lý do và không chuyển trang', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ invoices: [unpaid] }, (call) =>
      call.path === '/org/invoices/31/pay'
        ? envelope(422, { errorCode: 'BLOCKED', message: 'Không thể thanh toán hóa đơn. Hóa đơn đã quá hạn thanh toán.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/thong-tin?tab=hoa-don');

    await user.click(await screen.findByRole('button', { name: 'Thanh toán hóa đơn HD20261006-000031' }));
    expect(await screen.findByText('Không thể thanh toán hóa đơn. Hóa đơn đã quá hạn thanh toán.')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  it('chưa có hóa đơn nào thì báo trạng thái rỗng', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ invoices: [] });
    renderApp('/truong/thong-tin?tab=hoa-don');
    expect(await screen.findByText('Trường chưa có hóa đơn nào.')).toBeInTheDocument();
  });
});
