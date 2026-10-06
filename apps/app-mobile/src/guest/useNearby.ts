import type { HeritageCard } from '@dsvhvn/dung-chung/api';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useMemo } from 'react';
import { useApp } from '../state/AppProvider';
import type { WithDistance } from './nearby';

// "Gần bạn" trên trang chủ của khách: chỉ khi khách cho phép, xin quyền vị trí khi dùng ứng dụng rồi gửi tọa độ trong thân yêu cầu để máy chủ tính khoảng cách.
// Máy chủ không lưu vị trí; app giữ vị trí trong bộ nhớ tối đa một phút và không ghi xuống máy.

export type NearbyStatus = 'off' | 'locating' | 'denied' | 'ready' | 'error';

class LocationDenied extends Error {}

async function currentPosition(): Promise<{ latitude: number; longitude: number }> {
  const permission = await Location.getForegroundPermissionsAsync();
  const granted = permission.granted || (await Location.requestForegroundPermissionsAsync()).granted;
  if (!granted) throw new LocationDenied();
  const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export function useNearby() {
  const { locationEnabled, setLocationEnabled, language, services } = useApp();
  const result = useQuery({
    queryKey: ['nearby', language],
    enabled: locationEnabled,
    retry: false,
    gcTime: 60_000,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => services.guestApi.nearby(await currentPosition(), { signal, lang: language }),
  });

  const error: unknown = result.error;
  const status: NearbyStatus = !locationEnabled ? 'off' : result.isLoading ? 'locating' : error instanceof LocationDenied ? 'denied' : result.isError ? 'error' : 'ready';

  const items: Array<WithDistance<HeritageCard>> = useMemo(() => (result.data?.items ?? []).map((entry) => ({ item: entry.heritage, meters: entry.distanceMeters })), [result.data]);

  /** Khách bấm "Cho phép vị trí" (hoặc thử lại). */
  const locate = useCallback(() => {
    setLocationEnabled(true);
    void result.refetch();
  }, [setLocationEnabled, result]);

  return { status, items, locate, isLoading: status === 'locating' };
}
