import { themeCssVariables, type LearningTheme } from '@dsvhvn/dung-chung/theme';

/** Thuộc tính trên <html> cho biết bộ giao diện đang dùng (để kiểm thử và gỡ lỗi). */
export const THEME_ATTRIBUTE = 'data-bo-giao-dien';

function isDarkActive(root: HTMLElement): boolean {
  const theme = root.getAttribute('data-theme');
  if (theme === 'dark') return true;
  if (theme === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyTheme(theme: LearningTheme, root: HTMLElement = document.documentElement): void {
  const isDark = isDarkActive(root);
  const vars = themeCssVariables(theme);

  for (const [name, value] of Object.entries(vars)) {
    // Với khách dùng bộ mặc định ở chế độ tối: gỡ biến màu inline để dùng trọn bộ token dark mode trong CSS
    if (theme.key === 'mac-dinh' && isDark && name.startsWith('--dsv-color-')) {
      root.style.removeProperty(name);
    } else {
      root.style.setProperty(name, value);
    }
  }
  root.setAttribute(THEME_ATTRIBUTE, theme.key);
}
