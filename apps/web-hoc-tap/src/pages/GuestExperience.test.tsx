import { isDeviceKey } from '@dsvhvn/dung-chung';
import type { HeritagePin } from '@dsvhvn/dung-chung/api';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languages';
import { detailOf, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi, studentOf, studentServer, type FetchCall } from '../test/fixtures';
import { guestServer, nearbyOf, personalizedOf, recommendationOf, restoreLocation, stubLocation } from '../test/guestFixtures';
import { DEVICE_KEY_STORAGE_KEY } from '../lib/guest/deviceKey';
import { renderApp, signInAs } from '../test/renderApp';

// Khách tham quan trên web học tập: mã thiết bị ẩn danh, lịch sử tự ghi qua các API công khai, "Gợi ý cho bạn" ở trang chủ và chi tiết, "Gần bạn" ở trang chủ
// và bản đồ (xin quyền vị trí, không cho thì ẩn), nghe thuyết minh được ghi vào lịch sử, học sinh đã đăng nhập không dính gì tới các chức năng này.

vi.mock('../discovery/LocationMap', () => ({ default: () => <div data-testid="ban-do-nho" /> }));

interface FakeMapProps {
  pins: HeritagePin[];
  userPosition?: { latitude: number; longitude: number } | null;
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}

vi.mock('../discovery/HeritageMap', () => ({
  default: ({ pins, userPosition, selectedSlug, onSelect }: FakeMapProps) => (
    <div data-testid="ban-do" data-user={userPosition ? `${userPosition.latitude},${userPosition.longitude}` : ''} data-selected={selectedSlug ?? ''}>
      {pins.map((pin) => (
        <button key={pin.slug} type="button" onClick={() => onSelect(pin.slug)}>{`Ghim ${pin.name}`}</button>
      ))}
    </div>
  ),
}));

afterEach(() => {
  restoreLocation();
  Object.defineProperty(window.navigator, 'languages', { value: ['vi-VN', 'vi'], configurable: true });
});

const base = (path: string) => path.split('?')[0] ?? path;
const guestCalls = (calls: FetchCall[]) => calls.filter((call) => base(call.path).startsWith('/public/guest/'));
const withDetail = () => (call: FetchCall) => (base(call.path) === `/public/heritages/${HUE.slug}` ? envelope(200, { data: detailOf() }) : undefined);

function openGuestHome(server = guestServer()) {
  const calls = mockApi(server.handler, withDetail(), publicApi());
  renderApp('/');
  return { calls, server };
}

describe('mã thiết bị ẩn danh', () => {
  it('sinh một lần (UUID phiên bản 4), lưu ở localStorage và gửi cùng mọi yêu cầu công khai của khách kèm nền tảng WEB', async () => {
    const { calls } = openGuestHome();
    await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' });

    const key = window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
    expect(isDeviceKey(key)).toBe(true);
    const home = calls.find((call) => base(call.path) === '/public/home')!;
    expect(home.deviceKey).toBe(key);
    expect(new Set(calls.filter((call) => call.deviceKey).map((call) => call.deviceKey))).toEqual(new Set([key]));
  });

  it('giữ nguyên mã đã lưu ở lần mở sau; mã bị sửa sai định dạng thì sinh mã mới', async () => {
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '3f1c2a4e-5b6d-4c8e-9a1b-2c3d4e5f6a7b');
    const { calls } = openGuestHome();
    await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' });
    expect(calls.find((call) => base(call.path) === '/public/home')!.deviceKey).toBe('3f1c2a4e-5b6d-4c8e-9a1b-2c3d4e5f6a7b');
  });

  it('mã bị sửa sai định dạng thì được thay bằng mã mới hợp lệ', async () => {
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, 'khong-phai-uuid');
    const { calls } = openGuestHome();
    await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' });
    const key = calls.find((call) => base(call.path) === '/public/home')!.deviceKey;
    expect(isDeviceKey(key)).toBe(true);
    expect(window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY)).toBe(key);
  });

  it('ảnh bìa trang chủ lấy chi tiết ngầm, không mang mã thiết bị, để lịch sử "đã xem" không có di sản khách chưa mở', async () => {
    const { calls } = openGuestHome();
    await screen.findByText(/Ảnh: Vyacheslav Argenberg/);
    const detail = calls.filter((call) => base(call.path) === `/public/heritages/${HUE.slug}`);
    expect(detail.length).toBeGreaterThan(0);
    expect(detail.every((call) => call.deviceKey === undefined)).toBe(true);
  });

  it('học sinh đã đăng nhập không gửi mã thiết bị và không gọi chức năng nào của khách', async () => {
    const student = studentOf(5);
    signInAs(student);
    const server = guestServer();
    const calls = mockApi(studentServer(student), server.handler, withDetail(), publicApi());
    renderApp('/');

    await screen.findByRole('link', { name: 'Vào trang học của em' });
    await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' });
    expect(calls.every((call) => call.deviceKey === undefined)).toBe(true);
    expect(guestCalls(calls)).toEqual([]);
    expect(screen.queryByRole('heading', { name: 'Gợi ý cho bạn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Gần bạn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Lịch sử của tôi' })).not.toBeInTheDocument();
  });

  it('trang nhúng cho app không gửi mã thiết bị (app có mã riêng)', async () => {
    window.history.pushState({}, '', '/nhung/ban-do');
    try {
      const calls = mockApi(publicApi());
      renderApp('/nhung/ban-do');
      await screen.findByTestId('ban-do');
      expect(calls.some((call) => base(call.path) === '/public/heritages/map')).toBe(true);
      expect(calls.every((call) => call.deviceKey === undefined)).toBe(true);
      expect(window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY)).toBeNull();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });
});

