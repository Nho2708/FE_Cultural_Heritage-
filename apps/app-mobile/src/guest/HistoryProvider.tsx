import type { GuestHistoryItem } from '@dsvhvn/dung-chung/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useApp } from '../state/AppProvider';
import type { HistoryEntry, NewEntry } from './historyCore';

// Lịch sử của khách nằm ở máy chủ, gắn với mã thiết bị ẩn danh (90 ngày). Máy chủ tự ghi từ khóa tìm, di sản đã xem, đọc tóm tắt và xem 3D khi yêu cầu có mã thiết bị;
// riêng "nghe thuyết minh" chạy trên máy nên app tự ghi. Khách xem, xóa từng mục hoặc xóa hết (xóa thật). Chế độ Học sinh không có lịch sử.

interface HistoryApi {
  entries: HistoryEntry[];
  add: (entry: NewEntry) => void;
  remove: (entry: HistoryEntry) => void;
  clear: () => void;
}

const HistoryContext = createContext<HistoryApi | null>(null);

export function useHistory(): HistoryApi {
  const value = useContext(HistoryContext);
  if (!value) throw new Error('useHistory phải nằm trong HistoryProvider.');
  return value;
}

const KEY = ['guest', 'history'] as const;

/** Một mục của máy chủ thành mục hiển thị; lượt đọc tóm tắt đã nằm trong lượt xem nên bỏ. */
export function toEntry(item: GuestHistoryItem): (HistoryEntry & { id: number }) | null {
  const at = Date.parse(item.createdAt);
  if (item.type === 'SEARCH') return item.query ? { id: item.id, kind: 'search', key: item.query, label: item.query, thumbnailUrl: null, heritageType: null, provinceName: null, at } : null;
  if (item.type === 'READ_SUMMARY' || !item.heritage) return null;
  const { heritage } = item;
  const kind = item.type === 'LISTEN' ? 'listen' : item.type === 'VIEW_3D' ? 'model' : 'view';
  return { id: item.id, kind, key: heritage.slug, label: heritage.name, thumbnailUrl: heritage.thumbnailUrl, heritageType: heritage.heritageType, provinceName: heritage.provinceName, at };
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { services, mode, language } = useApp();
  const queryClient = useQueryClient();
  const enabled = mode === 'guest' && services.platform !== 'WEB';
  const query = useQuery({
    queryKey: [...KEY, language],
    enabled,
    retry: false,
    staleTime: 0,
    queryFn: ({ signal }) => services.guestApi.history(services.deviceId, { page: 1, pageSize: 100 }, { signal, lang: language }),
  });
  const entries = useMemo(() => (query.data?.items ?? []).map(toEntry).filter((entry): entry is HistoryEntry & { id: number } => entry !== null), [query.data]);
  const refresh = useCallback(() => void queryClient.invalidateQueries({ queryKey: KEY }), [queryClient]);

  const add = useCallback(
    (entry: NewEntry) => {
      // Chỉ "nghe" do app ghi (có thể bị cổng quảng cáo từ chối, bỏ qua lỗi); các loại khác máy chủ đã tự ghi nên chỉ làm mới danh sách.
      if (entry.kind === 'listen' && enabled) {
        void services.guestApi.recordActivity(services.deviceId, { type: 'LISTEN', slug: entry.key }, { lang: language, platform: services.platform }).then(refresh, () => undefined);
      } else refresh();
    },
    [enabled, services, language, refresh],
  );

  const remove = useCallback(
    (entry: HistoryEntry) => {
      const id = (entry as { id?: number }).id;
      if (id === undefined) return;
      void services.guestApi.deleteHistoryItem(services.deviceId, id).finally(() => {
        refresh();
        void queryClient.invalidateQueries({ queryKey: ['guest', 'recommend'] });
      });
    },
    [services, refresh, queryClient],
  );

  const clear = useCallback(() => {
    void services.guestApi.deleteHistory(services.deviceId).finally(() => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['guest', 'recommend'] });
    });
  }, [services, refresh, queryClient]);

  const value = useMemo(() => ({ entries, add, remove, clear }), [entries, add, remove, clear]);
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}
