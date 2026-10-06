import type { NearbyResult } from '@dsvhvn/dung-chung/api';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/context';
import { guestApi } from '../lib/api/client';
import { currentPosition, LocationError, readPermission, watchPermission, type LocationPermission, type Position } from './geolocation';
import { useGuestDevice, useIsGuest, useUpdateGuestDevice } from './guestData';

// "Gần bạn" của khách. Quyền vị trí thuộc về trình duyệt; máy chủ chỉ nhớ cờ "khách đã bật Gần bạn" (không có tọa độ). Vị trí chỉ nằm trong bộ nhớ của
// trang đang mở, không ghi ra localStorage, không đưa vào địa chỉ trang. Khách không cho dùng vị trí thì mục này ẩn.

export type NearbyStatus = 'idle' | 'locating' | 'loading' | 'ready' | 'denied' | 'unavailable' | 'error';

export interface NearbyController {
  /** Quyền của trình duyệt; null khi chưa đọc xong. */
  permission: LocationPermission | null;
  status: NearbyStatus;
  result: NearbyResult | null;
  /** Vị trí của khách (đã làm tròn), chỉ trong bộ nhớ; dùng để căn bản đồ. */
  position: Position | null;
  error: unknown;
  /** Cờ khách đã bật "Gần bạn" ở lần trước (nhớ ở máy chủ). */
  remembered: boolean;
  /** Đang đọc cờ đã nhớ từ máy chủ: chưa biết khách đã bật hay chưa. */
  loadingFlag: boolean;
  /** Lấy vị trí (trình duyệt hỏi quyền nếu cần) rồi hỏi máy chủ các di sản gần nhất. */
  locate: () => void;
  /** Tắt "Gần bạn": xóa vị trí và kết quả khỏi bộ nhớ, ghi cờ tắt. */
  stop: () => void;
  retry: () => void;
}

/** Vị trí cần vẽ trên bản đồ: có khi đã có kết quả hợp lệ (vị trí trong Việt Nam). */
export function mapPositionOf(nearby: NearbyController): Position | null {
  return nearby.status === 'ready' && nearby.result && nearby.result.unavailableReason === null ? nearby.position : null;
}

export function useNearby({ auto }: { auto: boolean }): NearbyController {
  const lang = useLanguage();
  const guest = useIsGuest();
  const device = useGuestDevice();
  const update = useUpdateGuestDevice();
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [failure, setFailure] = useState<'denied' | 'unavailable' | null>(null);
  // Khách đã tắt (hoặc đang tự lấy vị trí rồi bị tắt): không tự lấy lại.
  const [stopped, setStopped] = useState(false);
  const autoStarted = useRef(false);
  const generation = useRef(0);
  const remembered = device.data?.locationAllowed === true;
  const rememberedRef = useRef(remembered);
  useEffect(() => {
    rememberedRef.current = remembered;
  }, [remembered]);
  const { mutate: saveFlag } = update;

  useEffect(() => {
    if (!guest) return;
    let active = true;
    void readPermission().then((state) => {
      if (active) setPermission(state);
    });
    const stopWatching = watchPermission(setPermission);
    return () => {
      active = false;
      stopWatching();
    };
  }, [guest]);

  const nearby = useQuery({
    queryKey: ['nearby', lang, position?.latitude, position?.longitude],
    queryFn: ({ signal }) => guestApi.nearby(position!, { signal, lang }),
    enabled: guest && position !== null,
    staleTime: 5 * 60_000,
    // Vị trí nằm trong khóa của truy vấn: bỏ khỏi bộ nhớ đệm ngay khi không còn ai dùng.
    gcTime: 0,
  });

  /** Lấy vị trí và báo kết quả; `mine` để bỏ kết quả của lần gọi cũ khi khách đã bấm tắt hoặc gọi lại. */
  const run = useCallback(
    (mine: number) => {
      currentPosition().then(
        (found) => {
          if (mine !== generation.current) return;
          setLocating(false);
          setPosition(found);
          setPermission('granted');
          if (!rememberedRef.current) saveFlag({ locationAllowed: true });
        },
        (error: unknown) => {
          if (mine !== generation.current) return;
          setLocating(false);
          const reason = error instanceof LocationError ? error.reason : 'unavailable';
          setFailure(reason);
          if (reason === 'denied') {
            setPermission('denied');
            if (rememberedRef.current) saveFlag({ locationAllowed: false });
          }
        },
      );
    },
    [saveFlag],
  );

  const locate = useCallback(() => {
    setFailure(null);
    setStopped(false);
    setLocating(true);
    run(++generation.current);
  }, [run]);

  const stop = useCallback(() => {
    generation.current++;
    setLocating(false);
    setPosition(null);
    setFailure(null);
    setStopped(true);
    if (rememberedRef.current) saveFlag({ locationAllowed: false });
  }, [saveFlag]);

  // Khách đã bật từ lần trước và trình duyệt vẫn cho phép: tự lấy vị trí một lần, không hiện hộp xin quyền nào. Trạng thái "đang xác định" suy ra từ
  // điều kiện này ngay khi vẽ (không đặt state trong effect), kết quả báo về qua lời gọi bất đồng bộ.
  const autoPending = auto && guest && !stopped && permission === 'granted' && remembered && position === null && failure === null;
  useEffect(() => {
    if (!autoPending || autoStarted.current) return;
    autoStarted.current = true;
    run(++generation.current);
  }, [autoPending, run]);

  let status: NearbyStatus = 'idle';
  if (permission === 'denied' || failure === 'denied') status = 'denied';
  else if (failure === 'unavailable') status = 'unavailable';
  else if (locating || autoPending) status = 'locating';
  else if (position) status = nearby.isError ? 'error' : nearby.data ? 'ready' : 'loading';

  return {
    permission,
    status,
    result: position ? (nearby.data ?? null) : null,
    position,
    error: nearby.error,
    remembered,
    loadingFlag: device.isPending && guest,
    locate,
    stop,
    retry: () => {
      if (position && nearby.isError) void nearby.refetch();
      else locate();
    },
  };
}