describe('Gợi ý cho bạn — trang chủ', () => {
  it('chưa có lịch sử: chỉ hiện lời mời xem thử, không lặp lại di sản nổi bật', async () => {
    openGuestHome();
    const section = await screen.findByRole('region', { name: 'Gợi ý cho bạn' });
    expect(await within(section).findByText(/Bạn chưa xem di sản nào/)).toBeInTheDocument();
    expect(within(section).queryAllByRole('link')).toHaveLength(0);
  });

  it('có lịch sử: tối đa 6 thẻ kèm di sản giống nhất và các điểm chung bằng chữ của giao diện', async () => {
    const server = guestServer({ recommendations: personalizedOf() });
    openGuestHome(server);

    const section = await screen.findByRole('region', { name: 'Gợi ý cho bạn' });
    const card = (await within(section).findByRole('link', { name: /Dân ca Quan họ Bắc Ninh/ })).closest('li')!;
    expect(within(card).getByText('Vì bạn quan tâm đến Quần thể di tích Cố đô Huế')).toBeInTheDocument();
    const reasons = within(card).getByRole('list', { name: 'Điểm chung' });
    expect(within(reasons).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Cùng loại hình', 'Cùng vùng']);
    const second = within(section).getByRole('link', { name: /Khu Trung tâm Hoàng thành Thăng Long/ }).closest('li')!;
    expect(within(second).getByText('Cùng cấp xếp hạng')).toBeInTheDocument();
    expect(within(second).getByText('Cùng thời kỳ')).toBeInTheDocument();
  });

  it('lời gọi gợi ý mang mã thiết bị và ngôn ngữ; máy chủ gợi ý lỗi thì ẩn khối này mà trang vẫn dùng được', async () => {
    const calls = mockApi(
      (call) => (base(call.path) === '/public/guest/recommendations' ? envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Đã có lỗi xảy ra.' }) : undefined),
      withDetail(),
      publicApi(),
    );
    renderApp('/');
    await screen.findByRole('heading', { level: 2, name: 'Di sản nổi bật' });
    await waitFor(() => expect(calls.some((call) => base(call.path) === '/public/guest/recommendations')).toBe(true));
    expect(calls.find((call) => base(call.path) === '/public/guest/recommendations')!.deviceKey).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Gợi ý cho bạn' })).not.toBeInTheDocument(), { timeout: 4000 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  }, 10_000);

  it('hiện bằng ngôn ngữ đã chọn: tiếng Hàn', async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ko');
    const calls = mockApi(guestServer({ recommendations: personalizedOf([recommendationOf()]) }).handler, withDetail(), publicApi());
    renderApp('/');

    const section = await screen.findByRole('region', { name: '맞춤 추천' });
    expect(await within(section).findByText('Quần thể di tích Cố đô Huế에 관심이 있으셔서')).toBeInTheDocument();
    expect(within(section).getByText('같은 유형')).toBeInTheDocument();
    expect(new URL(`http://x${calls.find((call) => base(call.path) === '/public/guest/recommendations')!.path}`).searchParams.get('lang')).toBe('ko');
  });
});

describe('Gợi ý cho bạn — chi tiết di sản', () => {
  it('hỏi gợi ý sau khi chi tiết đã tải (lượt xem được ghi trước) và không gợi lại chính di sản đang xem', async () => {
    const server = guestServer({ recommendations: personalizedOf([recommendationOf({ heritage: HUE }), recommendationOf()]) });
    const calls = mockApi(server.handler, withDetail(), publicApi());
    renderApp(`/di-san/${HUE.slug}`);

    const section = await screen.findByRole('region', { name: 'Gợi ý cho bạn' });
    await within(section).findByRole('link', { name: /Dân ca Quan họ Bắc Ninh/ });
    expect(within(section).queryByRole('link', { name: /Quần thể di tích Cố đô Huế/ })).not.toBeInTheDocument();

    const order = calls.map((call) => base(call.path));
    expect(order.indexOf(`/public/heritages/${HUE.slug}`)).toBeLessThan(order.indexOf('/public/guest/recommendations'));
    expect(calls.find((call) => base(call.path) === `/public/heritages/${HUE.slug}`)!.deviceKey).toBeDefined();
  });

  it('học sinh xem chi tiết thì không có khối gợi ý của khách', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student), guestServer().handler, withDetail(), publicApi());
    renderApp(`/di-san/${HUE.slug}`);
    await screen.findByRole('heading', { level: 1, name: HUE.name });
    expect(screen.queryByRole('region', { name: 'Gợi ý cho bạn' })).not.toBeInTheDocument();
    expect(guestCalls(calls)).toEqual([]);
  });
});

