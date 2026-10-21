import { describe, expect, it, vi } from 'vitest';
import { fetchRoute, formatRouteDistance, formatRouteDuration, googleMapsDirectionsUrl, isInsideVietnam, parseRouteResponse, RouteError, routeRequestUrl, SNAP_LIMIT_METERS } from './route';

// Chỉ đường bằng OSRM: dựng địa chỉ, đọc phản hồi (tuyến, bước, điểm bị nắn quá xa), phân loại lỗi, địa chỉ Google Maps và định dạng theo ngôn ngữ.

const HOAN_KIEM = { latitude: 21.0287, longitude: 105.8524 };
const THANG_LONG = { latitude: 21.0352, longitude: 105.8402 };

/** Lý do của RouteError mà hàm ném ra, hoặc null nếu không ném. */
function reasonOf(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    return error instanceof RouteError ? error.reason : 'khác';
  }
}

function okBody(overrides: Record<string, unknown> = {}) {
  return {
    code: 'Ok',
    waypoints: [
      { distance: 104.9, name: 'Phố Lê Thái Tổ', location: [105.8514, 21.0288] },
      { distance: 49.7, name: '', location: [105.8407, 21.0351] },
    ],
    routes: [
      {
        distance: 2313.1,
        duration: 248.7,
        geometry: { type: 'LineString', coordinates: [[105.8514, 21.0288], [105.8459, 21.0266], [105.8407, 21.0351]] },
        legs: [
          {
            steps: [
              { name: 'Phố Lê Thái Tổ', ref: null, distance: 325.4, duration: 33.4, maneuver: { type: 'depart', modifier: 'left', bearing_after: 191 } },
              { name: 'Đường Đỗ Mười', ref: 'QL.1; CT.01', distance: 866.8, duration: 73.2, maneuver: { type: 'turn', modifier: 'sharp right', bearing_after: 286 } },
              { name: '', ref: null, distance: 12, duration: 5, maneuver: { type: 'rotary', modifier: 'right', exit: 2, bearing_after: 10 } },
              { name: 'Lạ', distance: 3, duration: 1, maneuver: { type: 'kiểu mới', modifier: 'hướng lạ', bearing_after: 10 } },
              { name: '', ref: null, distance: 0, duration: 0, maneuver: { type: 'arrive', modifier: 'left', bearing_after: 0 } },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('địa chỉ gọi OSRM', () => {
  it('kinh độ trước vĩ độ, hồ sơ theo cách đi, lấy đường đi đầy đủ kèm các bước', () => {
    expect(routeRequestUrl('https://routing.openstreetmap.de/', 'driving', HOAN_KIEM, THANG_LONG)).toBe(
      'https://routing.openstreetmap.de/routed-car/route/v1/driving/105.8524,21.0287;105.8402,21.0352?overview=full&geometries=geojson&steps=true',
    );
    expect(routeRequestUrl('http://osrm.test', 'walking', HOAN_KIEM, THANG_LONG)).toContain('/routed-foot/route/v1/driving/');
  });

  it('vị trí trong và ngoài khung tọa độ Việt Nam', () => {
    expect(isInsideVietnam(HOAN_KIEM)).toBe(true);
    expect(isInsideVietnam({ latitude: 16.5, longitude: 111.6 })).toBe(true);
    expect(isInsideVietnam({ latitude: 1.35, longitude: 103.82 })).toBe(false);
    expect(isInsideVietnam({ latitude: 37.57, longitude: 126.98 })).toBe(false);
  });
});

describe('đọc phản hồi', () => {
  it('đường đi đổi sang [vĩ độ, kinh độ], bước có tên đường, số hiệu đầu tiên, lối ra vòng xuyến; loại lạ thành rẽ', () => {
    const route = parseRouteResponse(okBody(), 'driving', HOAN_KIEM, THANG_LONG);
    expect(route.mode).toBe('driving');
    expect(route.distanceMeters).toBe(2313.1);
    expect(route.durationSeconds).toBe(248.7);
    expect(route.coordinates).toEqual([
      [21.0288, 105.8514],
      [21.0266, 105.8459],
      [21.0351, 105.8407],
    ]);
    expect(route.origin).toEqual(HOAN_KIEM);
    expect(route.destination).toEqual(THANG_LONG);
    expect(route.steps.map((step) => [step.type, step.modifier, step.name, step.ref, step.exit])).toEqual([
      ['depart', 'left', 'Phố Lê Thái Tổ', null, null],
      ['turn', 'sharp right', 'Đường Đỗ Mười', 'QL.1', null],
      ['rotary', 'right', '', null, 2],
      ['turn', null, 'Lạ', null, null],
      ['arrive', 'left', '', null, null],
    ]);
    expect(route.steps[0]?.bearingAfter).toBe(191);
  });

  it('không có đường: mã NoRoute, hoặc điểm bị nắn về đường quá xa (di sản trên đảo)', () => {
    expect(() => parseRouteResponse({ code: 'NoRoute', message: 'Impossible route.' }, 'driving', HOAN_KIEM, THANG_LONG)).toThrow(RouteError);
    expect(reasonOf(() => parseRouteResponse({ code: 'NoRoute' }, 'driving', HOAN_KIEM, THANG_LONG))).toBe('no-route');
    const snapped = okBody({ waypoints: [{ distance: 20 }, { distance: SNAP_LIMIT_METERS + 1 }] });
    expect(() => parseRouteResponse(snapped, 'driving', HOAN_KIEM, THANG_LONG)).toThrow(/no-route/);
  });

  it('máy chủ lỗi: mã khác, thân sai khuôn, không có đường đi', () => {
    expect(reasonOf(() => parseRouteResponse({ code: 'InvalidQuery' }, 'walking', HOAN_KIEM, THANG_LONG))).toBe('service');
    expect(reasonOf(() => parseRouteResponse(null, 'walking', HOAN_KIEM, THANG_LONG))).toBe('service');
    expect(reasonOf(() => parseRouteResponse('x', 'walking', HOAN_KIEM, THANG_LONG))).toBe('service');
    expect(reasonOf(() => parseRouteResponse({ code: 'Ok', routes: [] }, 'walking', HOAN_KIEM, THANG_LONG))).toBe('service');
    expect(reasonOf(() => parseRouteResponse({ code: 'Ok', routes: [{ geometry: { coordinates: [[1, 2]] } }] }, 'walking', HOAN_KIEM, THANG_LONG))).toBe('no-route');
  });

  it('fetchRoute: gọi đúng địa chỉ, đọc JSON cả khi mã HTTP 400 có code, lỗi mạng thành network', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(okBody()), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const route = await fetchRoute({ mode: 'walking', from: HOAN_KIEM, to: THANG_LONG, baseUrl: 'http://osrm.test', fetchImpl });
    expect(route.steps).toHaveLength(5);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('http://osrm.test/routed-foot/route/v1/driving/105.8524,21.0287;105.8402,21.0352?overview=full&geometries=geojson&steps=true');

    const noRoute = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ code: 'NoRoute', message: 'x' }), { status: 400 }));
    await expect(fetchRoute({ mode: 'driving', from: HOAN_KIEM, to: THANG_LONG, fetchImpl: noRoute })).rejects.toMatchObject({ reason: 'no-route' });

    const down = vi.fn<typeof fetch>(async () => new Response('Bad Gateway', { status: 502 }));
    await expect(fetchRoute({ mode: 'driving', from: HOAN_KIEM, to: THANG_LONG, fetchImpl: down })).rejects.toMatchObject({ reason: 'service' });

    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchRoute({ mode: 'driving', from: HOAN_KIEM, to: THANG_LONG, fetchImpl: offline })).rejects.toMatchObject({ reason: 'network' });

    const aborted = vi.fn<typeof fetch>(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    });
    await expect(fetchRoute({ mode: 'driving', from: HOAN_KIEM, to: THANG_LONG, fetchImpl: aborted })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('Google Maps và định dạng', () => {
  it('địa chỉ chỉ đường Google Maps có đích, cách đi và điểm xuất phát khi đã có vị trí', () => {
    expect(googleMapsDirectionsUrl({ destination: THANG_LONG, mode: 'driving' })).toBe('https://www.google.com/maps/dir/?api=1&destination=21.0352%2C105.8402&travelmode=driving');
    expect(googleMapsDirectionsUrl({ destination: THANG_LONG, mode: 'walking', origin: HOAN_KIEM })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=21.0352%2C105.8402&travelmode=walking&origin=21.0287%2C105.8524',
    );
  });

  it('khoảng cách theo ngôn ngữ', () => {
    expect(formatRouteDistance(850.4, 'vi')).toBe('850 m');
    expect(formatRouteDistance(12_345, 'vi')).toBe('12,3 km');
    expect(formatRouteDistance(12_345, 'en')).toBe('12.3 km');
    expect(formatRouteDistance(1_494_207, 'vi')).toBe('1.494 km');
    expect(formatRouteDistance(1_494_207, 'en')).toBe('1,494 km');
  });

  it('thời gian đi theo ngôn ngữ, làm tròn phút', () => {
    expect(formatRouteDuration(248.7, 'vi')).toBe('4 phút');
    expect(formatRouteDuration(20, 'vi')).toBe('1 phút');
    expect(formatRouteDuration(9300, 'vi')).toBe('2 giờ 35 phút');
    expect(formatRouteDuration(7200, 'en')).toBe('2 hr');
    expect(formatRouteDuration(9300, 'ko')).toBe('2시간 35분');
    expect(formatRouteDuration(9300, 'zh-Hans')).toBe('2小时35分钟');
    expect(formatRouteDuration(9300, 'ja')).toContain('時間');
  });
});
