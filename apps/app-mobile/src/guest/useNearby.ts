import type { HeritagePin } from '@dsvhvn/dung-chung/api';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useMemo } from 'react';
import { useApp } from '../state/AppProvider';
import { nearest, type Coordinates, type WithDistance } from './nearby';
import { useMapPins } from './queries';

// "Gần bạn" trên trang chủ của khách: xin quyền vị trí khi dùng ứng dụng, lấy vị trí hiện tại, tính khoảng cách tới các ghim bản đồ ngay trên máy.
// Vị trí chỉ nằm trong bộ nhớ (giữ tối đa một phút) và không bao giờ được lưu hay gửi đi.

export type NearbyStatus = 'off' | 'locating' | 'denied' | 'ready' | 'error';

class LocationDenied extends Error {}

const NO_FILTER = {};

async function currentPosition(): Promise<Coordinates> {
  const permission = await Location.getForegroundPermissionsAsync();
  const granted = permission.granted || (await Location.requestForegroundPermissionsAsync()).granted;
  if (!granted) throw new LocationDenied();
  const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export function useNearby() {
  const { locationEnabled, setLocationEnabled } = useApp();
  const position = useQuery({
    queryKey: ['nearby', 'position'],
    enabled: locationEnabled,
    retry: false,
    gcTime: 60_000,
    staleTime: 5 * 60_000,
    queryFn: currentPosition,
  });
  const pins = useMapPins(NO_FILTER, locationEnabled && position.isSuccess);

  const error: unknown = position.error;
  const status: NearbyStatus = !locationEnabled
    ? 'off'
    : position.isLoading
      ? 'locating'
      : error instanceof LocationDenied
        ? 'denied'
        : position.isError
          ? 'error'
          : 'ready';

  const items: Array<WithDistance<HeritagePin>> = useMemo(
    () => (position.data && pins.data ? nearest(position.data, pins.data.pins, 6) : []),
    [position.data, pins.data],
  );

  /** Khách bấm "Cho phép vị trí" (hoặc thử lại). */
  const locate = useCallback(() => {
    setLocationEnabled(true);
    void position.refetch();
  }, [setLocationEnabled, position]);

  return { status, items, locate, isLoading: status === 'locating' || (status === 'ready' && pins.isLoading) };
}