describe('Gần bạn — trang chủ', () => {
  it('trình duyệt không hỗ trợ vị trí thì ẩn mục', async () => {
    openGuestHome();
    await screen.findByRole('region', { name: 'Gợi ý cho bạn' });
    expect(screen.queryByRole('region', { name: 'Gần bạn' })).not.toBeInTheDocument();
  });

  it('chưa hỏi quyền: chỉ có lời mời; bấm "Cho phép dùng vị trí" thì xin quyền, gửi tọa độ làm tròn trong thân yêu cầu rồi hiện danh sách kèm khoảng cách', async () => {
    const location = stubLocation({ permission: 'prompt', coords: { latitude: 16.46371, longitude: 107.59094 } });
    const server = guestServer();
    const { calls } = openGuestHome(server);
    const user = userEvent.setup();

    const section = await screen.findByRole('region', { name: 'Gần bạn' });
    expect(location.getCurrentPosition).not.toHaveBeenCalled();
    expect(calls.some((call) => base(call.path) === '/public/guest/nearby')).toBe(false);

    await user.click(within(section).getByRole('button', { name: 'Cho phép dùng vị trí' }));

    const first = await within(section).findByRole('link', { name: /Quần thể di tích Cố đô Huế/ });
    expect(within(first).queryByText('Cách 350 m') ?? within(first.closest('li')!).getByText('Cách 350 m')).toBeInTheDocument();
    expect(within(section).getByText('Cách 1,2 km')).toBeInTheDocument();

    const nearby = calls.find((call) => base(call.path) === '/public/guest/nearby')!;
    expect(nearby.method).toBe('POST');
    expect(nearby.body).toEqual({ latitude: 16.464, longitude: 107.591 });
    expect(nearby.path).not.toContain('16.46');
    expect(nearby.deviceKey).toBeUndefined();
    // Cờ nhớ lựa chọn được ghi (không kèm tọa độ).
    await waitFor(() => expect(server.state.device.locationAllowed).toBe(true));
    const flag = calls.find((call) => call.method === 'PUT' && base(call.path) === '/public/guest/device')!;
    expect(flag.body).toEqual({ locationAllowed: true });
    // Vị trí không bị lưu ở máy khách.
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('16.46');
  });

  it('khách đã bật từ lần trước và trình duyệt vẫn cho phép: danh sách hiện luôn, không có nút xin quyền', async () => {
    stubLocation({ permission: 'granted', coords: { latitude: 16.4637, longitude: 107.5909 } });
    const server = guestServer({ device: { ...guestServer().state.device, isRegistered: true, locationAllowed: true } });
    openGuestHome(server);

    const section = await screen.findByRole('region', { name: 'Gần bạn' });
    expect(await within(section).findByText('Cách 350 m')).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: 'Cho phép dùng vị trí' })).not.toBeInTheDocument();
  });

  it('khách không cho dùng vị trí thì ẩn cả mục và tắt cờ đã nhớ', async () => {
    stubLocation({ permission: 'prompt', deny: true });
    const server = guestServer({ device: { ...guestServer().state.device, isRegistered: true, locationAllowed: true } });
    openGuestHome(server);
    const user = userEvent.setup();

    const section = await screen.findByRole('region', { name: 'Gần bạn' });
    await user.click(within(section).getByRole('button', { name: 'Cho phép dùng vị trí' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Gần bạn' })).not.toBeInTheDocument());
    await waitFor(() => expect(server.state.device.locationAllowed).toBe(false));
  });

  it('trình duyệt đã chặn quyền từ trước thì không hiện mục này', async () => {
    stubLocation({ permission: 'denied' });
    openGuestHome();
    await screen.findByRole('region', { name: 'Gợi ý cho bạn' });
    expect(screen.queryByRole('region', { name: 'Gần bạn' })).not.toBeInTheDocument();
  });

  it('vị trí ngoài Việt Nam: báo bằng lời, không có danh sách', async () => {
    stubLocation({ permission: 'prompt', coords: { latitude: 35.68, longitude: 139.69 } });
    openGuestHome(guestServer({ nearby: nearbyOf({ items: [], unavailableReason: 'OUTSIDE_VIETNAM', message: 'Chưa dùng được "Gần bạn": bạn đang ở ngoài Việt Nam.' }) }));
    const user = userEvent.setup();

    const section = await screen.findByRole('region', { name: 'Gần bạn' });
    await user.click(within(section).getByRole('button', { name: 'Cho phép dùng vị trí' }));
    expect(await within(section).findByText('Chưa dùng được "Gần bạn": bạn đang ở ngoài Việt Nam.')).toBeInTheDocument();
    expect(within(section).queryAllByRole('link')).toHaveLength(0);
  });

  it('khoảng cách và chữ theo ngôn ngữ đang chọn (tiếng Anh dùng dấu chấm thập phân)', async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    stubLocation({ permission: 'granted', coords: { latitude: 16.4637, longitude: 107.5909 } });
    const server = guestServer({ device: { ...guestServer().state.device, isRegistered: true, locationAllowed: true } });
    mockApi(server.handler, withDetail(), publicApi());
    renderApp('/');

    const section = await screen.findByRole('region', { name: 'Near you' });
    expect(await within(section).findByText('350 m away')).toBeInTheDocument();
    expect(within(section).getByText('1.2 km away')).toBeInTheDocument();
  });

  it('"Tắt Gần bạn" xóa danh sách khỏi trang và tắt cờ', async () => {
    stubLocation({ permission: 'granted', coords: { latitude: 16.4637, longitude: 107.5909 } });
    const server = guestServer({ device: { ...guestServer().state.device, isRegistered: true, locationAllowed: true } });
    openGuestHome(server);
    const user = userEvent.setup();

    const section = await screen.findByRole('region', { name: 'Gần bạn' });
    await user.click(await within(section).findByRole('button', { name: 'Tắt Gần bạn' }));
    await waitFor(() => expect(server.state.device.locationAllowed).toBe(false));
    expect(within(section).queryByText('Cách 350 m')).not.toBeInTheDocument();
    expect(await within(section).findByRole('button', { name: 'Cho phép dùng vị trí' })).toBeInTheDocument();
  });
});

