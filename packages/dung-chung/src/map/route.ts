import type { LanguageCode } from '../api/discovery';
import { VIETNAM_TERRITORY_BOUNDS } from './seas';

// Chỉ đường tới di sản: gọi thẳng máy chủ OSRM (mặc định máy chủ công cộng của FOSSGIS, dữ liệu OpenStreetMap) từ trình duyệt hoặc WebView,
// KHÔNG đi qua backend của dự án nên vị trí của khách không tới máy chủ của Vietnam Heritage và không được lưu ở đâu. Chỉ gọi khi khách bấm "Chỉ đường",
// kết quả nhớ trong bộ nhớ của trang. Mô-đun này thuần TypeScript (không Leaflet, không React) để app mobile dùng chung; phần vẽ tuyến ở `routeLayer.ts`.

export type TravelMode = 'driving' | 'walking';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

/** Loại thao tác và hướng rẽ theo đặc tả OSRM v5; loại lạ (thêm về sau) được coi là `turn`. */
export type ManeuverType =
  | 'depart'
  | 'arrive'
  | 'turn'
  | 'new name'
  | 'continue'
  | 'merge'
  | 'on ramp'
  | 'off ramp'
  | 'fork'
  | 'end of road'
  | 'roundabout'
  | 'rotary'
  | 'roundabout turn'
  | 'exit roundabout'
  | 'exit rotary'
  | 'notification'
  | 'use lane';

export type ManeuverModifier = 'left' | 'right' | 'sharp left' | 'sharp right' | 'slight left' | 'slight right' | 'straight' | 'uturn';

export interface RouteStep {
  type: ManeuverType;
  modifier: ManeuverModifier | null;
  /** Tên đường sau thao tác (rỗng nếu đường không tên). */
  name: string;
  /** Số hiệu đường (QL.1, CT.01…), lấy số đầu nếu có nhiều. */
  ref: string | null;
  distanceMeters: number;
  durationSeconds: number;
  /** Lối ra thứ mấy của vòng xuyến. */
  exit: number | null;
  /** Hướng đi (độ, 0 là bắc) ngay sau thao tác. */
  bearingAfter: number | null;
}

export interface Route {
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  /** Đường đi: [vĩ độ, kinh độ] theo thứ tự của Leaflet. */
  coordinates: Array<[latitude: number, longitude: number]>;
  steps: RouteStep[];
  origin: RoutePoint;
  destination: RoutePoint;
}

/** Máy chủ định tuyến công cộng của FOSSGIS (chính sách dùng: chỉ gọi theo thao tác của người dùng, không gọi lặp). */
export const ROUTING_BASE_URL_DEFAULT = 'https://routing.openstreetmap.de';

/** Hồ sơ của máy chủ theo cách đi: "Đi xe" dùng hồ sơ ô tô (ước tính cho xe máy, ô tô), "Đi bộ" dùng hồ sơ đi bộ. */
const PROFILE_PATH: Record<TravelMode, string> = { driving: 'routed-car', walking: 'routed-foot' };

/** Điểm (xuất phát hay đích) bị máy chủ nắn về đường gần nhất xa hơn mức này thì coi như không có đường tới đó (di sản trên đảo, ngoài khơi). */
export const SNAP_LIMIT_METERS = 3000;

export type RouteFailure = 'no-route' | 'service' | 'network';

/** Không tính được đường: không có đường bộ nối hai điểm, máy chủ trả lỗi hoặc không gọi được máy chủ. */
export class RouteError extends Error {
  readonly reason: RouteFailure;

  constructor(reason: RouteFailure, message?: string) {
    super(message ?? `Không tính được đường (${reason}).`);
    this.reason = reason;
  }
}

const TYPES: readonly ManeuverType[] = [
  'depart',
  'arrive',
  'turn',
  'new name',
  'continue',
  'merge',
  'on ramp',
  'off ramp',
  'fork',
  'end of road',
  'roundabout',
  'rotary',
  'roundabout turn',
  'exit roundabout',
  'exit rotary',
  'notification',
  'use lane',
];
const MODIFIERS: readonly ManeuverModifier[] = ['left', 'right', 'sharp left', 'sharp right', 'slight left', 'slight right', 'straight', 'uturn'];

