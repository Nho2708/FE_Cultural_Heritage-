import { useCallback, useEffect, useState } from 'react';
import { KEYS, prefs } from '../storage/keyValue';

// Cấp 1 tự đọc to câu chuyện và câu hỏi khi em vào màn (giọng đọc của điện thoại). Em tắt được: lựa chọn nhớ trên máy này, mặc định bật. Chưa đọc xong lựa chọn đã lưu thì chưa tự đọc
// (tránh đọc rồi mới thấy em đã tắt).

/** Chuỗi đã lưu thành cờ: chỉ "0" là tắt, không có gì hoặc giá trị lạ là bật. */
export function parseAutoRead(raw: string | null): boolean {
  return raw !== '0';
}

export function useAutoRead(): { autoRead: boolean | null; setAutoRead: (on: boolean) => void } {
  const [autoRead, set] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void prefs.get(KEYS.autoRead).then((raw) => {
      if (!cancelled) set(parseAutoRead(raw));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAutoRead = useCallback((on: boolean) => {
    set(on);
    void prefs.set(KEYS.autoRead, on ? '1' : '0');
  }, []);

  return { autoRead, setAutoRead };
}