describe('Gần bạn — bản đồ', () => {
  it('khách bấm nút "Gần bạn": bản đồ nhận vị trí, bảng hiện di sản gần nhất kèm khoảng cách; chọn dòng thì mở ghim', async () => {
    stubLocation({ permission: 'prompt', coords: { latitude: 16.4637, longitude: 107.5909 } });
    const server = guestServer();
    mockApi(server.handler, publicApi());
    const user = userEvent.setup();
    renderApp('/ban-do');

    await screen.findByTestId('ban-do');
    expect(screen.getByTestId('ban-do')).toHaveAttribute('data-user', '');
    await user.click(await screen.findByRole('button', { name: 'Gần bạn' }));

    const panel = await screen.findByRole('region', { name: 'Gần bạn' });
    expect(await within(panel).findByText(/Quần thể di tích Cố đô Huế/)).toBeInTheDocument();
    expect(within(panel).getByText(/Cách 350 m/)).toBeInTheDocument();
    expect(screen.getByTestId('ban-do')).toHaveAttribute('data-user', '16.464,107.591');

    await user.click(within(panel).getByRole('button', { name: /Quần thể di tích Cố đô Huế/ }));
    expect(screen.getByTestId('ban-do')).toHaveAttribute('data-selected', HUE.slug);
  });

  it('khách đã chặn vị trí thì không có nút; học sinh đã đăng nhập cũng không có', async () => {
    stubLocation({ permission: 'denied' });
    mockApi(guestServer().handler, publicApi());
    renderApp('/ban-do');
    await screen.findByTestId('ban-do');
    expect(screen.queryByRole('button', { name: 'Gần bạn' })).not.toBeInTheDocument();
  });

  it('học sinh đã đăng nhập không có nút "Gần bạn" trên bản đồ', async () => {
    const student = studentOf(8);
    signInAs(student);
    stubLocation({ permission: 'prompt', coords: { latitude: 16.4637, longitude: 107.5909 } });
    mockApi(studentServer(student), guestServer().handler, publicApi());
    renderApp('/ban-do');
    await screen.findByTestId('ban-do');
    expect(screen.queryByRole('button', { name: 'Gần bạn' })).not.toBeInTheDocument();
  });
});

