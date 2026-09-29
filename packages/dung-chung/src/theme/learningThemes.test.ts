import { describe, expect, it } from 'vitest';
import { WCAG_AA_TEXT, contrastRatio } from './contrast';
import {
  LEARNING_THEMES,
  schoolLevelOfGrade,
  themeCssVariables,
  themeForLevel,
  themeForStudent,
  type LearningTheme,
  type LearningThemeColors,
} from './learningThemes';

const ALL: LearningTheme[] = Object.values(LEARNING_THEMES);

/** Cặp (chữ, nền) phải đạt tương phản chữ thường. */
const TEXT_PAIRS: Array<[keyof LearningThemeColors, keyof LearningThemeColors]> = [
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryHover'],
  ['onPrimary', 'primaryActive'],
  ['onPrimaryContainer', 'primaryContainer'],
  ['onAccent', 'accent'],
  ['onBackground', 'background'],
  ['onBackground', 'surface'],
  ['onBackground', 'surfaceContainerLow'],
  ['onSurfaceVariant', 'background'],
  ['onSurfaceVariant', 'surfaceContainerLow'],
  ['correct', 'background'],
  ['incorrect', 'background'],
  ['onCorrectContainer', 'correctContainer'],
  ['onIncorrectContainer', 'incorrectContainer'],
  ['link', 'background'],
];

describe('cấp học suy từ khối lớp', () => {
  it('khối 1-5 là cấp 1, 6-9 là cấp 2, 10-12 là cấp 3', () => {
    expect([1, 5].map(schoolLevelOfGrade)).toEqual([1, 1]);
    expect([6, 9].map(schoolLevelOfGrade)).toEqual([2, 2]);
    expect([10, 12].map(schoolLevelOfGrade)).toEqual([3, 3]);
  });

  it('khối không hợp lệ thì không có cấp', () => {
    for (const grade of [0, 13, 2.5, Number.NaN, null, undefined]) expect(schoolLevelOfGrade(grade)).toBeNull();
  });

  it('chọn bộ giao diện: ưu tiên cấp máy chủ trả, không có thì theo khối lớp, chưa đăng nhập dùng bộ mặc định', () => {
    expect(themeForStudent(null).key).toBe('mac-dinh');
    expect(themeForStudent({ schoolLevel: 2, class: { grade: 3 } }).key).toBe('cap-2');
    expect(themeForStudent({ schoolLevel: null, class: { grade: 5 } }).key).toBe('cap-1');
    expect(themeForStudent({ schoolLevel: null, class: { grade: 6 } }).key).toBe('cap-2');
    expect(themeForStudent({ schoolLevel: null, class: { grade: 10 } }).key).toBe('cap-3');
    expect(themeForStudent({ schoolLevel: null, class: null }).key).toBe('mac-dinh');
    expect(themeForLevel(null).key).toBe('mac-dinh');
  });
});

describe('bốn bộ giao diện', () => {
  it.each(ALL.map((t) => [t.name, t] as const))('%s đạt tương phản chữ WCAG AA ở mọi cặp chữ / nền', (_name, theme) => {
    for (const [text, background] of TEXT_PAIRS) {
      const ratio = contrastRatio(theme.color[text], theme.color[background]);
      expect(ratio, `${text} trên ${background}`).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  });

  it('cấp 1: chữ thân ≥ 18px, câu hỏi ≥ 22px, vùng bấm ≥ 48px; cấp 2, 3 và mặc định: ≥ 16px, ≥ 18px, ≥ 44px', () => {
    const level1 = LEARNING_THEMES['cap-1'];
    expect(level1.text.bodySize).toBeGreaterThanOrEqual(18);
    expect(level1.text.questionSize).toBeGreaterThanOrEqual(22);
    expect(level1.touchTarget).toBeGreaterThanOrEqual(48);
    for (const theme of [LEARNING_THEMES['cap-2'], LEARNING_THEMES['cap-3'], LEARNING_THEMES['mac-dinh']]) {
      expect(theme.text.bodySize).toBeGreaterThanOrEqual(16);
      expect(theme.text.questionSize).toBeGreaterThanOrEqual(18);
      expect(theme.touchTarget).toBeGreaterThanOrEqual(44);
    }
  });

  it('bo góc giảm dần từ cấp 1 tới cấp 3; hiệu ứng chúc mừng chỉ bật ở cấp 1 và cấp 2', () => {
    const [l1, l2, l3] = [LEARNING_THEMES['cap-1'], LEARNING_THEMES['cap-2'], LEARNING_THEMES['cap-3']];
    expect(l1.radius.card).toBeGreaterThan(l2.radius.card);
    expect(l2.radius.card).toBeGreaterThan(l3.radius.card);
    expect(ALL.filter((t) => t.celebration).map((t) => t.key)).toEqual(['cap-1', 'cap-2']);
  });

  it('mỗi bộ có bộ hình minh họa riêng', () => {
    expect(new Set(ALL.map((t) => t.illustrationSet)).size).toBe(4);
  });

  it('mọi bộ ghi cùng một danh sách biến CSS — chỉ khác giá trị, không khác cấu trúc', () => {
    const keys = ALL.map((t) => Object.keys(themeCssVariables(t)).sort().join(','));
    expect(new Set(keys).size).toBe(1);
    expect(themeCssVariables(LEARNING_THEMES['cap-1'])).toMatchObject({
      '--dsv-color-primary': '#0057B8',
      '--dsv-text-body-m-size': '19px',
      '--dsv-question-size': '24px',
      '--dsv-touch-target': '48px',
    });
  });
});
