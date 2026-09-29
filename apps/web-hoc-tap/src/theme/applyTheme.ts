import { themeCssVariables, type LearningTheme } from '@dsvhvn/dung-chung/theme';

/** Thuộc tính trên <html> cho biết bộ giao diện đang dùng (để kiểm thử và gỡ lỗi). */
export const THEME_ATTRIBUTE = 'data-bo-giao-dien';

export function applyTheme(theme: LearningTheme, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(themeCssVariables(theme))) root.style.setProperty(name, value);
  root.setAttribute(THEME_ATTRIBUTE, theme.key);
}
