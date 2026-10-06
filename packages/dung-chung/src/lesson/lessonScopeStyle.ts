import type { CSSProperties } from 'react';
import type { SchoolLevel } from '../api';
import { themeCssVariables, themeForLevel } from '../theme';

/** Token component dùng trong bố cục bài học → token ngữ nghĩa mà nó trỏ tới. */
const COMPONENT_TOKENS: Readonly<Record<string, string>> = {
  '--dsv-tab-active-fg': '--dsv-color-primary',
  '--dsv-tab-active-indicator': '--dsv-color-primary',
  '--dsv-tab-inactive-fg': '--dsv-color-on-surface-variant',
  '--dsv-pill-bg': '--dsv-color-primary',
  '--dsv-pill-bg-hover': '--dsv-color-primary-hover',
  '--dsv-pill-bg-active': '--dsv-color-primary-active',
  '--dsv-pill-fg': '--dsv-color-on-primary',
};

export function lessonScopeStyle(level: SchoolLevel | null): CSSProperties {
  const theme = themeForLevel(level);
  const vars: Record<string, string> = themeCssVariables(theme);
  for (const [token, source] of Object.entries(COMPONENT_TOKENS)) {
    const value = vars[source];
    if (value !== undefined) vars[token] = value;
  }
  return vars as CSSProperties;
}
