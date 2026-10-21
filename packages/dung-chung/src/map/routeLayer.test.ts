import { beforeAll, describe, expect, it } from 'vitest';
import { createBaseMap, loadLeaflet } from './leafletBase';
import type { Route } from './route';
import { drawRoute, ROUTE_PANE } from './routeLayer';

// Lớp vẽ tuyến: nằm trong lớp riêng trên lớp phủ mặc định, không nhận chuột, có chấm xuất phát chữ thuần, khớp khung nhìn theo tuyến và gỡ sạch khi bỏ.

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, 'createSVGRect', { value: () => ({}), configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 360, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 220, configurable: true });
});

const ROUTE: Route = {
  mode: 'driving',
  distanceMeters: 2313,
  durationSeconds: 249,
  coordinates: [
    [21.0288, 105.8514],
    [21.0266, 105.8459],
    [21.0351, 105.8407],
  ],
  steps: [],
  origin: { latitude: 21.0287, longitude: 105.8524 },
  destination: { latitude: 21.0352, longitude: 105.8402 },
};

describe('vẽ tuyến đường', () => {
  it('đặt tuyến và chấm xuất phát vào lớp riêng, căn khung theo tuyến, gỡ được', async () => {
    const L = await loadLeaflet();
    const element = document.createElement('div');
    document.body.append(element);
    const map = createBaseMap(L, element);
    map.setView([16, 107], 5);

    const layer = drawRoute(L, map, ROUTE, { startLabel: '<b>Vị trí của bạn</b>' });

    const pane = map.getPane(ROUTE_PANE)!;
    expect(pane.style.zIndex).toBe('420');
    expect(pane.style.pointerEvents).toBe('none');
    expect(pane.querySelector('.dsv-route-line')).not.toBeNull();
    expect(pane.querySelector('.dsv-route-casing')).not.toBeNull();
    expect(pane.querySelector('.dsv-route-start')).not.toBeNull();
    expect(element.querySelector('.leaflet-tooltip')?.textContent).toBe('<b>Vị trí của bạn</b>');
    expect(element.querySelector('.leaflet-tooltip b')).toBeNull();
    expect(layer.bounds.contains([21.0266, 105.8459])).toBe(true);
    expect(map.getBounds().contains(layer.bounds)).toBe(true);
    expect(map.getZoom()).toBeGreaterThan(5);

    layer.remove();
    expect(pane.querySelector('.dsv-route-line')).toBeNull();
    expect(pane.querySelector('.dsv-route-start')).toBeNull();
    map.remove();
  });
});
