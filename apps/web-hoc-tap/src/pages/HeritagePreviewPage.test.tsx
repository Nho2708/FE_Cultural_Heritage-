import { PREVIEW_TOKEN_REPLY, PREVIEW_TOKEN_REQUEST } from '@dsvhvn/dung-chung/auth';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detailOf, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi, type FetchCall } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Xem trước bản nháp di sản: đúng giao diện trang chi tiết công khai, chỉ mở từ web quản trị (xin token ở cửa sổ đã mở tab),
// có dải "Bản xem trước", không cho máy tìm kiếm lập chỉ mục, hết hạn thì báo hết hạn.

vi.mock('../discovery/LocationMap', () => ({ default: () => <div data-testid="ban-do-nho" /> }));

const ADMIN = 'http://quantri.test';
const CODE = 'MA-XEM-TRUOC';
const EXPIRES_IN = 30 * 60_000;

/** Cửa sổ quản trị đã mở tab này: nhận lời xin token và trả lời như web quản trị thật (jsdom chỉ nhận cửa sổ thật làm nguồn tin). */
function adminOpener(token: string | null) {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const opener = frame.contentWindow!;
  vi.spyOn(opener, 'postMessage').mockImplementation(((message: { type: string }, origin: string) => {
    if (message.type !== PREVIEW_TOKEN_REQUEST || token === null) return;
    expect(origin).toBe(ADMIN);
    window.dispatchEvent(new MessageEvent('message', { data: { type: PREVIEW_TOKEN_REPLY, token }, origin: ADMIN, source: opener }));
  }) as typeof opener.postMessage);
  Object.defineProperty(window, 'opener', { value: opener, configurable: true });
  return opener;
}

const previewServer = (expiresAt: string, status: 'DRAFT' | 'ARCHIVED' = 'DRAFT') => (call: FetchCall) =>
  call.path.split('?')[0] === `/preview/heritages/${CODE}`
    ? envelope(200, { data: { expiresAt, status, heritage: detailOf({ name: 'Bản nháp Cố đô Huế' }) } })
    : undefined;

afterEach(() => {
  Object.defineProperty(window, 'opener', { value: null, configurable: true });
  document.querySelectorAll('iframe').forEach((frame) => frame.remove());
  vi.useRealTimers();
});

describe('Xem trước di sản nháp', () => {
  it('đọc bản nháp bằng token quản trị do cửa sổ mở chuyển sang, hiện dải xem trước và đúng giao diện chi tiết', async () => {
    adminOpener('token-quan-tri');
    const calls = mockApi(previewServer(new Date(Date.now() + EXPIRES_IN).toISOString()), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Bản nháp Cố đô Huế' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Bản xem trước — chưa xuất bản');
    expect(screen.getByRole('status')).toHaveTextContent('Hết hạn lúc');
    expect(screen.getByRole('heading', { level: 2, name: 'Giới thiệu' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Thông tin' })).toBeInTheDocument();
    expect(document.title).toContain('Bản xem trước');

    const read = calls.filter((c) => c.path.split('?')[0] === `/preview/heritages/${CODE}`);
    expect(read).toHaveLength(1);
    expect(read[0]!.authorization).toBe('Bearer token-quan-tri');
    // Bản nháp chưa có trang bản đồ và dòng thời gian công khai: bỏ liên kết sang đó.
    expect(screen.queryByRole('link', { name: 'Xem trên bản đồ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mở dòng thời gian' })).not.toBeInTheDocument();
  });

  it('không cho máy tìm kiếm lập chỉ mục', async () => {
    adminOpener('token-quan-tri');
    mockApi(previewServer(new Date(Date.now() + EXPIRES_IN).toISOString()), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);
    await screen.findByRole('heading', { level: 1, name: 'Bản nháp Cố đô Huế' });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow, noarchive');
  });

  it('di sản đang ẩn: dải xem trước nói rõ', async () => {
    adminOpener('token-quan-tri');
    mockApi(previewServer(new Date(Date.now() + EXPIRES_IN).toISOString(), 'ARCHIVED'), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);
    expect(await screen.findByRole('status')).toHaveTextContent('Di sản đang ẩn');
  });

  it('mở thẳng đường dẫn (không do web quản trị mở): báo chỉ mở được từ trang quản trị, không gọi máy chủ', async () => {
    const calls = mockApi(previewServer(new Date(Date.now() + EXPIRES_IN).toISOString()), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Không mở được bản xem trước' })).toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith('/preview/'))).toBe(false);
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow, noarchive');
  });

  it('web quản trị không trả lời token: sau thời gian chờ báo không mở được', { timeout: 10_000 }, async () => {
    adminOpener(null);
    const calls = mockApi(previewServer(new Date(Date.now() + EXPIRES_IN).toISOString()), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Không mở được bản xem trước' }, { timeout: 7000 })).toBeInTheDocument();
    expect(calls.some((c) => c.path.startsWith('/preview/'))).toBe(false);
  });

  it('mã hết hạn hoặc không dùng được (máy chủ trả 404 chung): báo hết hạn, không hiện nội dung', async () => {
    adminOpener('token-quan-tri');
    mockApi((call) =>
      call.path.startsWith('/preview/') ? envelope(404, { errorCode: 'PREVIEW_INVALID', message: 'Liên kết xem trước không còn dùng được.' }) : undefined,
    );
    renderApp(`/xem-truoc/di-san/${CODE}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản xem trước đã hết hạn hoặc không dùng được' })).toBeInTheDocument();
    expect(screen.queryByText(HUE.name)).not.toBeInTheDocument();
  });

  it('đang xem thì mã hết hạn: nội dung được thay bằng thông báo hết hạn', async () => {
    // Đồng hồ giả (vẫn trôi theo thời gian thật) để kết quả không phụ thuộc máy chạy test nhanh hay chậm.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    adminOpener('token-quan-tri');
    mockApi(previewServer(new Date(Date.now() + 60_000).toISOString()), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản nháp Cố đô Huế' })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(61_000);
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản xem trước đã hết hạn' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Bản nháp Cố đô Huế' })).not.toBeInTheDocument();
  });

  it('bộ hẹn giờ chạy sớm hơn đồng hồ vẫn báo hết hạn (hẹn lại phần còn lại)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    adminOpener('token-quan-tri');
    mockApi(previewServer(new Date(Date.now() + 60_000).toISOString()), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản nháp Cố đô Huế' })).toBeInTheDocument();
    // Đồng hồ lùi lại 5 ms so với bộ hẹn giờ: lúc bộ hẹn giờ chạy, Date.now() vẫn chưa tới giờ hết hạn.
    const realNow = Date.now.bind(Date);
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => realNow() - 5);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    spy.mockRestore();
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản xem trước đã hết hạn' })).toBeInTheDocument();
  });
});
