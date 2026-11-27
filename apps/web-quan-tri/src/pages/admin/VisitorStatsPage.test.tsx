import type { AdStats } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Thống kê khách tham quan (quản trị hệ thống): thiết bị hoạt động, ngôn ngữ, di sản được xem, nghe, xem 3D nhiều; khoảng ngày; không còn phần
// quảng cáo hay doanh thu; đường dẫn cũ chuyển sang đường dẫn mới; chỉ quản trị hệ thống mở được.

function statsOf(overrides: Partial<AdStats> = {}): AdStats {
  return {
    from: '2026-09-08',
    to: '2026-10-07',
    unlocks: { total: 0, byDay: [], byPlatform: [], byNetwork: [], topHeritages: [] },
    rejections: { total: 0, byReason: [] },
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
    note: '',
    adMobConsoleUrl: '',
    adManagerConsoleUrl: '',
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

describe('Thống kê khách tham quan', () => {
  it('thiết bị hoạt động, ngôn ngữ bằng tên tiếng Việt, di sản được xem, nghe, xem 3D nhiều', async () => {
    signInAs('ADMIN');
    const calls = api();
    renderApp('/quan-tri/khach-tham-quan');

    expect(await screen.findByRole('heading', { level: 1, name: 'Thống kê khách tham quan' })).toBeInTheDocument();
    const tiles = await screen.findByRole('region', { name: 'Số liệu khách tham quan' });
    expect(within(tiles).getByText('120')).toBeInTheDocument();
    const languages = screen.getByRole('list', { name: 'Ngôn ngữ khách dùng' });
    expect(within(languages).getByText('Tiếng Anh')).toBeInTheDocument();
    expect(within(languages).getByText('Tiếng Trung giản thể')).toBeInTheDocument();
    expect(within(languages).getByText(/70 thiết bị/)).toBeInTheDocument();
    const viewed = screen.getByRole('table', { name: 'Di sản được xem nhiều nhất' });
    expect(within(viewed).getByText('88')).toBeInTheDocument();
    expect(within(viewed).getByRole('link', { name: 'Quần thể di tích Cố đô Huế' })).toHaveAttribute('href', '/quan-tri/di-san/7');
    expect(within(screen.getByRole('table', { name: 'Di sản được nghe nhiều nhất' })).getByRole('link', { name: 'Hoàng thành Thăng Long' })).toBeInTheDocument();
    expect(screen.getByText('Chưa có số liệu trong khoảng này.')).toBeInTheDocument();

    // Mặc định 30 ngày gần nhất theo ngày Việt Nam.
    const first = new URL(`http://x${statsCalls(calls)[0]!.path}`);
    expect(first.searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('không còn phần mở khóa, quảng cáo hay doanh thu', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri/khach-tham-quan');

    await screen.findByRole('region', { name: 'Số liệu khách tham quan' });
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText(/quảng cáo|mở khóa|AdMob|Ad Manager|doanh thu|₫/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /bảng điều khiển/i })).not.toBeInTheDocument();
  });

  it('chưa có khách nào thì báo rõ, không vẽ thanh trống', async () => {
    signInAs('ADMIN');
    api(statsOf({ guests: { activeDevices: 0, byLanguage: [], mostViewed: [], mostListened: [], mostViewed3D: [] } }));
    renderApp('/quan-tri/khach-tham-quan');

    expect(await screen.findByText('Chưa có khách nào trong khoảng này.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Ngôn ngữ khách dùng' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Chưa có số liệu trong khoảng này.')).toHaveLength(3);
  });

  it('đổi khoảng thời gian thì hỏi lại máy chủ với khoảng ngày mới và nhớ trên URL', async () => {
    signInAs('ADMIN');
    const calls = api();
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/khach-tham-quan');
    await screen.findByRole('region', { name: 'Số liệu khách tham quan' });

    await user.selectOptions(screen.getByLabelText('Khoảng thời gian'), '90');

    await waitFor(() => expect(statsCalls(calls)).toHaveLength(2));
    const second = new URL(`http://x${statsCalls(calls)[1]!.path}`);
    const days = (Date.parse(second.searchParams.get('to')!) - Date.parse(second.searchParams.get('from')!)) / 86_400_000 + 1;
    expect(days).toBe(90);
    expect(router.state.location.search).toBe('?khoang=90');
  });

  it('lỗi máy chủ thì báo lỗi kèm nút thử lại', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path.startsWith('/admin/ads/stats')) return envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Đã có lỗi xảy ra.' });
      return undefined;
    });
    renderApp('/quan-tri/khach-tham-quan');

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('thanh bên có mục "Khách tham quan" đứng ngay trước "Nhật ký"', async () => {
    signInAs('ADMIN');
    api();
    renderApp('/quan-tri/khach-tham-quan');
    const nav = await screen.findByRole('navigation', { name: 'Quản trị hệ thống' });
    const labels = within(nav).getAllByRole('link').map((link) => link.textContent);
    expect(labels.indexOf('Khách tham quan')).toBeGreaterThan(-1);
    expect(labels.indexOf('Khách tham quan')).toBe(labels.indexOf('Nhật ký') - 1);
    expect(labels.some((label) => /quảng cáo/i.test(label ?? ''))).toBe(false);
  });

  it('đường dẫn cũ chuyển sang đường dẫn mới', async () => {
    signInAs('ADMIN');
    api();
    const { router } = renderApp('/quan-tri/khach-va-quang-cao');

    expect(await screen.findByRole('heading', { level: 1, name: 'Thống kê khách tham quan' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/quan-tri/khach-tham-quan');
  });
});

describe('quyền mở màn hình', () => {
  it('quản trị trường nhận 403 khi mở đường dẫn của quản trị hệ thống, không gọi API thống kê', async () => {
    signInAs('ORG_ADMIN');
    const calls = mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('ORG_ADMIN') }) : undefined));
    renderApp('/quan-tri/khach-tham-quan');

    expect(await screen.findByText('LỖI 403')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Thống kê khách tham quan' })).not.toBeInTheDocument();
    expect(statsCalls(calls)).toHaveLength(0);
  });
});
