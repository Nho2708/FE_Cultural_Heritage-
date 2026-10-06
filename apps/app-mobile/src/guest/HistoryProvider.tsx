import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KEYS, prefs } from '../storage/keyValue';
import { parseHistory, prune, record, removeEntry, type HistoryEntry, type NewEntry } from './historyCore';

// Lịch sử của khách, giữ trong bộ nhớ và lưu xuống máy mỗi khi đổi. Không gửi lên máy chủ.

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

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void prefs.get(KEYS.history).then((raw) => {
      if (cancelled) return;
      const stored = parseHistory(raw, Date.now());
      // Gộp với những gì đã ghi trong lúc đang nạp.
      setEntries((current) => prune([...current, ...stored], Date.now()));
      loaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: HistoryEntry[]) => {
    void prefs.set(KEYS.history, JSON.stringify(next));
  }, []);

  const add = useCallback(
    (entry: NewEntry) => {
      setEntries((current) => {
        const next = record(current, entry, Date.now());
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const remove = useCallback(
    (entry: HistoryEntry) => {
      setEntries((current) => {
        const next = removeEntry(current, entry);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setEntries([]);
    void prefs.remove(KEYS.history);
  }, []);

  const value = useMemo(() => ({ entries, add, remove, clear }), [entries, add, remove, clear]);
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}
