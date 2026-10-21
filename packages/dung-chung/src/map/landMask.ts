import type * as Leaflet from 'leaflet';
import { VIETNAM_LAND_RINGS } from './vietnamLand';

// Lớp che để bản đồ chỉ hiện Việt Nam: một đa giác có vòng ngoài phủ cả thế giới, các lỗ là đất liền và đảo ven bờ của
// Việt Nam (dữ liệu sinh sẵn ở vietnamLand.ts), tô màu đặc theo token giao diện nên hợp cả chế độ sáng và tối. Nằm trên ô
// bản đồ nền và dưới mọi lớp phủ, ghim, nhãn; không nhận chuột. Hoàng Sa và Trường Sa không khoét lỗ (ô bản đồ nền ở đó
// ghi tên nước ngoài): lớp che phủ kín, hai quần đảo được vẽ riêng bằng chấm đảo và nhãn tiếng Việt ở trên.

export type LatLngTuple = [latitude: number, longitude: number];

/** Tên lớp (pane) của lớp che: trên ô bản đồ (200), dưới lớp phủ (400). */
export const LAND_MASK_PANE = 'lop-che';
const LAND_MASK_PANE_Z_INDEX = '300';

/** Vòng ngoài phủ cả thế giới (tránh hai cực vì phép chiếu Mercator không vẽ được vĩ độ 90). */
const WORLD_RING: LatLngTuple[] = [
  [-85, -180],
  [85, -180],
  [85, 180],
  [-85, 180],
];

let decoded: LatLngTuple[][] | null = null;

/** Các vòng đất liền và đảo ven bờ, mỗi vòng là dãy điểm [vĩ độ, kinh độ]; giải mã một lần từ dãy phẳng. */
export function vietnamLandRings(): readonly (readonly LatLngTuple[])[] {
  decoded ??= VIETNAM_LAND_RINGS.map((flat) => {
    const ring: LatLngTuple[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) ring.push([flat[i]!, flat[i + 1]!]);
    return ring;
  });
  return decoded;
}

function insideRing(ring: readonly LatLngTuple[], latitude: number, longitude: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i]!;
    const [latJ, lngJ] = ring[j]!;
    const crosses = latI > latitude !== latJ > latitude && longitude < ((lngJ - lngI) * (latitude - latI)) / (latJ - latI) + lngI;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Điểm có nằm trên đất liền hoặc đảo ven bờ của Việt Nam không (theo dữ liệu đã đơn giản hóa, sai số khoảng vài trăm mét). */
export function isInsideVietnamLand(latitude: number, longitude: number): boolean {
  return vietnamLandRings().some((ring) => insideRing(ring, latitude, longitude));
}

/** Vẽ lớp che lên bản đồ; trả về đa giác để nơi gọi bỏ đi nếu cần. */
export function addVietnamLandMask(L: typeof Leaflet, map: Leaflet.Map): Leaflet.Polygon {
  const pane = map.createPane(LAND_MASK_PANE);
  pane.style.zIndex = LAND_MASK_PANE_Z_INDEX;
  pane.style.pointerEvents = 'none';
  const rings: LatLngTuple[][] = [WORLD_RING, ...vietnamLandRings().map((ring) => [...ring])];
  // Màu tô, nét viền đặt bằng CSS (lớp dsv-land-mask) theo token; Leaflet tô theo quy tắc chẵn lẻ nên các lỗ để lộ bản đồ nền.
  return L.polygon(rings, { pane: LAND_MASK_PANE, className: 'dsv-land-mask', interactive: false, fillOpacity: 1, weight: 1 }).addTo(map);
}