describe('thanh điều hướng của khách', () => {
  it('khách có mục "Lịch sử của tôi" dẫn tới trang lịch sử', async () => {
    openGuestHome();
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Lịch sử của tôi' })).toHaveAttribute('href', '/lich-su');
  });
});

describe('nghe thuyết minh được ghi vào lịch sử', () => {
  function installSpeech() {
    class FakeUtterance {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    const synth = {
      getVoices: () => [{ lang: 'vi-VN', name: 'Vietnamese' }],
      speak: vi.fn<(utterance: FakeUtterance) => void>(),
      cancel: vi.fn<() => void>(),
      pause: vi.fn<() => void>(),
      resume: vi.fn<() => void>(),
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  }

  const summary = {
    heritageId: 1,
    slug: HUE.slug,
    name: HUE.name,
    localization: { requestedLanguage: 'vi', language: 'vi', isFallback: false, isMachineTranslated: false },
    shortText: 'Kinh thành Huế khởi công năm 1805. Đây là trung tâm của triều Nguyễn.',
    detailedText: 'Đoạn chi tiết.',
  };
  const withSummary = () => (call: FetchCall) => (base(call.path) === `/public/heritages/${HUE.slug}/summary` ? envelope(200, { data: summary }) : undefined);

  it('khách bấm Phát lần đầu thì ghi một lượt "nghe" (chỉ một lần dù phát lại)', async () => {
    installSpeech();
    const server = guestServer();
    const calls = mockApi(server.handler, withSummary(), withDetail(), publicApi());
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Nghe' }));
    const dialog = await screen.findByRole('dialog');
    expect(server.state.activities).toEqual([]);
    await user.click(await within(dialog).findByRole('button', { name: 'Phát' }));

    await waitFor(() => expect(server.state.activities).toEqual([{ type: 'LISTEN', slug: HUE.slug }]));
    const record = calls.find((call) => call.method === 'POST' && base(call.path) === '/public/guest/activities')!;
    expect(record.deviceKey).toBeDefined();
    expect(new URL(`http://x${record.path}`).searchParams.get('lang')).toBe('vi');

    await user.click(within(dialog).getByRole('button', { name: 'Dừng' }));
    await user.click(within(dialog).getByRole('button', { name: 'Phát' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(server.state.activities).toHaveLength(1);
  });

  it('học sinh nghe thì không ghi gì', async () => {
    installSpeech();
    const student = studentOf(6);
    signInAs(student);
    const server = guestServer();
    mockApi(studentServer(student), server.handler, withSummary(), withDetail(), publicApi());
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Nghe' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: 'Phát' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(server.state.activities).toEqual([]);
  });
});
