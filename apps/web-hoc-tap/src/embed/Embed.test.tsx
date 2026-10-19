import type { HeritagePin } from '@dsvhvn/dung-chung/api';
import { parseEmbedMessage } from '@dsvhvn/dung-chung/embed';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detailOf, HUE, mapOf, publicApi, THANG_LONG } from '../test/discoveryFixtures';
import { envelope, mockApi } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Các trang nhúng cho app mobile: bản đồ, trình xem 3D và chỉ đường. Trang không có thanh điều hướng, ngôn ngữ lấy từ địa chỉ, và nói chuyện với app bằng thông điệp
// theo hợp đồng của gói dùng chung. Bản đồ thật (Leaflet) và trình xem thật (WebGL) được thay bằng khung giả; bản thật chạy ở smoke test.

interface FakeMapProps {
  pins: HeritagePin[];
  selectedSlug: string | null;
  renderPopup: (pin: HeritagePin) => ReactNode;
  onSelect: (slug: string | null) => void;
}

vi.mock('../discovery/HeritageMap', () => ({
  default: ({ pins, selectedSlug, renderPopup, onSelect }: FakeMapProps) => (
    <div data-testid="ban-do">
      {pins.map((pin) => (
        <button key={pin.slug} type="button" onClick={() => onSelect(pin.slug)}>{`Ghim ${pin.name}`}</button>
      ))}
      {pins.filter((pin) => pin.slug === selectedSlug).map((pin) => <div key={pin.slug}>{renderPopup(pin)}</div>)}
    </div>
  ),
}));

vi.mock('../discovery/LocationMap', () => ({
  default: ({ route }: { route: { coordinates: unknown[] } | null }) => <div data-testid="ban-do-nho">{route ? `tuyến ${route.coordinates.length} điểm` : 'chưa có tuyến'}</div>,
}));

vi.mock('@dsvhvn/dung-chung/model3d', async () => {
  const { createElement } = await import('react');
  return {
    ModelViewer: ({ src, onLoaded, onProgress, onFailure }: { src: string; onLoaded?: () => void; onProgress?: (fraction: number) => void; onFailure?: (reason: 'unsupported' | 'load-error') => void }) =>
      createElement(
        'div',
        { 'data-testid': 'trinh-xem', 'data-src': src },
        createElement('button', { type: 'button', onClick: () => onProgress?.(0.5) }, 'Tiến trình'),
        createElement('button', { type: 'button', onClick: () => onLoaded?.() }, 'Tải xong'),
        createElement('button', { type: 'button', onClick: () => onFailure?.('unsupported') }, 'Không hỗ trợ'),
      ),
  };
});

