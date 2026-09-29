import type { Area } from '../access/screens';

/** Thông tin gắn vào mỗi route (`handle`) để bố cục và bộ giao diện biết đang ở khu nào. */
export interface RouteHandle {
  area?: Area;
  hideFooter?: boolean;
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null;
}
