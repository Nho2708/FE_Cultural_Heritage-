import { describe, expect, it } from 'vitest';
import { generate, readOutputs, readTokens } from '../../scripts/gen-tokens.mjs';

const { tokensCss, themeCss } = readOutputs();

describe('token CSS sinh từ design/tokens.json', () => {
  const generated = generate(readTokens());

  it('tokens.css và theme.css khớp đầu ra của npm run gen:tokens', () => {
    expect(tokensCss).toBe(generated.tokensCss);
    expect(themeCss).toBe(generated.themeCss);
  });

  it('giữ đúng giá trị chốt của design system', () => {
    expect(tokensCss).toContain('--color-lacquer-600: #A4231F;');
    expect(tokensCss).toContain('--dsv-color-primary: var(--color-lacquer-600);');
    expect(tokensCss).toContain('--dsv-pill-bg: var(--dsv-color-primary);');
    expect(tokensCss).toContain('--dsv-topbar-height: 56px;');
    expect(tokensCss).toContain('--dsv-font-sans: "Be Vietnam Pro"');
    expect(themeCss).toContain('--breakpoint-dsvmd: 841px;');
  });

  it('dark mode chỉ bật trong vùng data-theme, không đặt ở :root', () => {
    expect(tokensCss).toContain('[data-theme="dark"] {');
    expect(tokensCss).toContain('[data-theme="system"] {');
    expect(tokensCss).not.toMatch(/prefers-color-scheme: dark\)\s*\{\s*:root/);
  });

  it('vùng dark khai báo lại token component và đường viền trỏ về token ngữ nghĩa có bản dark (ô nhập, menu đang chọn, bảng…)', () => {
    const dark = tokensCss.slice(tokensCss.indexOf('[data-theme="dark"] {'), tokensCss.indexOf('@media (prefers-color-scheme: dark)'));
    const system = tokensCss.slice(tokensCss.indexOf('[data-theme="system"] {'));
    for (const line of [
      '--dsv-input-bg: var(--dsv-color-surface);',
      '--dsv-input-border: var(--dsv-color-border-strong);',
      '--dsv-drawer-item-active-bg: var(--dsv-color-primary-container);',
      '--dsv-carousel-arrow-bg: var(--dsv-color-surface);',
      '--dsv-table-header-bg: var(--dsv-color-surface-container);',
      '--dsv-modal-bg: var(--dsv-color-surface);',
      '--dsv-border-default: 1px solid var(--dsv-color-border-strong);',
    ]) {
      expect(dark).toContain(line);
      expect(system).toContain(line);
    }
    // Token trỏ về token ngữ nghĩa không đổi theo dark (chữ trên ảnh) hoặc về primitive thì không cần khai báo lại.
    expect(dark).not.toContain('--dsv-card-title-fg');
    expect(dark).not.toContain('--dsv-circle-badge-icon');
  });
});
