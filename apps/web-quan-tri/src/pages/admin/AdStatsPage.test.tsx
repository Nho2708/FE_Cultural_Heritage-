import type { AdStats } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Khách và quảng cáo (quản trị hệ thống): lượt mở khóa theo ngày, nền tảng, mạng quảng cáo kèm nguồn báo, di sản mở nhiều nhất, lượt bị từ chối theo lý do;
// tab Khách và di sản; khoảng ngày; liên kết sang bảng điều khiển của Google; không có doanh thu; chỉ quản trị hệ thống mở được.

const REASONS = [
  ['INVALID_SIGNATURE', 'Chữ ký không đúng', 3],
  ['UNKNOWN_AD_UNIT', 'Đơn vị quảng cáo lạ', 1],
  ['INVALID_PARAMETERS', 'Thiếu hoặc sai tham số', 0],
  ['TIMESTAMP_SKEW', 'Thời điểm lệch quá một giờ', 0],
  ['INVALID_TRANSACTION', 'Mã giao dịch web sai hoặc hết hạn', 2],
  ['RATE_LIMITED', 'Vượt giới hạn tần suất', 5],
] as const;

function statsOf(overrides: Partial<AdStats> = {}): AdStats {
  return {
    from: '2026-09-08',
    to: '2026-10-07',
    unlocks: {
      total: 40,
      byDay: [
        { date: '2026-10-05', count: 10 },
        { date: '2026-10-06', count: 0 },
        { date: '2026-10-07', count: 30 },
      ],
      byPlatform: [
        { platform: 'ANDROID', count: 25 },
        { platform: 'IOS', count: 5 },
        { platform: 'WEB', count: 10 },
      ],
      byNetwork: [
        { network: 'ADMOB', source: 'SERVER_VERIFIED', sourceLabel: 'Máy chủ xác minh', count: 30 },
        { network: 'AD_MANAGER', source: 'BROWSER_REPORTED', sourceLabel: 'Trình duyệt báo', count: 10 },
      ],
      topHeritages: [
        { heritageId: 7, slug: 'co-do-hue', name: 'Quần thể di tích Cố đô Huế', count: 22 },
        { heritageId: 9, slug: null, name: null, count: 3 },
      ],
    },
    rejections: { total: 11, byReason: REASONS.map(([reason, label, count]) => ({ reason, label, count })) },
    guests: {
      activeDevices: 120,
      byLanguage: [
        { language: 'en', devices: 70 },
        { language: 'vi', devices: 40 },
        { language: 'zh-Hans', devices: 10 },
      ],
      mostViewed: [{ heritageId: 7, slug: 'co-do-hue', name: 'Quần thể di tích Cố đô Huế', count: 88 }],
      mostListened: [{ heritageId: 8, slug: 'thang-long', name: 'Hoàng thành Thăng Long', count: 31 }],
      mostViewed3D: [],
    },
    note: 'Doanh thu quảng cáo không tính ở đây.',
    adMobConsoleUrl: 'https://apps.admob.com',
    adManagerConsoleUrl: 'https://admanager.google.com',
    ...overrides,
  };
}

function api(stats: AdStats = statsOf()) {
  return mockApi((call) => {
    if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
    if (call.path.startsWith('/admin/ads/stats')) return envelope(200, { data: stats });
    return undefined;
  });
}

const statsCalls = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/admin/ads/stats'));

