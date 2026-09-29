// Tỉ lệ tương phản WCAG 2.1 giữa hai màu dạng #RRGGBB — dùng để kiểm mọi bộ giao diện theo cấp đạt mức AA.

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Màu không đúng dạng #RRGGBB: ${hex}`);
  const n = match[1];
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16))) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Ngưỡng AA cho chữ thường (dưới 24px, hoặc dưới 18,66px đậm). */
export const WCAG_AA_TEXT = 4.5;
