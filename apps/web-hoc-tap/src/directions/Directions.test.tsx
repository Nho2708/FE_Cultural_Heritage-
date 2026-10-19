import type { FetchCall } from '@dsvhvn/dung-chung/testing';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detailOf, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Chỉ đường ở trang chi tiết di sản: bấm "Chỉ đường" mới xin vị trí của trình duyệt, gọi OSRM thẳng từ trình duyệt (không qua API của dự án), vẽ tuyến
// lên bản đồ nhỏ, tóm tắt, các bước theo ngôn ngữ, chọn cách đi, nút Google Maps ở mọi trạng thái; các trường hợp từ chối quyền, không lấy được vị trí,
// ngoài Việt Nam, không có đường, dịch vụ lỗi; mở từ thẻ trên bản đồ thì bảng mở sẵn.

interface FakeMapProps {
  route: { distanceMeters: number; coordinates: unknown[] } | null;
  startLabel?: string;
}

vi.mock('../discovery/LocationMap', () => ({
  default: ({ route, startLabel }: FakeMapProps) => <div data-testid="ban-do-nho">{route ? `tuyến ${route.coordinates.length} điểm · ${startLabel}` : 'chưa có tuyến'}</div>,
}));

const HOAN_KIEM = { latitude: 21.0287, longitude: 105.8524 };

function osrmOk() {
  return {
    code: 'Ok',
    waypoints: [{ distance: 12 }, { distance: 30 }],
    routes: [
      {
        distance: 2313.1,
        duration: 248.7,
        geometry: { coordinates: [[105.8514, 21.0288], [105.8459, 21.0266], [105.8407, 21.0351]] },
        legs: [
          {
            steps: [
              { name: 'Phố Lê Thái Tổ', distance: 325.4, duration: 33.4, maneuver: { type: 'depart', modifier: 'left', bearing_after: 191 } },
              { name: 'Phố Tràng Thi', distance: 866.8, duration: 73.2, maneuver: { type: 'turn', modifier: 'sharp right', bearing_after: 286 } },
              { name: '', distance: 0, duration: 0, maneuver: { type: 'arrive', modifier: 'left', bearing_after: 0 } },
            ],
          },
        ],
      },
    ],
  };
}

function osrmWalking() {
  const body = osrmOk();
  body.routes[0]!.distance = 2366.9;
  body.routes[0]!.duration = 1905.5;
  return body;
}

/** API của dự án + máy chủ OSRM giả (đường dẫn `/routed-car|routed-foot/...`). */
function detailAndOsrm(osrm: (call: FetchCall) => Response | undefined = (call) => new Response(JSON.stringify(call.path.startsWith('/routed-foot') ? osrmWalking() : osrmOk()), { status: 200 })) {
  const detail = detailOf();
  return mockApi(
    (call) => (call.path.startsWith('/routed-') ? osrm(call) : undefined),
    (call) => (call.path.split('?')[0] === `/public/heritages/${detail.slug}` ? envelope(200, { data: detail }) : undefined),
    publicApi(),
  );
}

type GeoSuccess = (position: { coords: { latitude: number; longitude: number } }) => void;
type GeoError = (error: { code: number; PERMISSION_DENIED: number }) => void;

/** Geolocation giả của trình duyệt: `answer` quyết định trả vị trí hay lỗi. */
function mockGeolocation(answer: (success: GeoSuccess, error: GeoError) => void) {
  const getCurrentPosition = vi.fn((success: GeoSuccess, error: GeoError) => answer(success, error));
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
  return getCurrentPosition;
}

const grant = (position = HOAN_KIEM) => mockGeolocation((success) => success({ coords: position }));
const deny = () => mockGeolocation((_success, error) => error({ code: 1, PERMISSION_DENIED: 1 }));
const timeout = () => mockGeolocation((_success, error) => error({ code: 3, PERMISSION_DENIED: 1 }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  delete (navigator as { geolocation?: unknown }).geolocation;
});

const osrmCalls = (calls: FetchCall[]) => calls.filter((call) => call.path.startsWith('/routed-'));