const fixed = (value: number) => value.toFixed(6).replace(/\.?0+$/, '');

/**
 * Vị trí nằm trong khung tọa độ lãnh thổ Việt Nam (đất liền, hai quần đảo và vùng biển quanh); ngoài khung thì không hỏi máy chủ.
 * Không dùng giới hạn kéo bản đồ (rộng hơn lãnh thổ nhiều để căn khung nhìn cả nước).
 */
export function isInsideVietnam(point: RoutePoint): boolean {
  const [[south, west], [north, east]] = VIETNAM_TERRITORY_BOUNDS;
  return point.latitude >= south && point.latitude <= north && point.longitude >= west && point.longitude <= east;
}

/** Địa chỉ gọi OSRM: `{lon},{lat};{lon},{lat}` (kinh độ trước), đường đi đầy đủ dạng GeoJSON kèm từng bước. */
export function routeRequestUrl(baseUrl: string, mode: TravelMode, from: RoutePoint, to: RoutePoint): string {
  const base = baseUrl.replace(/\/+$/, '');
  const pair = `${fixed(from.longitude)},${fixed(from.latitude)};${fixed(to.longitude)},${fixed(to.latitude)}`;
  return `${base}/${PROFILE_PATH[mode]}/route/v1/driving/${pair}?overview=full&geometries=geojson&steps=true`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function parseStep(raw: unknown): RouteStep | null {
  if (!isRecord(raw) || !isRecord(raw.maneuver)) return null;
  const { maneuver } = raw;
  const type = TYPES.find((item) => item === maneuver.type) ?? 'turn';
  const modifier = MODIFIERS.find((item) => item === maneuver.modifier) ?? null;
  const ref = typeof raw.ref === 'string' && raw.ref !== '' ? (raw.ref.split(';')[0]?.trim() ?? null) : null;
  const exit = finite(maneuver.exit);
  return {
    type,
    modifier,
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    ref: ref || null,
    distanceMeters: finite(raw.distance) ?? 0,
    durationSeconds: finite(raw.duration) ?? 0,
    exit: exit !== null && exit > 0 ? Math.trunc(exit) : null,
    bearingAfter: finite(maneuver.bearing_after),
  };
}

/**
 * Đọc phản hồi của OSRM. `code` khác `Ok` là không có đường (`NoRoute`, `NoSegment`) hoặc máy chủ từ chối; điểm bị nắn về đường quá xa
 * (di sản trên đảo không có đường nối, vị trí ngoài khơi) cũng coi là không có đường vì tuyến trả về sẽ dẫn tới một nơi khác hẳn.
 */
export function parseRouteResponse(body: unknown, mode: TravelMode, from: RoutePoint, to: RoutePoint): Route {
  if (!isRecord(body)) throw new RouteError('service');
  if (body.code !== 'Ok') {
    throw new RouteError(body.code === 'NoRoute' || body.code === 'NoSegment' ? 'no-route' : 'service', typeof body.message === 'string' ? body.message : undefined);
  }
  const waypoints = Array.isArray(body.waypoints) ? body.waypoints : [];
  for (const waypoint of waypoints) {
    const snapped = isRecord(waypoint) ? finite(waypoint.distance) : null;
    if (snapped !== null && snapped > SNAP_LIMIT_METERS) throw new RouteError('no-route');
  }
  const route = Array.isArray(body.routes) ? body.routes[0] : undefined;
  if (!isRecord(route) || !isRecord(route.geometry) || !Array.isArray(route.geometry.coordinates)) throw new RouteError('service');
  const coordinates: Array<[number, number]> = [];
  for (const pair of route.geometry.coordinates) {
    if (!Array.isArray(pair)) continue;
    const longitude = finite(pair[0]);
    const latitude = finite(pair[1]);
    if (longitude !== null && latitude !== null) coordinates.push([latitude, longitude]);
  }
  if (coordinates.length < 2) throw new RouteError('no-route');
  const legs = Array.isArray(route.legs) ? route.legs : [];
  const steps: RouteStep[] = [];
  for (const leg of legs) {
    if (!isRecord(leg) || !Array.isArray(leg.steps)) continue;
    for (const raw of leg.steps) {
      const step = parseStep(raw);
      if (step) steps.push(step);
    }
  }
  return {
    mode,
    distanceMeters: finite(route.distance) ?? 0,
    durationSeconds: finite(route.duration) ?? 0,
    coordinates,
    steps,
    origin: from,
    destination: to,
  };
}

export interface FetchRouteOptions {
  mode: TravelMode;
  from: RoutePoint;
  to: RoutePoint;
  /** Gốc máy chủ OSRM; bỏ trống thì dùng máy chủ công cộng. */
  baseUrl?: string;
  signal?: AbortSignal;
  /** Thay `fetch` trong test. */
  fetchImpl?: typeof fetch;
}

/** Hỏi đường. Hủy (`signal`) thì ném `AbortError` của fetch như thường; lỗi mạng thành `RouteError('network')`. */
export async function fetchRoute({ mode, from, to, baseUrl = ROUTING_BASE_URL_DEFAULT, signal, fetchImpl = fetch }: FetchRouteOptions): Promise<Route> {
  let response: Response;
  try {
    response = await fetchImpl(routeRequestUrl(baseUrl, mode, from, to), { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    // Hủy (rời trang, đổi cách đi) không phải lỗi mạng; `DOMException` có thể khác realm nên so bằng tên.
    if (typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError') throw error;
    throw new RouteError('network');
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    throw new RouteError('service');
  }
  // OSRM trả 400 kèm `code` (NoRoute, InvalidQuery…) nên vẫn đọc thân; các mã khác (5xx, 429) là máy chủ lỗi.
  if (!response.ok && !(isRecord(body) && typeof body.code === 'string')) throw new RouteError('service');
  return parseRouteResponse(body, mode, from, to);
}

/** Địa chỉ mở chỉ đường trong Google Maps (ứng dụng hoặc web), có điểm xuất phát khi đã có vị trí; không có thì Google Maps tự hỏi. */
export function googleMapsDirectionsUrl({ destination, mode, origin }: { destination: RoutePoint; mode: TravelMode; origin?: RoutePoint | null }): string {
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('destination', `${fixed(destination.latitude)},${fixed(destination.longitude)}`);
  params.set('travelmode', mode);
  if (origin) params.set('origin', `${fixed(origin.latitude)},${fixed(origin.longitude)}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const LOCALE: Record<LanguageCode, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', 'zh-Hans': 'zh-CN', ja: 'ja-JP' };

/** Khoảng cách đọc được theo ngôn ngữ: dưới 1 km viết mét, trên 100 km bỏ phần lẻ ("850 m", "12,4 km", "1.494 km"). */
export function formatRouteDistance(meters: number, language: LanguageCode): string {
  const locale = LOCALE[language];
  if (meters < 1000) return `${Math.round(meters).toLocaleString(locale)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}

/** Thời gian đi ước tính theo ngôn ngữ, làm tròn phút ("2 giờ 35 phút", "2 hr 35 min", "2시간 35분"); dưới một phút là "1 phút". */
export function formatRouteDuration(seconds: number, language: LanguageCode): string {
  const locale = LOCALE[language];
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const unit = (value: number, kind: 'hour' | 'minute') => new Intl.NumberFormat(locale, { style: 'unit', unit: kind, unitDisplay: 'short' }).format(value);
  const parts: string[] = [];
  if (hours > 0) parts.push(unit(hours, 'hour'));
  if (minutes > 0 || hours === 0) parts.push(unit(minutes, 'minute'));
  return new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' }).format(parts);
}

export { instructionText, stepGlyph, type StepGlyph } from './routeInstructions';