/** Bắt các thông điệp gửi cho app (WebView) qua cầu `ReactNativeWebView`. */
function mockNativeBridge() {
  const sent: string[] = [];
  (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = { postMessage: (data: string) => void sent.push(data) };
  return () => sent.map((raw) => parseEmbedMessage(raw));
}

afterEach(() => {
  delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
});

describe('Trang bản đồ nhúng', () => {
  it('không có thanh điều hướng, báo sẵn sàng cho app và gửi bộ lọc từ địa chỉ', async () => {
    const messages = mockNativeBridge();
    const calls = mockApi(publicApi());
    renderApp(`/nhung/ban-do?lang=en&vung=${encodeURIComponent('Trung')}&loai=TANGIBLE`);

    await screen.findByTestId('ban-do');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    await waitFor(() => expect(messages()).toContainEqual({ type: 'ready', version: 1 }));
    const call = calls.find((item) => item.path.startsWith('/public/heritages/map'))!;
    const query = new URL(`http://x${call.path}`).searchParams;
    expect(query.get('region')).toBe('Trung');
    expect(query.get('heritageType')).toBe('TANGIBLE');
    expect(query.get('lang')).toBe('en');
    expect(screen.getByTestId('ban-do').closest('[lang]')).toHaveAttribute('lang', 'en');
  });

  it('bấm ghim rồi "Xem chi tiết" thì gửi thông điệp chọn ghim cho app', async () => {
    const messages = mockNativeBridge();
    mockApi(publicApi());
    const user = userEvent.setup();
    renderApp('/nhung/ban-do');

    await user.click(await screen.findByRole('button', { name: /Ghim Quần thể di tích Cố đô Huế/ }));
    await user.click(await screen.findByRole('button', { name: 'Xem chi tiết' }));

    expect(messages()).toContainEqual({ type: 'pin-selected', version: 1, slug: 'quan-the-di-tich-co-do-hue' });
  });

  it('ghim có dòng thời gian thì thẻ có nút mở dòng thời gian và gửi thông điệp cho app', async () => {
    const messages = mockNativeBridge();
    mockApi(publicApi());
    const user = userEvent.setup();
    renderApp('/nhung/ban-do');

    await user.click(await screen.findByRole('button', { name: /Ghim Quần thể di tích Cố đô Huế/ }));
    await user.click(await screen.findByRole('button', { name: 'Mở dòng thời gian' }));

    expect(messages()).toContainEqual({ type: 'timeline-selected', version: 1, slug: 'quan-the-di-tich-co-do-hue' });
  });

  it('bấm "Chỉ đường" trên thẻ thì gửi thông điệp để app mở màn hình chỉ đường, không xin vị trí ở trang này', async () => {
    const messages = mockNativeBridge();
    mockApi(publicApi());
    const user = userEvent.setup();
    renderApp('/nhung/ban-do');

    await user.click(await screen.findByRole('button', { name: /Ghim Quần thể di tích Cố đô Huế/ }));
    await user.click(await screen.findByRole('button', { name: 'Chỉ đường' }));

    expect(messages()).toContainEqual({ type: 'directions-selected', version: 1, slug: 'quan-the-di-tich-co-do-hue' });
  });

  it('nhận lệnh đổi bộ lọc đủ tỉnh, cấp xếp hạng, thời kỳ và hỏi lại ghim theo bộ lọc mới', async () => {
    mockNativeBridge();
    const calls = mockApi(publicApi());
    renderApp('/nhung/ban-do');
    await screen.findByTestId('ban-do');

    window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'set-filter', version: 1, filter: { provinceId: 29, recognitionLevel: 'UNESCO', period: 'MODERN' } }) }));

    await waitFor(() => {
      const call = calls.filter((item) => item.path.startsWith('/public/heritages/map')).at(-1)!;
      const query = new URL(`http://x${call.path}`).searchParams;
      expect(query.get('provinceId')).toBe('29');
      expect(query.get('recognitionLevel')).toBe('UNESCO');
      expect(query.get('period')).toBe('MODERN');
    });
  });

  it('bộ lọc đủ tỉnh, cấp xếp hạng và thời kỳ cũng đọc được từ địa chỉ', async () => {
    mockNativeBridge();
    const calls = mockApi(publicApi());
    renderApp('/nhung/ban-do?tinh=29&cap=NATIONAL&thoi-ky=MODERN');
    await screen.findByTestId('ban-do');

    const call = calls.find((item) => item.path.startsWith('/public/heritages/map'))!;
    const query = new URL(`http://x${call.path}`).searchParams;
    expect(query.get('provinceId')).toBe('29');
    expect(query.get('recognitionLevel')).toBe('NATIONAL');
    expect(query.get('period')).toBe('MODERN');
  });

  it('làm nổi ghim theo tham số chọn và nhận lệnh từ app', async () => {
    mockNativeBridge();
    mockApi(publicApi({ '/public/heritages/map': () => envelope(200, { data: mapOf() }) }));
    renderApp(`/nhung/ban-do?chon=${THANG_LONG.slug}`);

    expect(await screen.findByRole('button', { name: 'Xem chi tiết' })).toBeInTheDocument();
    window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'focus', version: 1, slug: 'quan-the-di-tich-co-do-hue' }) }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })).toHaveLength(1));
  });
});

