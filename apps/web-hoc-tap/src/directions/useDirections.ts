import { fetchRoute, isInsideVietnam, RouteError, type Route, type RouteFailure, type RoutePoint, type TravelMode } from '@dsvhvn/dung-chung/map/route';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ROUTING_BASE_URL } from '../config/env';
import { currentPosition, LocationError } from '../guest/geolocation';

// Chỉ đường tới một di sản: lấy vị trí của khách (trình duyệt hỏi quyền khi khách bấm, hoặc app gửi sang ở trang nhúng) rồi hỏi máy chủ OSRM
// thẳng từ trình duyệt. Vị trí và tuyến chỉ nằm trong bộ nhớ của trang; không gửi tới máy chủ của dự án, không lưu, không vào địa chỉ trang.
// Mỗi cách đi (Đi xe, Đi bộ) chỉ hỏi máy chủ một lần cho một vị trí; đổi cách đi hay rời trang giữa chừng thì hủy yêu cầu đang chạy.

export type DirectionsStatus =
  | 'idle'
  /** Đang chờ trình duyệt (hoặc app) cho vị trí. */
  | 'locating'
  | 'routing'
  | 'ready'
  | 'denied'
  | 'unavailable'
  /** Vị trí ngoài khung tọa độ Việt Nam: không hỏi máy chủ. */
  | 'outside'
  | 'no-route'
  /** Máy chủ tính đường lỗi hoặc không gọi được. */
  | 'service';

export interface DirectionsController {
  status: DirectionsStatus;
  mode: TravelMode;
  setMode: (mode: TravelMode) => void;
  /** Tuyến của cách đi đang chọn (khi `status` là `ready`). */
  route: Route | null;
  /** Vị trí của khách đang dùng làm điểm xuất phát. */
  position: RoutePoint | null;
  /** Bấm "Chỉ đường": xin vị trí của trình duyệt rồi tìm đường. */
  start: () => void;
  /** Thử lại bước vừa hỏng (lấy lại vị trí, hoặc hỏi lại máy chủ). */
  retry: () => void;
}

interface Options {
  destination: RoutePoint;
  /** Vị trí do nơi khác cấp (trang nhúng nhận từ app): có thì không xin trình duyệt và tự tìm đường ngay. */
  position?: RoutePoint | null;
  baseUrl?: string;
}

/** Tuyến và lỗi đã biết cho một vị trí xuất phát; vị trí khác thì bỏ hết. */
interface Known {
  position: RoutePoint | null;
  routes: Partial<Record<TravelMode, Route>>;
  errors: Partial<Record<TravelMode, RouteFailure>>;
}

export function useDirections({ destination, position: external = null, baseUrl = ROUTING_BASE_URL }: Options): DirectionsController {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<TravelMode>('driving');
  const [own, setOwn] = useState<RoutePoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [failure, setFailure] = useState<'denied' | 'unavailable' | null>(null);
  const [known, setKnown] = useState<Known>({ position: null, routes: {}, errors: {} });
  const generation = useRef(0);
  // Rời trang khi đang lấy vị trí thì bỏ kết quả về sau. Dùng cờ riêng (không tăng `generation`) để lần dựng kép của StrictMode không làm mất kết quả
  // của lời xin vị trí đã bắt đầu ở lần dựng đầu.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const position = external ?? own;
  const started = active || external !== null;
  const outside = position !== null && !isInsideVietnam(position);
  const routes = known.position === position ? known.routes : {};
  const errors = known.position === position ? known.errors : {};

  const locate = useCallback(() => {
    const mine = ++generation.current;
    setFailure(null);
    setLocating(true);
    currentPosition({ decimals: 4 }).then(
      (found) => {
        if (mine !== generation.current || !alive.current) return;
        setLocating(false);
        setOwn(found);
      },
      (error: unknown) => {
        if (mine !== generation.current || !alive.current) return;
        setLocating(false);
        setFailure(error instanceof LocationError ? error.reason : 'unavailable');
      },
    );
  }, []);

  const start = useCallback(() => {
    setActive(true);
    if (external === null) locate();
  }, [external, locate]);

  const failed = errors[mode];
  const retry = useCallback(() => {
    if (failed) {
      setKnown((previous) => {
        const next = { ...previous.errors };
        delete next[mode];
        return { ...previous, errors: next };
      });
      return;
    }
    if (external === null) locate();
  }, [failed, mode, external, locate]);

  const route = routes[mode] ?? null;
  const needRoute = started && position !== null && !outside && !route && !failed;

  useEffect(() => {
    if (!needRoute || !position) return;
    const controller = new AbortController();
    const remember = (patch: (known: Known) => Known) => setKnown((previous) => patch(previous.position === position ? previous : { position, routes: {}, errors: {} }));
    fetchRoute({ mode, from: position, to: destination, baseUrl, signal: controller.signal }).then(
      (found) => {
        if (!controller.signal.aborted) remember((current) => ({ ...current, routes: { ...current.routes, [mode]: found } }));
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        remember((current) => ({ ...current, errors: { ...current.errors, [mode]: error instanceof RouteError ? error.reason : 'service' } }));
      },
    );
    return () => controller.abort();
  }, [needRoute, position, mode, destination, baseUrl]);

  let status: DirectionsStatus = 'idle';
  if (!started) status = 'idle';
  else if (locating) status = 'locating';
  else if (failure) status = failure;
  else if (position === null) status = 'locating';
  else if (outside) status = 'outside';
  else if (route) status = 'ready';
  else if (failed) status = failed === 'no-route' ? 'no-route' : 'service';
  else status = 'routing';

  return { status, mode, setMode, route, position: started ? position : null, start, retry };
}
