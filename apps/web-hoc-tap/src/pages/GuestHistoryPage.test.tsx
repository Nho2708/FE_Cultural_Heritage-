import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languages';
import { HUE, publicApi, QUAN_HO, THANG_LONG } from '../test/discoveryFixtures';
import { envelope, mockApi, studentOf, studentServer, type FetchCall } from '../test/fixtures';
import { deviceOf, guestServer, historyItemOf, restoreLocation, stubLocation } from '../test/guestFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Lịch sử và cài đặt của khách (`/lich-su`): nhóm theo loại, mới nhất trước, xóa từng mục hoặc xóa tất cả (xóa thật trên máy chủ), cài đặt ngôn ngữ và vị trí.

afterEach(() => {
  restoreLocation();
});

const base = (path: string) => path.split('?')[0] ?? path;

const sampleHistory = () => [
  historyItemOf({ id: 5, type: 'LISTEN', heritage: QUAN_HO, createdAt: '2026-10-06T08:30:00Z' }),
  historyItemOf({ id: 4, type: 'VIEW', heritage: THANG_LONG, createdAt: '2026-10-06T08:00:00Z' }),
  historyItemOf({ id: 3, type: 'VIEW', heritage: HUE, createdAt: '2026-10-05T10:00:00Z' }),
  historyItemOf({ id: 2, type: 'SEARCH', query: 'thang long', heritage: null, createdAt: '2026-10-05T09:50:00Z' }),
  historyItemOf({ id: 1, type: 'VIEW_3D', heritage: HUE, createdAt: '2026-10-04T10:00:00Z' }),
];

function openHistory(server = guestServer({ history: sampleHistory() }), path = '/lich-su') {
  const calls = mockApi(server.handler, publicApi());
  renderApp(path);
  return { calls, server };
}

describe('Lịch sử của khách', () => {
  it('chia nhóm theo loại, mỗi nhóm mới nhất trước; từ khóa dẫn tới tìm kiếm, di sản dẫn tới trang chi tiết', async () => {
    const { calls } = openHistory();

    expect(await screen.findByRole('heading', { level: 1, name: 'Lịch sử của tôi' })).toBeInTheDocument();
    const searched = await screen.findByRole('region', { name: 'Từ khóa đã tìm' });
    expect(within(searched).getByRole('link', { name: 'Tìm lại "thang long"' })).toHaveAttribute('href', '/di-san?tu-khoa=thang%20long');

    const viewed = screen.getByRole('region', { name: 'Di sản đã xem' });
    const names = within(viewed).getAllByRole('link').map((link) => link.textContent);
    expect(names[0]).toContain('Khu Trung tâm Hoàng thành Thăng Long');
    expect(names[1]).toContain('Quần thể di tích Cố đô Huế');
    expect(within(viewed).getAllByRole('link')[1]).toHaveAttribute('href', `/di-san/${HUE.slug}`);

    expect(within(screen.getByRole('region', { name: 'Di sản đã nghe' })).getByText(/Dân ca Quan họ Bắc Ninh/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mô hình 3D đã xem' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tóm tắt đã đọc' })).not.toBeInTheDocument();
    expect(screen.getByText('Lịch sử tự xóa sau 90 ngày.')).toBeInTheDocument();

    const history = calls.find((call) => base(call.path) === '/public/guest/history')!;
    expect(history.deviceKey).toBeDefined();
    expect(new URL(`http://x${history.path}`).searchParams.get('pageSize')).toBe('50');
  });

  it('thời điểm máy chủ trả không kèm Z vẫn được hiểu là UTC', async () => {
    const server = guestServer({ history: [historyItemOf({ id: 9, createdAt: '2026-10-06T07:05:00' })] });
    openHistory(server);
    const row = (await screen.findByRole('link', { name: /Quần thể di tích Cố đô Huế/ })).closest('li')!;
    const expected = new Date('2026-10-06T07:05:00Z').toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
    expect(within(row).getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
  });

  it('xóa một mục: xóa thật trên máy chủ rồi danh sách và gợi ý được tải lại', async () => {
    const { calls, server } = openHistory();
    const user = userEvent.setup();

    const viewed = await screen.findByRole('region', { name: 'Di sản đã xem' });
    await user.click(within(viewed).getByRole('button', { name: 'Xóa "Khu Trung tâm Hoàng thành Thăng Long – Hà Nội" khỏi lịch sử' }));

    await waitFor(() => expect(server.state.history.map((item) => item.id)).toEqual([5, 3, 2, 1]));
    expect(calls.some((call) => call.method === 'DELETE' && base(call.path) === '/public/guest/history/4' && call.deviceKey !== undefined)).toBe(true);
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Di sản đã xem' })).getAllByRole('link')).toHaveLength(1));
    expect(await screen.findByText('Đã xóa mục khỏi lịch sử.')).toBeInTheDocument();
  });

  it('xóa tất cả có hộp xác nhận; hủy thì không xóa gì, xác nhận thì lịch sử trống', async () => {
    const { calls, server } = openHistory();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Xóa tất cả' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa toàn bộ lịch sử?' });
    expect(within(dialog).getByText(/không khôi phục được/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(server.state.history).toHaveLength(5);
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Xóa tất cả' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Xóa toàn bộ lịch sử?' })).getByRole('button', { name: 'Xóa tất cả' }));

    await waitFor(() => expect(server.state.history).toHaveLength(0));
    expect(await screen.findByText('Chưa có lịch sử. Hãy tìm hoặc mở một di sản, lịch sử sẽ hiện ở đây.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá di sản' })).toHaveAttribute('href', '/di-san');
  });

  it('chưa có lịch sử: trang trống kèm lối vào khám phá', async () => {
    openHistory(guestServer());
    expect(await screen.findByText('Chưa có lịch sử. Hãy tìm hoặc mở một di sản, lịch sử sẽ hiện ở đây.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa tất cả' })).not.toBeInTheDocument();
  });

  it('nhiều hơn một trang thì có nút "Xem thêm" tải trang kế tiếp', async () => {
    const many = Array.from({ length: 55 }, (_, index) => historyItemOf({ id: 100 - index, type: 'SEARCH', query: `tu khoa ${index + 10}`, heritage: null }));
    const { calls } = openHistory(guestServer({ history: many }));
    const user = userEvent.setup();

    expect(await screen.findAllByRole('link', { name: /Tìm lại/ })).toHaveLength(50);
    await user.click(screen.getByRole('button', { name: 'Xem thêm' }));
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Tìm lại/ })).toHaveLength(55));
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).not.toBeInTheDocument();
    expect(calls.filter((call) => base(call.path) === '/public/guest/history').map((call) => new URL(`http://x${call.path}`).searchParams.get('page'))).toEqual(['1', '2']);
  });

  it('máy chủ lỗi thì báo lỗi kèm nút thử lại', async () => {
    mockApi((call) => (base(call.path) === '/public/guest/history' ? envelope(400, { errorCode: 'INVALID', message: 'Mã thiết bị không hợp lệ.' }) : undefined), publicApi());
    renderApp('/lich-su');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Mã thiết bị không hợp lệ.');
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('hiện bằng ngôn ngữ đã chọn (tiếng Nhật)', async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ja');
    openHistory();
    expect(await screen.findByRole('heading', { level: 1, name: '閲覧履歴' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: '検索したキーワード' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'すべて削除' })).toBeInTheDocument();
  });

  it('học sinh đã đăng nhập mở /lich-su thì được đưa về trang học và không gọi API của khách', async () => {
    const student = studentOf(7);
    signInAs(student);
    const server = guestServer({ history: sampleHistory() });
    const calls = mockApi(studentServer(student), server.handler, publicApi());
    const { router } = renderApp('/lich-su');
    await waitFor(() => expect(router.state.location.pathname).toBe('/hoc'));
    expect(calls.filter((call: FetchCall) => base(call.path).startsWith('/public/guest/'))).toEqual([]);
  });
});