describe('Trang xem 3D nhúng', () => {
  const MODEL = {
    id: 1,
    title: 'Cổng Ngọ Môn',
    fileUrl: 'https://files.test/ngo-mon.glb',
    contentType: 'model/gltf-binary',
    fileSizeBytes: 1_000_000,
    posterUrl: null,
    author: 'An',
    license: 'CC BY 4.0',
    licenseUrl: null,
    sourceUrl: null,
    credit: 'An · CC BY 4.0',
  };

  it('dựng trình xem và báo tiến trình, tải xong, thiết bị không hỗ trợ cho app', async () => {
    const messages = mockNativeBridge();
    mockApi((call) => (call.path === '/public/heritages/hue/model' ? envelope(200, { data: MODEL }) : envelope(404, { errorCode: 'NOT_FOUND', message: 'x' })));
    const user = userEvent.setup();
    renderApp('/nhung/3d/hue?lang=ko');

    expect(await screen.findByTestId('trinh-xem')).toHaveAttribute('data-src', 'https://files.test/ngo-mon.glb');
    await user.click(screen.getByRole('button', { name: 'Tiến trình' }));
    await user.click(screen.getByRole('button', { name: 'Tải xong' }));
    await user.click(screen.getByRole('button', { name: 'Không hỗ trợ' }));

    expect(messages()).toEqual([
      { type: 'model-progress', version: 1, fraction: 0.5 },
      { type: 'model-loaded', version: 1 },
      { type: 'model-error', version: 1, reason: 'webgl' },
    ]);
  });

  it('di sản không có mô hình thì báo lỗi cho app để quay về bộ ảnh', async () => {
    const messages = mockNativeBridge();
    mockApi(() => envelope(404, { errorCode: 'MODEL_UNAVAILABLE', message: 'Không tải được mô hình 3D.' }));
    renderApp('/nhung/3d/khong-co');

    await waitFor(() => expect(messages()).toContainEqual({ type: 'model-error', version: 1, reason: 'load' }));
    expect(screen.queryByTestId('trinh-xem')).not.toBeInTheDocument();
  });
});

describe('Trang chỉ đường nhúng', () => {
  const OSRM = {
    code: 'Ok',
    waypoints: [{ distance: 12 }, { distance: 30 }],
    routes: [
      {
        distance: 2313.1,
        duration: 248.7,
        geometry: { coordinates: [[105.8514, 21.0288], [105.8407, 21.0351]] },
        legs: [{ steps: [{ name: 'Phố Lê Thái Tổ', distance: 325.4, duration: 33.4, maneuver: { type: 'depart', modifier: 'left', bearing_after: 191 } }, { name: '', distance: 0, duration: 0, maneuver: { type: 'arrive', modifier: 'right', bearing_after: 0 } }] }],
      },
    ],
  };

  function directionsApi() {
    const detail = detailOf();
    return mockApi(
      (call) => (call.path.startsWith('/routed-') ? new Response(JSON.stringify(OSRM), { status: 200 }) : undefined),
      (call) => (call.path.split('?')[0] === `/public/heritages/${detail.slug}` ? envelope(200, { data: detail }) : undefined),
      publicApi(),
    );
  }

  it('báo sẵn sàng khi có tọa độ di sản, chờ vị trí từ app rồi mới gọi OSRM; không tự xin vị trí của trình duyệt', async () => {
    const messages = mockNativeBridge();
    const calls = directionsApi();
    const getCurrentPosition = vi.fn<() => void>();
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
    renderApp(`/nhung/chi-duong/${HUE.slug}?lang=en`);

    const panel = await screen.findByRole('region', { name: 'Directions to this site' });
    await waitFor(() => expect(messages()).toContainEqual({ type: 'ready', version: 1 }));
    expect(within(panel).getByText('Waiting for your location from the app…')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(calls.filter((call) => call.path.startsWith('/routed-'))).toHaveLength(0);

    window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'set-position', version: 1, position: { latitude: 21.0287, longitude: 105.8524 } }) }));

    expect(await within(panel).findByText('2.3 km · about 4 min')).toBeInTheDocument();
    expect(within(panel).getByText('Head south on Phố Lê Thái Tổ')).toBeInTheDocument();
    expect(screen.getByTestId('ban-do-nho')).toHaveTextContent('tuyến 2 điểm');
    expect(within(panel).getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute('href', expect.stringContaining('origin=21.0287%2C105.8524'));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(calls.filter((call) => call.path.startsWith('/routed-'))).toHaveLength(1);
    delete (navigator as { geolocation?: unknown }).geolocation;
  });

  it('di sản không có thì báo không tìm thấy', async () => {
    mockNativeBridge();
    mockApi(() => envelope(404, { errorCode: 'BLOCKED', message: 'Không tìm thấy di sản.' }));
    renderApp('/nhung/chi-duong/khong-co');

    expect(await screen.findByText('Không tìm thấy di sản này')).toBeInTheDocument();
  });
});