describe('Khách và quảng cáo', () => {
  it('tab Mở khóa bằng quảng cáo: thẻ số, biểu đồ theo ngày, nền tảng, mạng quảng cáo kèm nguồn báo, di sản nhiều nhất', async () => {
    signInAs('ADMIN');
    const calls = api();
    renderApp('/quan-tri/khach-va-quang-cao');

    expect(await screen.findByRole('heading', { level: 1, name: 'Khách và quảng cáo' })).toBeInTheDocument();
    const tiles = await screen.findByRole('region', { name: 'Số liệu mở khóa bằng quảng cáo' });
    expect(within(tiles).getByText('40')).toBeInTheDocument();
    expect(within(tiles).getByText('11')).toBeInTheDocument();

    // Mặc định 30 ngày gần nhất theo ngày Việt Nam.
    const first = new URL(`http://x${statsCalls(calls)[0]!.path}`);
    expect(first.searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const days = await screen.findByRole('table', { name: 'Lượt mở khóa theo ngày' });
    expect(within(days).getAllByRole('row')).toHaveLength(3);
    expect(within(days).getByText('ngày 07/10/2026')).toBeInTheDocument();

    const platforms = screen.getByRole('list', { name: 'Lượt mở khóa theo nền tảng' });
    expect(within(platforms).getByText('Android')).toBeInTheDocument();
    expect(within(platforms).getByText(/25 lượt/)).toBeInTheDocument();
    expect(within(platforms).getByText('(63%)')).toBeInTheDocument();

    const networks = screen.getByRole('table', { name: 'Lượt mở khóa theo mạng quảng cáo' });
    expect(within(networks).getByText('Google AdMob')).toBeInTheDocument();
    expect(within(networks).getByText('Máy chủ xác minh')).toBeInTheDocument();
    expect(within(networks).getByText('Google Ad Manager')).toBeInTheDocument();
    expect(within(networks).getByText('Trình duyệt báo')).toBeInTheDocument();

    const top = screen.getByRole('table', { name: 'Di sản được mở khóa nhiều nhất' });
    expect(within(top).getByRole('link', { name: 'Quần thể di tích Cố đô Huế' })).toHaveAttribute('href', '/quan-tri/di-san/7');
    expect(within(top).getByText('Di sản không còn')).toBeInTheDocument();
  });

  it('lượt bị từ chối hiện đủ sáu lý do kể cả lý do chưa có lượt nào', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri/khach-va-quang-cao');

    const table = await screen.findByRole('table', { name: 'Lượt bị từ chối theo lý do' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(7);
    expect(within(rows[1]!).getByText('Chữ ký không đúng')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('3')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Thiếu hoặc sai tham số')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('0')).toBeInTheDocument();
    expect(within(rows[6]!).getByText('Vượt giới hạn tần suất')).toBeInTheDocument();
  });

  it('không có doanh thu: có khối ghi chú và hai liên kết sang bảng điều khiển của Google mở trong tab mới', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri/khach-va-quang-cao');

    const block = await screen.findByRole('region', { name: 'Doanh thu quảng cáo' });
    expect(within(block).getByText(/xem ở bảng điều khiển Google AdMob và Google Ad Manager/)).toBeInTheDocument();
    const admob = within(block).getByRole('link', { name: 'Mở bảng điều khiển AdMob' });
    expect(admob).toHaveAttribute('href', 'https://apps.admob.com');
    expect(admob).toHaveAttribute('target', '_blank');
    expect(within(block).getByRole('link', { name: 'Mở bảng điều khiển Ad Manager' })).toHaveAttribute('href', 'https://admanager.google.com');
    expect(screen.queryByText(/₫/)).not.toBeInTheDocument();
  });

  it('liên kết bảng điều khiển lạ (không phải của Google) bị thay bằng địa chỉ mặc định', async () => {
    signInAs('ADMIN');
    api(statsOf({ adMobConsoleUrl: 'https://trang-la.example/admob', adManagerConsoleUrl: 'javascript:alert(1)' }));
    renderApp('/quan-tri/khach-va-quang-cao');

    expect(await screen.findByRole('link', { name: 'Mở bảng điều khiển AdMob' })).toHaveAttribute('href', 'https://apps.admob.com');
    expect(screen.getByRole('link', { name: 'Mở bảng điều khiển Ad Manager' })).toHaveAttribute('href', 'https://admanager.google.com');
  });

  it('chưa có lượt nào thì báo rõ, không vẽ thanh trống', async () => {
    signInAs('ADMIN');
    api(statsOf({ unlocks: { total: 0, byDay: [{ date: '2026-10-07', count: 0 }], byPlatform: [], byNetwork: [], topHeritages: [] } }));
    renderApp('/quan-tri/khach-va-quang-cao');

    expect(await screen.findAllByText('Chưa có lượt mở khóa nào trong khoảng này.')).toHaveLength(2);
    // Biểu đồ theo ngày và bảng di sản đều nói chưa có số liệu.
    expect(screen.getAllByText('Chưa có số liệu trong khoảng này.').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('list', { name: 'Lượt mở khóa theo nền tảng' })).not.toBeInTheDocument();
  });

  it('đổi khoảng thời gian thì hỏi lại máy chủ với khoảng ngày mới và nhớ trên URL', async () => {
    signInAs('ADMIN');
    const calls = api();
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/khach-va-quang-cao');
    await screen.findByRole('region', { name: 'Số liệu mở khóa bằng quảng cáo' });

    await user.selectOptions(screen.getByLabelText('Khoảng thời gian'), '90');

    await waitFor(() => expect(statsCalls(calls)).toHaveLength(2));
    const second = new URL(`http://x${statsCalls(calls)[1]!.path}`);
    const days = (Date.parse(second.searchParams.get('to')!) - Date.parse(second.searchParams.get('from')!)) / 86_400_000 + 1;
    expect(days).toBe(90);
    expect(router.state.location.search).toBe('?khoang=90');
  });

  it('tab Khách và di sản: thiết bị hoạt động, ngôn ngữ bằng tên tiếng Việt, di sản được xem, nghe, xem 3D nhiều', async () => {
    signInAs('ADMIN');
    api();
    const user = userEvent.setup();
    renderApp('/quan-tri/khach-va-quang-cao');
    await user.click(await screen.findByRole('tab', { name: 'Khách và di sản' }));

    const tiles = await screen.findByRole('region', { name: 'Số liệu khách tham quan' });
    expect(within(tiles).getByText('120')).toBeInTheDocument();
    const languages = screen.getByRole('list', { name: 'Ngôn ngữ khách dùng' });
    expect(within(languages).getByText('Tiếng Anh')).toBeInTheDocument();
    expect(within(languages).getByText('Tiếng Trung giản thể')).toBeInTheDocument();
    expect(within(languages).getByText(/70 thiết bị/)).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Di sản được xem nhiều nhất' })).getByText('88')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Di sản được nghe nhiều nhất' })).getByRole('link', { name: 'Hoàng thành Thăng Long' })).toBeInTheDocument();
    expect(screen.getByText('Chưa có số liệu trong khoảng này.')).toBeInTheDocument();
  });

  it('lỗi máy chủ thì báo lỗi kèm nút thử lại', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path.startsWith('/admin/ads/stats')) return envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Đã có lỗi xảy ra.' });
      return undefined;
    });
    renderApp('/quan-tri/khach-va-quang-cao');

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('thanh bên có mục "Khách và quảng cáo" đứng ngay trước "Nhật ký"', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri/khach-va-quang-cao');
    const nav = await screen.findByRole('navigation', { name: 'Quản trị hệ thống' });
    const labels = within(nav).getAllByRole('link').map((link) => link.textContent);
    expect(labels.indexOf('Khách và quảng cáo')).toBeGreaterThan(-1);
    expect(labels.indexOf('Khách và quảng cáo')).toBe(labels.indexOf('Nhật ký') - 1);
  });
});

describe('quyền mở màn hình', () => {
  it('quản trị trường nhận 403 khi mở đường dẫn của quản trị hệ thống, không gọi API thống kê', async () => {
    signInAs('ORG_ADMIN');
    const calls = mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('ORG_ADMIN') }) : undefined));
    renderApp('/quan-tri/khach-va-quang-cao');

    expect(await screen.findByText('LỖI 403')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Khách và quảng cáo' })).not.toBeInTheDocument();
    expect(statsCalls(calls)).toHaveLength(0);
  });
});
