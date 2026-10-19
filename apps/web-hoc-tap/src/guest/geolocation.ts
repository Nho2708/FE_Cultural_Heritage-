// Vị trí của khách cho "Gần bạn". Vị trí chỉ đi từ trình duyệt thẳng vào yêu cầu tính khoảng cách; không lưu ở máy khách, không gửi kèm mã thiết bị, không
// ghi vào lịch sử. Tọa độ làm tròn 3 chữ số thập phân (khoảng 110 m) ngay ở máy khách trước khi gửi, đúng độ chính xác máy chủ cần.

export type LocationPermission = 'granted' | 'prompt' | 'denied' | 'unsupported';

export interface Position {
  latitude: number;
  longitude: number;
}

/** Lý do không lấy được vị trí: khách từ chối quyền, hoặc thiết bị không xác định được (hết thời gian, không có tín hiệu). */
export class LocationError extends Error {
  readonly reason: 'denied' | 'unavailable';

  constructor(reason: 'denied' | 'unavailable') {
    super(reason === 'denied' ? 'Trình duyệt không cho dùng vị trí.' : 'Không xác định được vị trí.');
    this.reason = reason;
  }
}

export const hasGeolocation = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

/** Làm tròn `decimals` chữ số thập phân (mặc định 3, khoảng 110 m). */
export const roundCoordinate = (value: number, decimals = 3) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Trạng thái quyền vị trí của trình duyệt mà không hỏi khách. Trình duyệt không có Permissions API thì coi như chưa hỏi (`prompt`). */
export async function readPermission(): Promise<LocationPermission> {
  if (!hasGeolocation()) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'prompt';
  }
}

/** Theo dõi khi khách đổi quyền ở thanh địa chỉ của trình duyệt. Trả hàm hủy theo dõi. */
export function watchPermission(onChange: (permission: LocationPermission) => void): () => void {
  if (!hasGeolocation() || typeof navigator.permissions?.query !== 'function') return () => undefined;
  let status: PermissionStatus | null = null;
  let active = true;
  const handler = () => {
    if (status) onChange(status.state);
  };
  navigator.permissions.query({ name: 'geolocation' }).then(
    (result) => {
      if (!active) return;
      status = result;
      result.addEventListener('change', handler);
    },
    () => undefined,
  );
  return () => {
    active = false;
    status?.removeEventListener('change', handler);
  };
}

/**
 * Lấy vị trí hiện tại (trình duyệt hỏi quyền nếu chưa hỏi). Chấp nhận vị trí lưu tạm của trình duyệt tới 5 phút để khỏi hỏi lại thiết bị liên tục.
 * "Gần bạn" làm tròn 3 chữ số (đủ cho khoảng cách); chỉ đường cần 4 chữ số (khoảng 11 m) để điểm xuất phát nằm đúng phố.
 */
export function currentPosition({ decimals = 3 }: { decimals?: number } = {}): Promise<Position> {
  return new Promise<Position>((resolve, reject) => {
    if (!hasGeolocation()) {
      reject(new LocationError('unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) => resolve({ latitude: roundCoordinate(result.coords.latitude, decimals), longitude: roundCoordinate(result.coords.longitude, decimals) }),
      (error) => reject(new LocationError(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}
