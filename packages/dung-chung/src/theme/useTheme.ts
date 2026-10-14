import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  /** Lựa chọn người dùng lưu trong localStorage: 'light' | 'dark' | 'system'. */
  mode: ThemeMode;
  /** Đổi chế độ và lưu ngay vào localStorage. */
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_THEME_VALUE: ThemeContextValue = {
  mode: 'light',
  setMode: () => {},
};

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  return value ?? DEFAULT_THEME_VALUE;
}
