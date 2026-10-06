// "Gần bạn": tính khoảng cách từ vị trí khách tới các di sản có tọa độ, ngay trên máy. Vị trí không gửi đi đâu và không được lưu.

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Khoảng cách theo đường chim bay (mét), công thức haversine. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface WithDistance<T> {
  item: T;
  meters: number;
}

/** Tối đa `limit` phần tử gần nhất, gần trước. Phần tử không có tọa độ hợp lệ bị bỏ. */
export function nearest<T extends { latitude: number | null; longitude: number | null }>(here: Coordinates, items: readonly T[], limit = 6): Array<WithDistance<T>> {
  const located: Array<{ item: T; latitude: number; longitude: number }> = [];
  for (const item of items) {
    if (typeof item.latitude === 'number' && typeof item.longitude === 'number' && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
      located.push({ item, latitude: item.latitude, longitude: item.longitude });
    }
  }
  return located
    .map(({ item, latitude, longitude }) => ({ item, meters: distanceMeters(here, { latitude, longitude }) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}