describe('Chỉ đường ở trang chi tiết', () => {
  it('chưa bấm thì không xin vị trí, không gọi máy chủ tính đường; bấm thì xin vị trí, gọi OSRM thẳng và hiện tuyến, tóm tắt, các bước', async () => {
    const calls = detailAndOsrm();
    const geolocation = grant();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    const location = await screen.findByRole('region', { name: 'Vị trí trên bản đồ' });
    expect(geolocation).not.toHaveBeenCalled();
    expect(osrmCalls(calls)).toHaveLength(0);
    expect(within(location).queryByRole('region', { name: 'Chỉ đường tới di sản' })).not.toBeInTheDocument();

    await user.click(within(location).getByRole('button', { name: 'Chỉ đường' }));

    const panel = await within(location).findByRole('region', { name: 'Chỉ đường tới di sản' });
    expect(geolocation).toHaveBeenCalledTimes(1);
    expect(await within(panel).findByText('2,3 km · khoảng 4 phút')).toBeInTheDocument();
    expect(within(panel).getByText('Ước tính cho xe máy, ô tô theo đường bộ.')).toBeInTheDocument();
    const steps = within(panel).getByRole('list', { name: 'Các bước' });
    const items = within(steps).getAllByRole('listitem').map((item) => item.textContent);
    expect(items[0]).toContain('Xuất phát về hướng nam trên Phố Lê Thái Tổ');
    expect(items[0]).toContain('Đi 325 m');
    expect(items[1]).toContain('Rẽ gắt sang phải vào Phố Tràng Thi');
    expect(items[2]).toContain('Đến nơi, di sản ở bên trái · Quần thể di tích Cố đô Huế');
    expect(within(location).getByTestId('ban-do-nho')).toHaveTextContent('tuyến 3 điểm · Vị trí của bạn');

    // Gọi thẳng máy chủ OSRM với tọa độ đã lấy; không yêu cầu nào tới API của dự án mang tọa độ.
    const osrm = osrmCalls(calls);
    expect(osrm).toHaveLength(1);
    expect(osrm[0]!.path).toBe('/routed-car/route/v1/driving/105.8524,21.0287;107.5778,16.4694?overview=full&geometries=geojson&steps=true');
    expect(osrm[0]!.authorization).toBeUndefined();
    expect(osrm[0]!.deviceKey).toBeUndefined();
    expect(calls.filter((call) => !call.path.startsWith('/routed-')).some((call) => call.path.includes('21.0287') || JSON.stringify(call.body ?? '').includes('21.0287'))).toBe(false);

    expect(within(panel).getByText('Chỉ đường: OSRM · dữ liệu © những người đóng góp OpenStreetMap')).toBeInTheDocument();
    expect(within(panel).getByText('Vị trí của bạn chỉ dùng để tính đường và không được lưu.')).toBeInTheDocument();
    const maps = within(panel).getByRole('link', { name: 'Mở trong Google Maps' });
    expect(maps).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=16.4694%2C107.5778&travelmode=driving&origin=21.0287%2C105.8524');
    expect(maps).toHaveAttribute('target', '_blank');
    expect(maps).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('chọn "Đi bộ" thì hỏi hồ sơ đi bộ một lần, nhớ kết quả khi chọn lại; Google Maps đổi cách đi', async () => {
    const calls = detailAndOsrm();
    grant();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Chỉ đường' }));
    const panel = await screen.findByRole('region', { name: 'Chỉ đường tới di sản' });
    await within(panel).findByText('2,3 km · khoảng 4 phút');

    await user.click(within(panel).getByRole('button', { name: 'Đi bộ' }));
    expect(await within(panel).findByText('2,4 km · khoảng 32 phút')).toBeInTheDocument();
    expect(within(panel).getByText('Ước tính cho người đi bộ.')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Đi bộ' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByRole('link', { name: 'Mở trong Google Maps' })).toHaveAttribute('href', expect.stringContaining('travelmode=walking'));

    await user.click(within(panel).getByRole('button', { name: 'Đi xe' }));
    expect(await within(panel).findByText('2,3 km · khoảng 4 phút')).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Đi bộ' }));
    expect(await within(panel).findByText('2,4 km · khoảng 32 phút')).toBeInTheDocument();
    expect(osrmCalls(calls).map((call) => call.path.split('/')[1])).toEqual(['routed-car', 'routed-foot']);
  });

  it('trình duyệt chặn quyền vị trí: báo rõ, có thử lại và vẫn mở được Google Maps (không có điểm xuất phát)', async () => {
    const calls = detailAndOsrm();
    deny();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Chỉ đường' }));
    const panel = await screen.findByRole('region', { name: 'Chỉ đường tới di sản' });
    expect(await within(panel).findByText(/Trình duyệt đang chặn quyền vị trí/)).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Mở trong Google Maps' })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=16.4694%2C107.5778&travelmode=driving');
    expect(osrmCalls(calls)).toHaveLength(0);
  });

  it('không xác định được vị trí (hết giờ) thì báo và thử lại được', async () => {
    detailAndOsrm();
    const geolocation = timeout();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Chỉ đường' }));
    const panel = await screen.findByRole('region', { name: 'Chỉ đường tới di sản' });
    expect(await within(panel).findByText(/Không xác định được vị trí của bạn/)).toBeInTheDocument();
    grant();
    await user.click(within(panel).getByRole('button', { name: 'Thử lại' }));
    expect(await within(panel).findByText('2,3 km · khoảng 4 phút')).toBeInTheDocument();
    expect(geolocation).toHaveBeenCalledTimes(1);
  });

  it('ở ngoài Việt Nam thì không hỏi máy chủ và báo mở Google Maps', async () => {
    const calls = detailAndOsrm();
    grant({ latitude: 1.3521, longitude: 103.8198 });
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Chỉ đường' }));
    const panel = await screen.findByRole('region', { name: 'Chỉ đường tới di sản' });
    expect(await within(panel).findByText(/Bạn đang ở ngoài Việt Nam/)).toBeInTheDocument();
    expect(osrmCalls(calls)).toHaveLength(0);
    expect(within(panel).queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('không tìm được đường (di sản trên đảo) và dịch vụ lỗi: câu riêng, dịch vụ lỗi thì thử lại được', async () => {
    let fail = true;
    const calls = detailAndOsrm((call) => {
      if (call.path.startsWith('/routed-foot')) return new Response(JSON.stringify({ code: 'NoRoute', message: 'Impossible route.' }), { status: 400 });
      return fail ? new Response('Bad Gateway', { status: 502 }) : new Response(JSON.stringify(osrmOk()), { status: 200 });
    });
    grant();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Chỉ đường' }));
    const panel = await screen.findByRole('region', { name: 'Chỉ đường tới di sản' });
    expect(await within(panel).findByText(/Dịch vụ tính đường đang gặp lỗi/)).toBeInTheDocument();
    fail = false;
    await user.click(within(panel).getByRole('button', { name: 'Thử lại' }));
    expect(await within(panel).findByText('2,3 km · khoảng 4 phút')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Đi bộ' }));
    expect(await within(panel).findByText(/Không tìm được đường bộ tới di sản này/)).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
    expect(osrmCalls(calls)).toHaveLength(3);
  });

  it('mở từ thẻ trên bản đồ (?chi-duong=1): bảng mở sẵn, trang cuộn tới và bắt đầu chỉ đường ngay; nút ẩn đóng bảng', async () => {
    detailAndOsrm();
    const geolocation = grant();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}?chi-duong=1`);

    const panel = await screen.findByRole('region', { name: 'Chỉ đường tới di sản' });
    await waitFor(() => expect(geolocation).toHaveBeenCalledTimes(1));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(await within(panel).findByText('2,3 km · khoảng 4 phút')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Ẩn chỉ đường' }));
    expect(screen.queryByRole('region', { name: 'Chỉ đường tới di sản' })).not.toBeInTheDocument();
    expect(screen.getByTestId('ban-do-nho')).toHaveTextContent('chưa có tuyến');
  });

  it('các bước theo ngôn ngữ giao diện (tiếng Anh)', async () => {
    detailAndOsrm();
    grant();
    const user = userEvent.setup();
    localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', 'en');
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Directions' }));
    const panel = await screen.findByRole('region', { name: 'Directions to this site' });
    expect(await within(panel).findByText('2.3 km · about 4 min')).toBeInTheDocument();
    const items = within(within(panel).getByRole('list', { name: 'Steps' })).getAllByRole('listitem').map((item) => item.textContent);
    expect(items[0]).toContain('Head south on Phố Lê Thái Tổ');
    expect(items[1]).toContain('Make a sharp right onto Phố Tràng Thi');
    expect(within(panel).getByText('Directions: OSRM · data © OpenStreetMap contributors')).toBeInTheDocument();
    localStorage.removeItem('dsvhvn.hoc-tap.ngon-ngu');
  });
});