describe('Cài đặt của khách', () => {
  const settings = '/lich-su?tab=cai-dat';

  it('tab Cài đặt giữ trên địa chỉ trang; có ngôn ngữ, vị trí và lời giải thích mã thiết bị ẩn danh', async () => {
    stubLocation({ permission: 'prompt', coords: { latitude: 16.4637, longitude: 107.5909 } });
    openHistory(guestServer(), settings);
    const user = userEvent.setup();

    expect(await screen.findByRole('tab', { name: 'Cài đặt', selected: true })).toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).getByText('Tiếng Việt', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Mã thiết bị ẩn danh')).toBeInTheDocument();
    expect(screen.getByText(/không gắn với tên hay tài khoản nào/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Đổi ngôn ngữ' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chọn ngôn ngữ' });
    await user.click(within(dialog).getByRole('button', { name: 'English' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'My history' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('bật vị trí thì trình duyệt được hỏi và cờ ghi lên máy chủ; tắt thì cờ về tắt', async () => {
    const location = stubLocation({ permission: 'prompt', coords: { latitude: 16.4637, longitude: 107.5909 } });
    const { server } = openHistory(guestServer(), settings);
    const user = userEvent.setup();

    const toggle = await screen.findByRole('switch', { name: 'Dùng vị trí cho "Gần bạn"' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    await waitFor(() => expect(server.state.device.locationAllowed).toBe(true));
    expect(location.getCurrentPosition).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Dùng vị trí cho "Gần bạn"' })).toHaveAttribute('aria-checked', 'true'));

    await user.click(screen.getByRole('switch', { name: 'Dùng vị trí cho "Gần bạn"' }));
    await waitFor(() => expect(server.state.device.locationAllowed).toBe(false));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Dùng vị trí cho "Gần bạn"' })).toHaveAttribute('aria-checked', 'false'));
  });

  it('trình duyệt chặn vị trí thì công tắc bị khóa kèm lời giải thích', async () => {
    stubLocation({ permission: 'denied' });
    openHistory(guestServer({ device: deviceOf({ isRegistered: true, locationAllowed: true }) }), settings);
    const toggle = await screen.findByRole('switch', { name: 'Dùng vị trí cho "Gần bạn"' });
    await waitFor(() => expect(toggle).toBeDisabled());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/Trình duyệt đang chặn quyền vị trí/)).toBeInTheDocument();
  });

  it('trình duyệt không hỗ trợ vị trí thì không có công tắc', async () => {
    openHistory(guestServer(), settings);
    await screen.findByText('Mã thiết bị ẩn danh');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
