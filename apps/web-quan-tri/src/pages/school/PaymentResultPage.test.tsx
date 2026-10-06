import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { billingApi, type BillingState } from '../../test/billingApi';
import { invoiceOf, noPlanOverview, overviewOf, paymentOf, paymentResultOf } from '../../test/billingFixtures';
import { envelope } from '../../test/fixtures';
import { gateway } from '../../lib/gateway';
import { renderApp, signInAs } from '../../test/renderApp';
import { MAX_AUTO_CHECKS, POLL_INTERVAL_MS } from './PaymentResultPage';

// Kết quả thanh toán — quản trị trường: đã thanh toán, chưa thanh toán (thanh toán lại), đang xử lý (tự kiểm tra lại), liên kết sai.

vi.setConfig({ testTimeout: 20_000 });

let open: MockInstance<(url: string) => void>;

beforeEach(() => {
  open = vi.spyOn(gateway, 'open').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

const PAID = paymentResultOf();
const UNPAID = paymentResultOf({
  outcome: 'UNPAID',
  message: 'Thanh toán chưa thành công. Hóa đơn HD20261006-000031 vẫn chờ thanh toán đến 10:15 ngày 07/10/2026; bạn có thể thanh toán lại.',
  invoice: invoiceOf(31, { status: 'UNPAID', canPay: true, amount: 3_990_000 }),
  payment: paymentOf(40, { status: 'FAILED', providerTransactionId: null, paidAt: null }),
  subscription: null,
  canPayAgain: true,
});
const PROCESSING = paymentResultOf({
  outcome: 'PROCESSING',
  message: 'Hệ thống đang chờ xác nhận từ VNPay. Trang sẽ tự cập nhật khi có kết quả.',
  invoice: invoiceOf(31, { status: 'UNPAID', canPay: true }),
  payment: paymentOf(40, { status: 'PENDING', providerTransactionId: null, paidAt: null }),
  subscription: null,
});

describe('Kết quả thanh toán', () => {
  it('đã thanh toán: câu thành công của máy chủ, hóa đơn, nội dung, số tiền, mã giao dịch VNPay, thời gian; về tab Gói và hạn mức', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ payments: { 40: PAID } });
    renderApp('/truong/ket-qua-thanh-toan?payment=40');

    expect(await screen.findByRole('heading', { level: 2, name: 'Thanh toán thành công' })).toBeInTheDocument();
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
    expect(screen.getByText(PAID.message)).toBeInTheDocument();
    expect(screen.getByText('HD20261006-000031')).toBeInTheDocument();
    expect(screen.getByText('Nâng cấp gói Nâng cao')).toBeInTheDocument();
    expect(screen.getByText('3.990.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('14571026')).toBeInTheDocument();
    expect(screen.getByText('09:10 06/10/2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói và hóa đơn' })).toHaveAttribute('href', '/truong/thong-tin?tab=goi-va-han-muc');
    expect(screen.queryByRole('button', { name: 'Thanh toán lại' })).not.toBeInTheDocument();
  });

  it('thanh toán thành công thì làm mới dữ liệu trường để thanh báo gói không còn hiện', async () => {
    signInAs('ORG_ADMIN');
    const state: BillingState = { overview: noPlanOverview() };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const calls = billingApi(state, (call) =>
      call.path === '/org/payments/40'
        ? gate.then(() => {
            state.overview = overviewOf(); // IPN đã kích hoạt gói
            return envelope(200, { data: PAID });
          })
        : undefined,
    );
    renderApp('/truong/ket-qua-thanh-toan?payment=40');

    expect(await screen.findByText(/Gói dịch vụ của trường đã hết hiệu lực/)).toBeInTheDocument();
    release();
    await screen.findByRole('heading', { level: 2, name: 'Thanh toán thành công' });
    await waitFor(() => expect(screen.queryByText(/Gói dịch vụ của trường đã hết hiệu lực/)).not.toBeInTheDocument());
    expect(calls.filter((c) => c.path === '/org').length).toBeGreaterThan(1);
  });

  it('chưa thanh toán: giữ câu của máy chủ, "Thanh toán lại" tạo giao dịch mới và chuyển sang VNPay', async () => {
    signInAs('ORG_ADMIN');
    const calls = billingApi({ payments: { 40: UNPAID } }, (call) =>
      call.path === '/org/invoices/31/pay' && call.method === 'POST'
        ? envelope(200, { data: { invoice: UNPAID.invoice, paymentId: 79, paymentUrl: 'https://sandbox.vnpayment.vn/pay?retry=1', expiresAt: '2026-10-06T04:00:00Z', kind: 'UPGRADE' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/ket-qua-thanh-toan?payment=40');

    expect(await screen.findByRole('heading', { level: 2, name: 'Thanh toán chưa thành công' })).toBeInTheDocument();
    expect(screen.getByText('Chưa thanh toán')).toBeInTheDocument();
    expect(screen.getByText(UNPAID.message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói và hóa đơn' })).toHaveAttribute('href', '/truong/thong-tin?tab=hoa-don');

    await user.click(screen.getByRole('button', { name: 'Thanh toán lại' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/pay?retry=1'));
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('chưa thanh toán và hóa đơn không còn thanh toán được: dẫn tới Chọn gói, không có "Thanh toán lại"', async () => {
    signInAs('ORG_ADMIN');
    billingApi({
      payments: {
        40: { ...UNPAID, canPayAgain: false, message: 'Thanh toán chưa thành công và hóa đơn HD20261006-000031 không còn thanh toán được. Bạn có thể chọn gói và thanh toán lại.' },
      },
    });
    renderApp('/truong/ket-qua-thanh-toan?payment=40');

    expect(await screen.findByRole('link', { name: 'Chọn gói' })).toHaveAttribute('href', '/truong/chon-goi');
    expect(screen.queryByRole('button', { name: 'Thanh toán lại' })).not.toBeInTheDocument();
  });

  it('đang xử lý: báo đang chờ xác nhận, tự kiểm tra lại mỗi 5 giây và đổi sang đã thanh toán khi IPN tới', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    signInAs('ORG_ADMIN');
    const results = { 40: PROCESSING };
    const calls = billingApi({ payments: results });
    renderApp('/truong/ket-qua-thanh-toan?payment=40');

    expect(await screen.findByRole('heading', { level: 2, name: 'Đang chờ xác nhận' })).toBeInTheDocument();
    expect(screen.getByText('Đang xử lý')).toBeInTheDocument();
    expect(screen.getByText(PROCESSING.message)).toBeInTheDocument();
    expect(screen.getByText('Đã kiểm tra 1 lần, lần tiếp theo sau 5 giây.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kiểm tra lại' })).not.toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/org/payments/40')).toHaveLength(1);

    results[40] = PAID; // IPN của VNPay vừa tới
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS + 100));
    expect(await screen.findByRole('heading', { level: 2, name: 'Thanh toán thành công' })).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/org/payments/40').length).toBeGreaterThanOrEqual(2);

    // Có kết quả cuối thì dừng kiểm tra.
    const settled = calls.length;
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3));
    expect(calls.filter((c) => c.path === '/org/payments/40').length).toBe(calls.slice(0, settled).filter((c) => c.path === '/org/payments/40').length);
  });

  it('chờ quá lâu mà chưa có IPN: dừng tự kiểm tra, hiện nút "Kiểm tra lại"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    signInAs('ORG_ADMIN');
    const calls = billingApi({ payments: { 40: PROCESSING } });
    renderApp('/truong/ket-qua-thanh-toan?payment=40');
    await screen.findByRole('heading', { level: 2, name: 'Đang chờ xác nhận' });

    for (let i = 0; i < MAX_AUTO_CHECKS + 2; i++) await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS + 50));

    expect(await screen.findByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument();
    expect(screen.getByText(/chưa có xác nhận/)).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/org/payments/40')).toHaveLength(MAX_AUTO_CHECKS);
  });

  it('liên kết trả về sai chữ ký (?error=invalid): báo không xem được kết quả, không gọi API giao dịch', async () => {
    signInAs('ORG_ADMIN');
    const calls = billingApi();
    renderApp('/truong/ket-qua-thanh-toan?error=invalid');

    expect(
      await screen.findByText('Không thể xem kết quả thanh toán. Liên kết trả về từ VNPay không hợp lệ. Bạn xem trạng thái hóa đơn ở Trường và gói.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói và hóa đơn' })).toHaveAttribute('href', '/truong/thong-tin?tab=hoa-don');
    expect(calls.some((c) => c.path.startsWith('/org/payments'))).toBe(false);
  });

  it('thiếu hoặc sai mã giao dịch trên đường dẫn thì xử lý như liên kết không hợp lệ', async () => {
    signInAs('ORG_ADMIN');
    const calls = billingApi();
    renderApp('/truong/ket-qua-thanh-toan?payment=abc');
    expect(await screen.findByText(/Liên kết trả về từ VNPay không hợp lệ/)).toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith('/org/payments'))).toBe(false);
  });

  it('giao dịch của trường khác (404) hiện lỗi của máy chủ kèm nút "Thử lại"', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ payments: {} });
    renderApp('/truong/ket-qua-thanh-toan?payment=99');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Không thể xem giao dịch. Không tìm thấy giao dịch.')).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
