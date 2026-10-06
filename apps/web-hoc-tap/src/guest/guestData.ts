import type { GuestHistoryItem } from '@dsvhvn/dung-chung/api';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useLanguage } from '../i18n/context';
import { guestApi } from '../lib/api/client';
import { useAuth } from '../lib/auth/context';
import { getDeviceKey } from '../lib/guest/deviceKey';
import { isGuestTracking } from '../lib/guest/tracking';

// Dữ liệu riêng của khách tham quan: gợi ý, lịch sử, cài đặt thiết bị, ghi lượt nghe. Học sinh đã đăng nhập không gọi gì ở đây (máy chủ trả 403 cho học sinh):
// mọi truy vấn tắt khi có phiên đăng nhập. Lịch sử và gợi ý đổi mỗi lần khách xem thêm một di sản nên không giữ lại: mở trang là hỏi máy chủ.

const LIVE = { staleTime: 0, gcTime: 60_000, refetchOnMount: 'always' as const };

export const HISTORY_PAGE_SIZE = 50;

/** Người xem là khách tham quan (chưa đăng nhập). */
export function useIsGuest(): boolean {
  return useAuth().user === null;
}

/**
 * "Gợi ý cho bạn". `scope` đổi thì tải lại (trang chi tiết truyền slug để mỗi di sản mở ra một lần hỏi mới, sau khi lượt xem của di sản đó đã được ghi).
 * `ready` false thì chờ: ở trang chi tiết phải đợi lượt xem được ghi xong rồi mới hỏi gợi ý.
 */
export function useGuestRecommendations({ scope = 'home', ready = true }: { scope?: string; ready?: boolean } = {}) {
  const lang = useLanguage();
  const guest = useIsGuest();
  return useQuery({
    queryKey: ['guest', 'recommendations', lang, scope],
    queryFn: ({ signal }) => guestApi.recommendations(getDeviceKey(), { signal, lang }),
    enabled: guest && ready,
    ...LIVE,
  });
}

/** Lịch sử của thiết bị, mới nhất trước, mỗi lần 50 mục; "Xem thêm" tải trang kế tiếp. */
export function useGuestHistory() {
  const lang = useLanguage();
  const guest = useIsGuest();
  return useInfiniteQuery({
    queryKey: ['guest', 'history', lang],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => guestApi.history(getDeviceKey(), { page: pageParam, pageSize: HISTORY_PAGE_SIZE }, { signal, lang }),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: guest,
    ...LIVE,
  });
}

/** Gom các trang đã tải thành một danh sách. */
export function flattenHistory(pages: ReadonlyArray<{ items: GuestHistoryItem[] }> | undefined): GuestHistoryItem[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

/** Sau khi xóa lịch sử, gợi ý quay về mặc định và danh sách lịch sử đổi: hỏi lại cả hai. */
function useInvalidateGuest() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: ['guest'] }), [queryClient]);
}

export function useDeleteHistoryItem() {
  const invalidate = useInvalidateGuest();
  return useMutation({ mutationFn: (id: number) => guestApi.deleteHistoryItem(getDeviceKey(), id), onSettled: invalidate });
}

export function useDeleteHistory() {
  const invalidate = useInvalidateGuest();
  return useMutation({ mutationFn: () => guestApi.deleteHistory(getDeviceKey()), onSettled: invalidate });
}

/** Cài đặt của thiết bị (cờ "Gần bạn"). Mã chưa từng thấy thì máy chủ trả mặc định và không tạo bản ghi. */
export function useGuestDevice() {
  const lang = useLanguage();
  const guest = useIsGuest();
  return useQuery({
    queryKey: ['guest', 'device'],
    queryFn: ({ signal }) => guestApi.device(getDeviceKey(), { signal, lang }),
    enabled: guest,
    staleTime: 60_000,
  });
}

export function useUpdateGuestDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: { locationAllowed?: boolean }) => guestApi.updateDevice(getDeviceKey(), settings, { platform: 'WEB' }),
    onSuccess: (device) => queryClient.setQueryData(['guest', 'device'], device),
  });
}

/**
 * Ghi một lượt "nghe thuyết minh" (nghe chạy trên trình duyệt nên máy chủ không tự biết). Học sinh và trang nhúng không ghi. Lỗi mạng bị bỏ qua: lịch sử là
 * tiện ích, không được làm hỏng việc nghe. Xong thì gợi ý cũ không còn đúng nên hỏi lại ở lần mở kế tiếp.
 */
export function useRecordListen() {
  const lang = useLanguage();
  const invalidate = useInvalidateGuest();
  return useCallback(
    (slug: string) => {
      if (!isGuestTracking()) return;
      guestApi.recordActivity(getDeviceKey(), { type: 'LISTEN', slug }, { lang, platform: 'WEB' }).then(
        () => void invalidate(),
        () => undefined,
      );
    },
    [lang, invalidate],
  );
}
