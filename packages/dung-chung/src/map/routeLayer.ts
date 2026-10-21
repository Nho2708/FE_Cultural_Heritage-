import type * as Leaflet from 'leaflet';
import type { LeafletLib } from './leafletBase';
import type { Route } from './route';

// Vẽ tuyến đường tới di sản lên bản đồ Leaflet: đường đi hai lớp (viền sáng + nét màu chủ đạo) trong một lớp (pane) riêng nằm trên lớp phủ
// mặc định và dưới nhãn hai quần đảo, cùng chấm vị trí xuất phát của khách. Lớp này không nhận chuột nên ghim di sản vẫn bấm được.
// Màu lấy từ lớp CSS `.dsv-route-*` (ban-do.css) để theo chế độ sáng, tối.

export const ROUTE_PANE = 'tuyen-duong';

/** Lớp tuyến đường: trên overlayPane (400) để nằm trên lớp che ngoài Việt Nam, dưới nhãn biển đảo (450) và ghim (600). */
const ROUTE_PANE_Z_INDEX = '420';

export interface RouteLayerOptions {
  /** Tên chấm xuất phát (đọc cho trình đọc màn hình và tooltip). */
  startLabel: string;
  /** Khớp khung nhìn theo tuyến (mặc định có); đệm quanh tuyến tính bằng px. */
  fit?: boolean;
  padding?: [number, number];
}

export interface RouteLayer {
  /** Khung bao của tuyến, để nơi gọi căn lại khung nhìn khi cần. */
  bounds: Leaflet.LatLngBounds;
  remove: () => void;
}

export function drawRoute(L: LeafletLib, map: Leaflet.Map, route: Route, { startLabel, fit = true, padding = [32, 32] }: RouteLayerOptions): RouteLayer {
  if (!map.getPane(ROUTE_PANE)) {
    const pane = map.createPane(ROUTE_PANE);
    pane.style.zIndex = ROUTE_PANE_Z_INDEX;
    pane.style.pointerEvents = 'none';
  }
  const casing = L.polyline(route.coordinates, { pane: ROUTE_PANE, className: 'dsv-route-casing', weight: 9, opacity: 1, interactive: false, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  const line = L.polyline(route.coordinates, { pane: ROUTE_PANE, className: 'dsv-route-line', weight: 5, opacity: 1, interactive: false, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  const start = L.circleMarker([route.origin.latitude, route.origin.longitude], { pane: ROUTE_PANE, radius: 8, className: 'dsv-route-start', weight: 3, fillOpacity: 1, interactive: false }).addTo(map);
  const label = document.createElement('span');
  label.textContent = startLabel; // chữ thuần, không chèn HTML
  start.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -8], className: 'dsv-map-tooltip', interactive: false });
  start.getElement()?.setAttribute('aria-label', startLabel);

  const bounds = line.getBounds();
  if (fit && bounds.isValid()) map.fitBounds(bounds, { padding, maxZoom: 16 });

  return {
    bounds,
    remove: () => {
      start.remove();
      line.remove();
      casing.remove();
    },
  };
}
