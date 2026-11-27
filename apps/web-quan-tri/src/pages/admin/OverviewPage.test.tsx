import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { paymentOf, paymentPageOf, systemOverviewOf, trendOf } from '../../test/overviewFixtures';
import { renderApp, signInAs } from '../../test/renderApp';
import type { SystemOverview } from '@dsvhvn/dung-chung/api';

// Tổng quan và doanh thu của quản trị hệ thống: tab Tổng quan (số liệu, gói, cần chú ý, biểu đồ theo thời gian) và tab Doanh thu (doanh thu từ giao
// dịch VNPay thành công, biểu đồ theo kỳ, danh sách giao dịch có bộ lọc).

function api(overview: SystemOverview = systemOverviewOf()) {
  return mockApi(
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/overview') return envelope(200, { data: overview });
      if (call.path.startsWith('/admin/overview/trend')) return envelope(200, { data: trendOf() });
      if (call.path.startsWith('/admin/overview/payments'))
        return envelope(200, { data: paymentPageOf([paymentOf(1), paymentOf(2, { status: 'FAILED', paidAt: null, providerTransactionId: null, organizationName: 'Trường Tiểu học Hòa Bình' })]) });
      if (call.path.startsWith('/admin/organizations'))
        return envelope(200, { data: { items: [{ id: 7, name: 'Trường THCS Lê Lợi' }, { id: 9, name: 'Trường Tiểu học Hòa Bình' }], page: 1, pageSize: 100, totalItems: 2, totalPages: 1 } });
      return undefined;
    },
  );
}

const trendCalls = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/admin/overview/trend'));
const paymentCalls = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/admin/overview/payments'));

