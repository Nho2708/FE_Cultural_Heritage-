import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { adsApi } from '../lib/api/client';
import { getDeviceKey } from '../lib/guest/deviceKey';

// Dữ liệu của cổng quảng cáo có thưởng: cấu hình công khai và trạng thái mở khóa của một di sản trên thiết bị này. Chỉ khách tham quan gọi;
// học sinh không gọi gì ở đây (hộp thoại tóm tắt chỉ bật các truy vấn khi người xem là khách).

export const UNLOCK_HOURS_FALLBACK = 24;

const MAX_TIMER_MS = 2_147_483_647;

/** Thời điểm máy chủ trả (UTC); có thể không kèm "Z" vì máy chủ đọc từ cơ sở dữ liệu ra mà không đánh dấu múi giờ. Không đọc được thì NaN. */
export function serverTime(value: string): number {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`).getTime();
}

/** Cấu hình của cổng (thời hạn mở khóa, đơn vị quảng cáo của web). Đổi hiếm nên giữ 5 phút. */
export function useAdsConfig(enabled: boolean) {
  return useQuery({
    queryKey: ['ads', 'config'],
    queryFn: ({ signal }) => adsApi.config({ signal }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Trạng thái mở khóa của di sản trên thiết bị này; luôn hỏi lại máy chủ khi mở (hạn tính theo giờ máy chủ, không giữ cache). */
export function useAdUnlockStatus(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['ads', 'unlock', slug],
    queryFn: ({ signal }) => adsApi.unlock(getDeviceKey(), slug, { signal, platform: 'WEB' }),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

/**
 * Hẹn một việc đúng lúc hết hạn mở khóa (hạn là giờ máy chủ; đồng hồ máy khách lệch thì máy chủ vẫn là bên quyết định ở lần hỏi kế tiếp). `expiresAt` null thì không hẹn.
 * Hẹn lại khi hạn đổi; hủy khi rời đi.
 */
export function useAtExpiry(expiresAt: string | null | undefined, onExpired: () => void) {
  useEffect(() => {
    if (!expiresAt) return;
    const wait = serverTime(expiresAt) - Date.now();
    if (!Number.isFinite(wait)) return;
    const timer = setTimeout(onExpired, Math.min(Math.max(wait, 0) + 250, MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [expiresAt, onExpired]);
}
