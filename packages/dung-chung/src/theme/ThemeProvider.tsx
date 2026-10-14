import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemeMode } from './useTheme';

const STORAGE_KEY = 'dsv-theme';

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}

function readStored(defaultMode: ThemeMode): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // localStorage không khả dụng (private mode trên một số trình duyệt)
  }
  return defaultMode;
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Chế độ mặc định khi chưa có lựa chọn nào trong localStorage. Mặc định là 'light'. */
  defaultMode?: ThemeMode;
}

/**
 * Quản lý light / dark / system mode cho toàn ứng dụng.
 * Áp `data-theme` lên <html> và lưu lựa chọn vào localStorage.
 */
export function ThemeProvider({ children, defaultMode = 'light' }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = readStored(defaultMode);
    applyTheme(stored);
    return stored;
  });

  // Khi component mount, đảm bảo data-theme đã được áp (SSR-safe)
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // bỏ qua nếu không lưu được
    }
    setModeState(next);
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