describe('Tổng quan và doanh thu', () => {
  it('tab Tổng quan hiện số trường, giáo viên, học sinh, lượt AI và nội dung', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri');

    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument();
    const tiles = await screen.findByRole('region', { name: 'Số liệu toàn hệ thống' });
    expect(within(tiles).getByText('13')).toBeInTheDocument();
    expect(within(tiles).getByText('12 trường có gói đang hiệu lực, 1 trường không có')).toBeInTheDocument();
    expect(within(tiles).getByText('84')).toBeInTheDocument();
    expect(within(tiles).getByText('3.260')).toBeInTheDocument();
    expect(within(tiles).getByText('1.482')).toBeInTheDocument();
    expect(within(tiles).getByText(/300 lượt trong tháng này; giáo viên 1\.400, quản trị hệ thống 82/)).toBeInTheDocument();
    expect(within(tiles).getByText('20 câu chờ duyệt, 4 câu đã ẩn')).toBeInTheDocument();
  });

  it('số trường theo từng gói; gói đã ngừng bán có nhãn', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri');
    const table = await screen.findByRole('table', { name: 'Số trường đang dùng từng gói' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[1]!).getByText('Miễn phí')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('0 ₫')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('1.990.000 ₫')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Ngừng bán')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('1 trường')).toBeInTheDocument();
  });

  it('cần chú ý: câu chờ duyệt và giao dịch thất bại có liên kết xử lý', async () => {
    signInAs('ADMIN');
    api(systemOverviewOf({ recentFailedPayments: 2 }));
    renderApp('/quan-tri');
    expect(await screen.findByText('Có 20 câu hỏi đang chờ giáo viên duyệt.')).toBeInTheDocument();
    expect(screen.getByText('2 giao dịch thanh toán thất bại trong 7 ngày gần nhất.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem giao dịch thất bại' })).toHaveAttribute('href', '/quan-tri?tab=doanh-thu&trang-thai=that-bai');
  });

  it('cần chú ý: thanh toán đến muộn hiện số, danh sách ngắn kèm liên kết tới trang chi tiết trường', async () => {
    signInAs('ADMIN');
    api(
      systemOverviewOf({
        latePaymentsToReview: 7,
        latePayments: [
          { paymentId: 1, invoiceId: 11, invoiceNumber: 'HD-2026-0042', organizationId: 7, organizationName: 'Trường THCS Lê Lợi', planName: 'Cơ bản', amount: 1990000, paidAt: '2026-10-07T07:05:00Z' },
          { paymentId: 2, invoiceId: 12, invoiceNumber: 'HD-2026-0043', organizationId: 9, organizationName: 'Trường Tiểu học Hòa Bình', planName: null, amount: 3990000, paidAt: '2026-10-08T03:30:00Z' },
        ],
      }),
    );
    renderApp('/quan-tri');

    expect(await screen.findByText('Có 7 khoản thanh toán đến muộn cần xử lý.')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Khoản thanh toán đến muộn' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Hóa đơn HD-2026-0042 · Trường THCS Lê Lợi · gói Cơ bản · 1.990.000 ₫ · 14:05 07/10/2026');
    expect(rows[1]).toHaveTextContent('Hóa đơn HD-2026-0043 · Trường Tiểu học Hòa Bình · 3.990.000 ₫ · 10:30 08/10/2026');
    expect(within(rows[0]!).getByRole('link', { name: 'Trường THCS Lê Lợi' })).toHaveAttribute('href', '/quan-tri/truong/7');
    expect(screen.getByText('Còn 5 khoản khác.')).toBeInTheDocument();
  });

  it('cần chú ý: máy chủ cũ không có trường thanh toán đến muộn hoặc bằng 0 thì không hiện dòng này, không lỗi', async () => {
    signInAs('ADMIN');
    const old = systemOverviewOf();
    delete old.latePaymentsToReview;
    delete old.latePayments;
    api(old);
    const first = renderApp('/quan-tri');
    expect(await screen.findByText('4 câu hỏi đang bị ẩn khỏi ngân hàng.')).toBeInTheDocument();
    expect(screen.queryByText(/thanh toán đến muộn/)).not.toBeInTheDocument();
    first.unmount();

    api(systemOverviewOf({ latePaymentsToReview: 0, latePayments: [] }));
    renderApp('/quan-tri');
    expect(await screen.findByText('4 câu hỏi đang bị ẩn khỏi ngân hàng.')).toBeInTheDocument();
    expect(screen.queryByText(/thanh toán đến muộn/)).not.toBeInTheDocument();
  });

  it('cần chú ý: trường không có gói, gói sắp hết hạn và câu bị ẩn; rỗng thì báo chưa có', async () => {
    signInAs('ADMIN');
    api();
    const first = renderApp('/quan-tri');
    expect(await screen.findByText('1 trường không có gói đang hiệu lực.')).toBeInTheDocument();
    expect(screen.getByText('1 trường có gói sắp hết hạn trong 14 ngày tới.')).toBeInTheDocument();
    expect(screen.getByText('4 câu hỏi đang bị ẩn khỏi ngân hàng.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Mở kiểm duyệt câu hỏi' })[0]).toHaveAttribute('href', '/quan-tri/cau-hoi');
    first.unmount();

    api(
      systemOverviewOf({
        schools: { total: 2, withEffectivePlan: 2, withoutEffectivePlan: 0 },
        plans: [],
        content: { ...systemOverviewOf().content, questions: { approved: 1, pending: 0, hidden: 0 } },
      }),
    );
    renderApp('/quan-tri');
    expect(await screen.findByText('Chưa có việc nào cần chú ý.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có gói dịch vụ nào.')).toBeInTheDocument();
  });

  it('biểu đồ theo thời gian: mặc định 30 ngày, đổi khoảng gửi lại from, to theo ngày Việt Nam', async () => {
    signInAs('ADMIN');
    const calls = api();
    const user = userEvent.setup();
    renderApp('/quan-tri');

    const chart = await screen.findByRole('figure', { name: 'Lượt nộp bài theo ngày' });
    expect(within(chart).getByRole('cell', { name: '25' })).toBeInTheDocument();
    expect(screen.getByText(/Tổng cả khoảng:/)).toHaveTextContent('35');
    const first = trendCalls(calls)[0]!.path;
    const from30 = /from=(\d{4}-\d{2}-\d{2})&to=(\d{4}-\d{2}-\d{2})/.exec(first)!;
    expect(from30).not.toBeNull();

    await user.selectOptions(screen.getByLabelText('Khoảng thời gian'), '365');
    await waitFor(() => expect(trendCalls(calls).length).toBeGreaterThan(1));
    const last = /from=(\d{4}-\d{2}-\d{2})&to=(\d{4}-\d{2}-\d{2})/.exec(trendCalls(calls).at(-1)!.path)!;
    expect(last[2]).toBe(from30[2]);
    expect((Date.parse(last[2]!) - Date.parse(last[1]!)) / 86_400_000).toBe(364);

    await user.selectOptions(screen.getByLabelText('Số liệu'), 'newStudents');
    expect(await screen.findByRole('figure', { name: 'Học sinh mới theo ngày' })).toBeInTheDocument();
  });

  it('tab Doanh thu: doanh thu tháng này, hôm nay, từ trước tới nay, biểu đồ theo kỳ bằng tiền', async () => {
    signInAs('ADMIN');
    api();
    const user = userEvent.setup();
    renderApp('/quan-tri');
    await user.click(await screen.findByRole('tab', { name: 'Doanh thu' }));

    const tiles = await screen.findByRole('region', { name: 'Doanh thu từ gói dịch vụ' });
    expect(within(tiles).getByText('3.980.000 ₫')).toBeInTheDocument();
    expect(within(tiles).getByText('Hôm nay 1.990.000 ₫')).toBeInTheDocument();
    expect(within(tiles).getByText('12.940.000 ₫')).toBeInTheDocument();
    expect(within(tiles).getByText('7')).toBeInTheDocument();
    expect(within(tiles).getByText(/giao dịch VNPay thành công theo ngày thanh toán/)).toBeInTheDocument();

    const chart = await screen.findByRole('figure', { name: 'Doanh thu theo ngày' });
    expect(within(chart).getByRole('cell', { name: '1.990.000 ₫' })).toBeInTheDocument();
    expect(screen.getByText(/Tổng cả khoảng:/)).toHaveTextContent('1.990.000 ₫');
    expect(screen.queryByText(/quảng cáo|AdMob|Ad Manager/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Số liệu toàn hệ thống' })).not.toBeInTheDocument();
  });

  it('tab Doanh thu: danh sách giao dịch, lọc theo trạng thái, trường, khoảng thời gian gửi lên máy chủ và giữ trên URL', async () => {
    signInAs('ADMIN');
    const calls = api();
    const user = userEvent.setup();
    renderApp('/quan-tri?tab=doanh-thu');

    const table = await screen.findByRole('table', { name: 'Giao dịch thanh toán' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText('HD20261007-000001')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Thành công')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('1.990.000 ₫')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Thất bại')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Trường Tiểu học Hòa Bình')).toBeInTheDocument();
    expect(paymentCalls(calls)[0]!.path).not.toMatch(/status=|organizationId=|from=/);

    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'that-bai');
    await waitFor(() => expect(paymentCalls(calls).at(-1)!.path).toMatch(/status=FAILED/));
    await screen.findByRole('option', { name: 'Trường THCS Lê Lợi' });
    await user.selectOptions(screen.getByLabelText('Trường'), '7');
    await waitFor(() => expect(paymentCalls(calls).at(-1)!.path).toMatch(/organizationId=7/));
    await user.selectOptions(screen.getByLabelText('Thời gian giao dịch'), '90');
    await waitFor(() => expect(paymentCalls(calls).at(-1)!.path).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/));
    expect(paymentCalls(calls).at(-1)!.path).toMatch(/status=FAILED/);
  });

  it('mở thẳng tab Doanh thu từ đường dẫn', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri?tab=doanh-thu');
    expect(await screen.findByRole('region', { name: 'Doanh thu từ gói dịch vụ' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Doanh thu' })).toHaveAttribute('aria-selected', 'true');
  });

  it('tab Doanh thu: chưa có giao dịch nào thì báo trống', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/overview') return envelope(200, { data: systemOverviewOf() });
      if (call.path.startsWith('/admin/overview/trend')) return envelope(200, { data: trendOf() });
      if (call.path.startsWith('/admin/overview/payments')) return envelope(200, { data: paymentPageOf([]) });
      if (call.path.startsWith('/admin/organizations')) return envelope(200, { data: { items: [], page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
      return undefined;
    });
    renderApp('/quan-tri?tab=doanh-thu');
    expect(await screen.findByText('Chưa có giao dịch thanh toán nào.')).toBeInTheDocument();
  });

  it('quản trị trường mở /quan-tri nhận 403 và không gọi API tổng quan hệ thống', async () => {
    signInAs('ORG_ADMIN');
    const calls = mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('ORG_ADMIN') }) : undefined));
    renderApp('/quan-tri');
    await screen.findByRole('heading', { level: 1, name: /không có quyền|Bạn không/i });
    expect(calls.some((c) => c.path.startsWith('/admin/overview'))).toBe(false);
  });
});
