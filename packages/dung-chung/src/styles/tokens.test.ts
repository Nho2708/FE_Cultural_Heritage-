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
});
