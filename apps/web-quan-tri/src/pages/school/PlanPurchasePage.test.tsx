import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { billingApi } from '../../test/billingApi';
import { invoiceOf, offerOf, overviewOf, quoteOf } from '../../test/billingFixtures';
import { envelope } from '../../test/fixtures';
import { gateway } from '../../lib/gateway';
import { renderApp, signInAs } from '../../test/renderApp';

// Chọn gói và thanh toán — quản trị trường: thẻ gói, khối xác nhận theo loại thao tác, hộp xác nhận trước khi sang VNPay.

vi.setConfig({ testTimeout: 15_000 });

const BASIC = offerOf(2, { name: 'Cơ bản', isCurrent: true, kind: 'RENEW' });
const ADVANCED = offerOf(3, { name: 'Nâng cao', price: 3_990_000, maxTeachers: 30, maxAiRequests: 1000, kind: 'UPGRADE' });

let open: MockInstance<(url: string) => void>;

beforeEach(() => {
  open = vi.spyOn(gateway, 'open').mockImplementation(() => undefined);
});

describe('Chọn gói và thanh toán', () => {
  it('thẻ gói có giá, thời hạn, hạn mức; đánh dấu gói hiện tại; ghi chú môi trường thử VNPay', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ offers: [BASIC, ADVANCED] });
    renderApp('/truong/chon-goi');

    expect(await screen.findByRole('radio', { name: 'Cơ bản' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Nâng cao' })).not.toBeChecked();
    expect(screen.getByText('1.990.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('3.990.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Gói hiện tại')).toBeInTheDocument();
    expect(screen.getByText('Tối đa 30 tài khoản giáo viên')).toBeInTheDocument();
    expect(screen.getByText('1.000 lượt AI mỗi kỳ')).toBeInTheDocument();
    expect(screen.getAllByText('Không giới hạn số học sinh')).toHaveLength(2);
    expect(screen.getByText('Chọn để gia hạn gói hiện tại')).toBeInTheDocument();
    expect(screen.getByText(/Môi trường thử VNPay/)).toBeInTheDocument();
    // Chưa chọn gói thì chưa có khối xác nhận.
    expect(screen.queryByRole('heading', { name: 'Xác nhận thanh toán' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Trường và gói' })).toHaveAttribute('href', '/truong/thong-tin?tab=goi-va-han-muc');
  });

  it('chọn gói nâng cấp: khối xác nhận có loại, gói, số tiền, thời hạn và lưu ý không hoàn tiền', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ offers: [BASIC, ADVANCED], overview: overviewOf() });
    const user = userEvent.setup();
    renderApp('/truong/chon-goi');

    await user.click(await screen.findByRole('radio', { name: 'Nâng cao' }));
    const block = await screen.findByRole('region', { name: 'Xác nhận thanh toán' });
    expect(await within(block).findByText('Nâng cấp')).toBeInTheDocument();
    expect(within(block).getByText('Nâng cao')).toBeInTheDocument();
    expect(within(block).getByText('3.990.000 ₫')).toBeInTheDocument();
    expect(within(block).getByText('Thời hạn dự kiến')).toBeInTheDocument();
    expect(within(block).getByText(/• \d+ ngày$/)).toBeInTheDocument();
    expect(
      within(block).getByText(
        'Nâng cấp không hoàn tiền hoặc khấu trừ thời gian chưa dùng của gói Cơ bản hiện tại.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Nâng cao' })).toBeChecked();
  });

  it('gia hạn: hiệu lực là khoảng ngày bắt đầu sau khi gói hiện tại hết hạn', async () => {
    signInAs('ORG_ADMIN');
    billingApi(
      { offers: [BASIC, ADVANCED], quotes: { 2: quoteOf({ planId: 2, planName: 'Cơ bản', kind: 'RENEW', amount: 1_990_000, expectedStartDate: '2027-09-29', expectedEndDate: '2028-09-28' }) } },
    );
    const user = userEvent.setup();
    renderApp('/truong/chon-goi');

    await user.click(await screen.findByRole('radio', { name: 'Cơ bản' }));
    const block = await screen.findByRole('region', { name: 'Xác nhận thanh toán' });
    expect(await within(block).findByText('Gia hạn')).toBeInTheDocument();
    expect(within(block).getByText(/^29\/09\/2027 – 28\/09\/2028 • \d+ ngày$/)).toBeInTheDocument();
    expect(within(block).getByText(/Gia hạn: gói mới bắt đầu từ ngày 29\/09\/2027/)).toBeInTheDocument();
  });

  it('?goi= chọn sẵn gói (nút "Gia hạn" của tab Gói và hạn mức)', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ offers: [BASIC, ADVANCED], quotes: { 2: quoteOf({ planId: 2, planName: 'Cơ bản', kind: 'RENEW', amount: 1_990_000 }) } });
    renderApp('/truong/chon-goi?goi=2');

    expect(await screen.findByRole('radio', { name: 'Cơ bản' })).toBeChecked();
    expect(await screen.findByRole('region', { name: 'Xác nhận thanh toán' })).toBeInTheDocument();
  });

  it('vượt hạn mức giáo viên: hiện cảnh báo của máy chủ nhưng vẫn cho thanh toán', async () => {
    signInAs('ORG_ADMIN');
    const warning = 'Trường đang có 12 tài khoản giáo viên, nhiều hơn 10 của gói Cơ bản. Không ai bị khóa.';
    billingApi({ offers: [offerOf(2, { name: 'Cơ bản' })], quotes: { 2: quoteOf({ planId: 2, planName: 'Cơ bản', kind: 'PURCHASE', teacherWarning: warning }) } });
    const user = userEvent.setup();
    renderApp('/truong/chon-goi');

    await user.click(await screen.findByRole('radio', { name: 'Cơ bản' }));
    expect(await screen.findByText(warning)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thanh toán qua VNPay' })).toBeEnabled();
  });

  it('gói không mua được hiện lý do và không chọn được', async () => {
    signInAs('ORG_ADMIN');
    const reason = 'Không thể mua gói. Trường đã có yêu cầu mua gói Nâng cao chưa thanh toán.';
    billingApi({
      offers: [offerOf(2, { name: 'Cơ bản', available: false, unavailableReason: reason })],
      overview: overviewOf({
        pending: { subscriptionId: 9, planId: 3, planName: 'Nâng cao', invoiceId: 31, invoiceNumber: 'HD20261006-000031', amount: 3_990_000, dueAt: null, hasWaitingPayment: false },
      }),
    });
    renderApp('/truong/chon-goi');

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cơ bản' })).toBeDisabled();
    expect(await screen.findByText(/Trường đang có yêu cầu mua gói Nâng cao chưa thanh toán/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xử lý yêu cầu chưa thanh toán' })).toBeInTheDocument();
  });

  it('"Thanh toán qua VNPay" mở hộp xác nhận với câu của máy chủ; "Quay lại" không gửi; "Tiếp tục" tạo yêu cầu và chuyển sang VNPay', async () => {
    signInAs('ORG_ADMIN');
    const calls = billingApi({ offers: [BASIC, ADVANCED] }, (call) =>
      call.path === '/org/billing/checkout' && call.method === 'POST'
        ? envelope(201, {
            data: {
              invoice: invoiceOf(31, { status: 'UNPAID', canPay: true }),
              paymentId: 77,
              paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=77',
              expiresAt: '2026-10-06T04:00:00Z',
              kind: 'UPGRADE',
            },
          })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/chon-goi');

    await user.click(await screen.findByRole('radio', { name: 'Nâng cao' }));
    await user.click(await screen.findByRole('button', { name: 'Thanh toán qua VNPay' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thanh toán qua VNPay' });
    expect(within(dialog).getByText(/Trường sẽ thanh toán 3\.990\.000 đồng cho gói Nâng cao qua VNPay\./)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Quay lại' }));
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Thanh toán qua VNPay' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Thanh toán qua VNPay' })).getByRole('button', { name: 'Tiếp tục' }));

    await waitFor(() => expect(open).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=77'));
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({ path: '/org/billing/checkout', body: { planId: 3 } });
  });

  it('cổng VNPay chưa sẵn sàng (503): hiện câu của máy chủ, không chuyển trang, đóng hộp xác nhận', async () => {
    signInAs('ORG_ADMIN');
    const message = 'Không thể thanh toán lúc này. Cổng VNPay chưa sẵn sàng, bạn hãy thử lại sau hoặc liên hệ quản trị viên.';
    billingApi({ offers: [BASIC, ADVANCED] }, (call) =>
      call.path === '/org/billing/checkout' ? envelope(503, { errorCode: 'PAYMENT_GATEWAY_UNAVAILABLE', message }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/truong/chon-goi');

    await user.click(await screen.findByRole('radio', { name: 'Nâng cao' }));
    await user.click(await screen.findByRole('button', { name: 'Thanh toán qua VNPay' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Thanh toán qua VNPay' })).getByRole('button', { name: 'Tiếp tục' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thanh toán qua VNPay' })).not.toBeInTheDocument());
  });

  it('"Hủy" quay về tab Gói và hạn mức', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ offers: [BASIC, ADVANCED] });
    const user = userEvent.setup();
    const { router } = renderApp('/truong/chon-goi');

    await user.click(await screen.findByRole('radio', { name: 'Nâng cao' }));
    await user.click(await screen.findByRole('button', { name: 'Hủy' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/truong/thong-tin'));
    expect(router.state.location.search).toBe('?tab=goi-va-han-muc');
  });

  it('chưa có gói nào đang bán thì báo trạng thái rỗng', async () => {
    signInAs('ORG_ADMIN');
    billingApi({ offers: [] });
    renderApp('/truong/chon-goi');
    expect(await screen.findByText('Hiện chưa có gói nào đang bán.')).toBeInTheDocument();
  });

  it('giáo viên không mở được màn hình này', async () => {
    signInAs('TEACHER');
    billingApi({ role: 'TEACHER' });
    renderApp('/truong/chon-goi');
    expect(await screen.findByRole('heading', { level: 1, name: 'Bạn không có quyền thực hiện thao tác này.' })).toBeInTheDocument();
  });
});
