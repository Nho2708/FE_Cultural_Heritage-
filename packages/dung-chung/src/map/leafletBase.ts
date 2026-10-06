import * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type {} from 'leaflet.markercluster';
import { EAST_SEA_LABEL, VIETNAM_ARCHIPELAGOS } from './seas';

// Nền dùng chung của mọi bản đồ trong web học tập, dựng bằng Leaflet (BSD-2-Clause) với ô bản đồ OpenStreetMap
// (dữ liệu © những người đóng góp OpenStreetMap, giấy phép ODbL). Chỉ được nạp khi mở trang có bản đồ (import động).
// Không dùng react-leaflet vì giấy phép Hippocratic-2.1 không phải giấy phép mã nguồn mở thông thường.

export type LeafletLib = typeof Leaflet;

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const LEAFLET_PREFIX = '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>';
const PIN_PATH = 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z';

/**
 * Chữ trên bản đồ theo ngôn ngữ giao diện (web học tập có năm ngôn ngữ): nút phóng to, thu nhỏ, ghi công nền và nhãn hai quần đảo, Biển Đông.
 * Nhãn quần đảo luôn kèm "Việt Nam" ở mọi ngôn ngữ.
 */
export interface MapLabels {
  zoomIn: string;
  zoomOut: string;
  /** Ghi công nền: `prefix` đứng trước, `owners` là chữ của liên kết tới trang bản quyền OpenStreetMap. */
  attribution: { prefix: string; owners: string };
  hoangSa: string;
  truongSa: string;
  eastSea: string;
}

/** Chữ tiếng Việt, dùng khi nơi gọi không truyền nhãn. */
export const MAP_LABELS_VI: MapLabels = {
  zoomIn: 'Phóng to',
  zoomOut: 'Thu nhỏ',
  attribution: { prefix: 'Bản đồ nền ©', owners: 'Những người đóng góp OpenStreetMap' },
  hoangSa: 'Quần đảo Hoàng Sa (Việt Nam)',
  truongSa: 'Quần đảo Trường Sa (Việt Nam)',
  eastSea: 'BIỂN ĐÔNG',
};

let loading: Promise<LeafletLib> | null = null;

/**
 * Nạp Leaflet cùng plugin gom nhóm ghim. Plugin đọc `L` toàn cục và gán thêm thuộc tính vào đó, còn vùng tên của module
 * ESM thì không ghi được, nên đặt một bản sao có thể ghi làm `L` toàn cục trước khi nạp plugin. Các lớp (Map, Marker…)
 * là cùng một đối tượng nên plugin bổ sung được cho cả hai.
 */
export function loadLeaflet(): Promise<LeafletLib> {
  loading ??= (async () => {
    const lib = { ...Leaflet } as LeafletLib;
    (globalThis as { L?: unknown }).L = lib;
    await import('leaflet.markercluster');
    return lib;
  })();
  return loading;
}

/** Vẽ hai quần đảo thuộc Việt Nam (chấm đảo, nhãn) và nhãn Biển Đông lên một lớp riêng không nhận chuột. */
function addVietnamSeas(L: LeafletLib, map: Leaflet.Map, labels: MapLabels) {
  const pane = map.createPane('vung-bien');
  pane.style.zIndex = '450';
  pane.style.pointerEvents = 'none';
  const label = (text: string, at: [number, number], className: string) =>
    L.marker(at, {
      pane: 'vung-bien',
      interactive: false,
      keyboard: false,
      icon: L.divIcon({ className: 'dsv-map-label-wrap', html: `<span class="${className}">${text}</span>`, iconSize: [0, 0] }),
    }).addTo(map);

  for (const archipelago of VIETNAM_ARCHIPELAGOS) {
    for (const island of archipelago.islands) {
      L.circleMarker([island.latitude, island.longitude], { pane: 'vung-bien', radius: 3, className: 'dsv-island', interactive: false }).addTo(map);
    }
    label(archipelago.key === 'hoang-sa' ? labels.hoangSa : labels.truongSa, archipelago.labelAt, 'dsv-map-label');
  }
  label(labels.eastSea, EAST_SEA_LABEL.at, 'dsv-map-label dsv-map-label--sea');
}

export interface BaseMapOptions {
  scrollWheelZoom?: boolean;
  /** Chữ trên bản đồ; bỏ trống thì tiếng Việt. */
  labels?: MapLabels;
}

export function createBaseMap(L: LeafletLib, element: HTMLElement, { scrollWheelZoom = true, labels = MAP_LABELS_VI }: BaseMapOptions = {}): Leaflet.Map {
  const map = L.map(element, { zoomControl: false, scrollWheelZoom, minZoom: 4, maxZoom: 18 });
  map.attributionControl.setPrefix(LEAFLET_PREFIX);
  const attribution = `${labels.attribution.prefix} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">${labels.attribution.owners}</a>`;
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution }).addTo(map);
  L.control.zoom({ position: 'bottomright', zoomInTitle: labels.zoomIn, zoomOutTitle: labels.zoomOut }).addTo(map);
  addVietnamSeas(L, map, labels);
  return map;
}

/** Ghim di sản dạng chấm tròn nằm đúng vị trí; ghim đang chọn to và đậm hơn. Nội dung cố định, không chứa chữ của người dùng. */
export function pinIcon(L: LeafletLib, selected: boolean): Leaflet.DivIcon {
  const size = selected ? 44 : 32;
  const glyph = selected ? 22 : 16;
  return L.divIcon({
    className: selected ? 'dsv-pin dsv-pin--selected' : 'dsv-pin',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${glyph}" height="${glyph}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PIN_PATH}"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Ghim gom nhóm: số di sản gần nhau. */
export function clusterIcon(L: LeafletLib, count: number): Leaflet.DivIcon {
  return L.divIcon({ className: 'dsv-cluster', html: `<span>${Math.trunc(count)}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] });
}
