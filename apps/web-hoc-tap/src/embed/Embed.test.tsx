import type { HeritagePin } from '@dsvhvn/dung-chung/api';
import { parseEmbedMessage } from '@dsvhvn/dung-chung/embed';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapOf, publicApi, THANG_LONG } from '../test/discoveryFixtures';
import { envelope, mockApi } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Hai trang nhúng cho app mobile: bản đồ và trình xem 3D. Trang không có thanh điều hướng, ngôn ngữ lấy từ địa chỉ, và nói chuyện với app bằng thông điệp
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
