// Tọa độ của bản đồ chọn tọa độ: khoảng cho phép và cách làm tròn. Tách khỏi component để dùng và kiểm riêng.

export interface CoordinateLimits {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

/** Làm tròn tới 6 chữ số thập phân (khoảng 0,1 m), đủ cho một di sản. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function insideLimits(limits: CoordinateLimits, latitude: number, longitude: number): boolean {
  return (
    latitude >= limits.minLatitude &&
    latitude <= limits.maxLatitude &&
    longitude >= limits.minLongitude &&
    longitude <= limits.maxLongitude
  );
}
