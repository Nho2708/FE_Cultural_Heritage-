import type { SchoolLevel, StudentClass } from '../api/types';

// Bộ giao diện theo cấp học của web học tập và app mobile. Cấp học suy từ khối lớp: khối 1-5 là cấp 1, 6-9 là cấp 2,
// 10-12 là cấp 3. Mỗi cấp CHỈ khác giá trị token — đúng danh sách: màu, cỡ chữ, bo góc, kích thước vùng bấm và khoảng
// cách, bộ hình minh họa theo trạng thái, cờ hiệu ứng chúc mừng. Một bố cục, một bộ component, một bộ câu chữ cho cả ba
// cấp; component đọc token, không rẽ nhánh theo cấp. Khách và học sinh chưa đăng nhập dùng bộ mặc định.
// Web học tập đổi các giá trị này thành biến CSS (themeCssVariables); app mobile dùng thẳng đối tượng theme.
// Mọi bộ phải đạt tương phản chữ WCAG AA (test learningThemes.test.ts kiểm từng cặp màu chữ / nền).

export type LearningThemeKey = 'mac-dinh' | 'cap-1' | 'cap-2' | 'cap-3';

/** Bộ hình minh họa: ảnh di sản (mặc định), hình vẽ tay có linh vật, biểu tượng nét, biểu tượng tối giản. */
export type IllustrationSet = 'anh-di-san' | 'linh-vat' | 'bieu-tuong-net' | 'toi-gian';

/** Trạng thái cần hình minh họa: lời chào, chúc mừng, động viên, trạng thái trống. */
export type IllustrationState = 'chao' | 'chuc-mung' | 'dong-vien' | 'trong';

export interface LearningThemeColors {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  /** Màu nhấn: nền khối nổi bật (huy hiệu, nhãn), chữ trên đó dùng `onAccent`. */
  accent: string;
  onAccent: string;
  background: string;
  onBackground: string;
  surface: string;
  surfaceContainerLow: string;
  onSurfaceVariant: string;
  border: string;
  /** Trạng thái đúng / sai của câu trả lời. */
  correct: string;
  correctContainer: string;
  onCorrectContainer: string;
  incorrect: string;
  incorrectContainer: string;
  onIncorrectContainer: string;
  link: string;
  focusRing: string;
}

/** Cỡ chữ và chiều cao dòng, đơn vị px. */
export interface LearningThemeText {
  bodySize: number;
  bodyLineHeight: number;
  /** Nội dung câu hỏi khi làm bài kiểm tra. */
  questionSize: number;
  questionLineHeight: number;
  /** Chữ trên nút và ô nhập. */
  controlSize: number;
  controlLineHeight: number;
  headingSize: number;
  headingLineHeight: number;
}

/** Bo góc, đơn vị px. */
export interface LearningThemeRadius {
  /** Nút, ô nhập. */
  control: number;
  /** Thẻ, khối nội dung. */
  card: number;
  /** Phương án trả lời. */
  option: number;
}

export interface LearningTheme {
  key: LearningThemeKey;
  /** null với bộ mặc định (chưa biết cấp). */
  level: SchoolLevel | null;
  /** Tên hiển thị, ví dụ "Cấp 1 (Tiểu học)". */
  name: string;
  color: LearningThemeColors;
  text: LearningThemeText;
  radius: LearningThemeRadius;
  /** Kích thước vùng bấm tối thiểu (px). */
  touchTarget: number;
  /** Khoảng cách giữa các khối và giữa các phần tử trong khối (px). */
  spacing: { block: number; inline: number };
  illustrationSet: IllustrationSet;
  /** Bật hiệu ứng chúc mừng ở màn hình kết quả. */
  celebration: boolean;
}

const DEFAULT_THEME: LearningTheme = {
  key: 'mac-dinh',
  level: null,
  name: 'Mặc định',
  color: {
    primary: '#A4231F',
    primaryHover: '#861A18',
    primaryActive: '#6A1412',
    onPrimary: '#FFFFFF',
    primaryContainer: '#F7D2CF',
    onPrimaryContainer: '#4E0F0D',
    accent: '#FAE9BC',
    onAccent: '#4C310A',
    background: '#FFFFFF',
    onBackground: '#2A231C',
    surface: '#FFFFFF',
    surfaceContainerLow: '#FAF7F3',
    onSurfaceVariant: '#5E4E41',
    border: '#D4C6B4',
    correct: '#186B56',
    correctContainer: '#C7E4DA',
    onCorrectContainer: '#08281F',
    incorrect: '#B3261E',
    incorrectContainer: '#F9DEDC',
    onIncorrectContainer: '#470E0C',
    link: '#A4231F',
    focusRing: '#2A231C',
  },
  text: {
    bodySize: 16,
    bodyLineHeight: 24,
    questionSize: 18,
    questionLineHeight: 28,
    controlSize: 16,
    controlLineHeight: 24,
    headingSize: 28,
    headingLineHeight: 36,
  },
  radius: { control: 8, card: 12, option: 10 },
  touchTarget: 44,
  spacing: { block: 24, inline: 16 },
  illustrationSet: 'anh-di-san',
  celebration: false,
};

/**
 * Cấp 1 (khối 1-5, một bộ cho cả lớp 1 đến lớp 5): màu tươi tương phản cao, chữ lớn dòng thưa (câu hỏi 28px), bo góc nhiều, vùng bấm 64px
 * vì trẻ 6-7 tuổi chạm trượt nhiều với nút nhỏ, linh vật, có chúc mừng.
 */
const LEVEL_1_THEME: LearningTheme = {
  key: 'cap-1',
  level: 1,
  name: 'Cấp 1 (Tiểu học)',
  color: {
    primary: '#0057B8',
    primaryHover: '#004A9C',
    primaryActive: '#003D80',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D6E8FF',
    onPrimaryContainer: '#002A5C',
    accent: '#FFC83D',
    onAccent: '#1B1B1F',
    background: '#FFFDF5',
    onBackground: '#1B1B1F',
    surface: '#FFFFFF',
    surfaceContainerLow: '#FFF6DC',
    onSurfaceVariant: '#4A4A55',
    border: '#E5D9B6',
    correct: '#1E7A34',
    correctContainer: '#D8F5DF',
    onCorrectContainer: '#0B3D18',
    incorrect: '#C4221F',
    incorrectContainer: '#FFE1DE',
    onIncorrectContainer: '#5C0E0C',
    link: '#0057B8',
    focusRing: '#1B1B1F',
  },
  text: {
    bodySize: 20,
    bodyLineHeight: 32,
    questionSize: 28,
    questionLineHeight: 40,
    controlSize: 20,
    controlLineHeight: 28,
    headingSize: 32,
    headingLineHeight: 40,
  },
  radius: { control: 16, card: 24, option: 20 },
  touchTarget: 64,
  spacing: { block: 32, inline: 20 },
  illustrationSet: 'linh-vat',
  celebration: true,
};

/** Cấp 2 (khối 6-9): màu tươi vừa, chữ 17px, bo góc vừa, vùng bấm 44px, bộ biểu tượng nét, có chúc mừng. */
const LEVEL_2_THEME: LearningTheme = {
  key: 'cap-2',
  level: 2,
  name: 'Cấp 2 (Trung học cơ sở)',
  color: {
    primary: '#0F766E',
    primaryHover: '#0B5F58',
    primaryActive: '#094C47',
    onPrimary: '#FFFFFF',
    primaryContainer: '#CCF0EC',
    onPrimaryContainer: '#053B37',
    accent: '#FDE2C8',
    onAccent: '#7C2D12',
    background: '#FAFAF7',
    onBackground: '#1C1917',
    surface: '#FFFFFF',
    surfaceContainerLow: '#F1F5F2',
    onSurfaceVariant: '#57534E',
    border: '#D6D3CE',
    correct: '#15803D',
    correctContainer: '#DCFCE7',
    onCorrectContainer: '#14532D',
    incorrect: '#B91C1C',
    incorrectContainer: '#FEE2E2',
    onIncorrectContainer: '#7F1D1D',
    link: '#0F766E',
    focusRing: '#1C1917',
  },
  text: {
    bodySize: 17,
    bodyLineHeight: 26,
    questionSize: 20,
    questionLineHeight: 30,
    controlSize: 16,
    controlLineHeight: 24,
    headingSize: 28,
    headingLineHeight: 36,
  },
  radius: { control: 10, card: 16, option: 12 },
  touchTarget: 44,
  spacing: { block: 24, inline: 16 },
  illustrationSet: 'bieu-tuong-net',
  celebration: true,
};

/** Cấp 3 (khối 10-12): màu trầm trung tính, chữ 16px, bo góc ít, bố cục gọn, biểu tượng tối giản, tắt chúc mừng. */
const LEVEL_3_THEME: LearningTheme = {
  key: 'cap-3',
  level: 3,
  name: 'Cấp 3 (Trung học phổ thông)',
  color: {
    primary: '#334155',
    primaryHover: '#1E293B',
    primaryActive: '#0F172A',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E2E8F0',
    onPrimaryContainer: '#0F172A',
    accent: '#E7E5E4',
    onAccent: '#292524',
    background: '#FFFFFF',
    onBackground: '#0F172A',
    surface: '#FFFFFF',
    surfaceContainerLow: '#F8FAFC',
    onSurfaceVariant: '#475569',
    border: '#CBD5E1',
    correct: '#166534',
    correctContainer: '#DCFCE7',
    onCorrectContainer: '#14532D',
    incorrect: '#B91C1C',
    incorrectContainer: '#FEE2E2',
    onIncorrectContainer: '#7F1D1D',
    link: '#334155',
    focusRing: '#0F172A',
  },
  text: {
    bodySize: 16,
    bodyLineHeight: 24,
    questionSize: 18,
    questionLineHeight: 28,
    controlSize: 16,
    controlLineHeight: 24,
    headingSize: 26,
    headingLineHeight: 34,
  },
  radius: { control: 4, card: 6, option: 4 },
  touchTarget: 44,
  spacing: { block: 16, inline: 12 },
  illustrationSet: 'toi-gian',
  celebration: false,
};

export const LEARNING_THEMES: Readonly<Record<LearningThemeKey, LearningTheme>> = {
  'mac-dinh': DEFAULT_THEME,
  'cap-1': LEVEL_1_THEME,
  'cap-2': LEVEL_2_THEME,
  'cap-3': LEVEL_3_THEME,
};

/** Cấp học của một khối lớp; null nếu khối không hợp lệ (không phải số nguyên 1-12). */
export function schoolLevelOfGrade(grade: number | null | undefined): SchoolLevel | null {
  if (typeof grade !== 'number' || !Number.isInteger(grade) || grade < 1 || grade > 12) return null;
  if (grade <= 5) return 1;
  return grade <= 9 ? 2 : 3;
}

/** Nhãn cấp học trên giao diện. */
export const SCHOOL_LEVEL_LABEL: Readonly<Record<SchoolLevel, string>> = {
  1: 'Cấp 1 (Tiểu học)',
  2: 'Cấp 2 (Trung học cơ sở)',
  3: 'Cấp 3 (Trung học phổ thông)',
};

export function themeForLevel(level: SchoolLevel | null | undefined): LearningTheme {
  switch (level) {
    case 1:
      return LEVEL_1_THEME;
    case 2:
      return LEVEL_2_THEME;
    case 3:
      return LEVEL_3_THEME;
    default:
      return DEFAULT_THEME;
  }
}

/**
 * Bộ giao diện của một học sinh: ưu tiên cấp học máy chủ trả, không có thì suy từ khối lớp; chưa đăng nhập (null) dùng
 * bộ mặc định.
 */
export function themeForStudent(student: { schoolLevel?: SchoolLevel | null; class?: Pick<StudentClass, 'grade'> | null } | null): LearningTheme {
  if (!student) return DEFAULT_THEME;
  return themeForLevel(student.schoolLevel ?? schoolLevelOfGrade(student.class?.grade));
}

const px = (value: number) => `${value}px`;

/**
 * Biến CSS của một bộ giao diện cho web học tập. Ghi đè token ngữ nghĩa của design system (`--dsv-color-*`,
 * `--dsv-text-*`, `--dsv-radius-*`) nên component dùng chung với web quản trị tự đổi theo; thêm bốn biến riêng của khu học:
 * cỡ chữ câu hỏi, bo góc phương án, vùng bấm tối thiểu, khoảng cách giữa các khối.
 */
export function themeCssVariables(theme: LearningTheme): Record<string, string> {
  const { color, text, radius } = theme;
  return {
    '--dsv-color-primary': color.primary,
    '--dsv-color-primary-hover': color.primaryHover,
    '--dsv-color-primary-active': color.primaryActive,
    '--dsv-color-on-primary': color.onPrimary,
    '--dsv-color-primary-container': color.primaryContainer,
    '--dsv-color-on-primary-container': color.onPrimaryContainer,
    '--dsv-color-secondary-container': color.accent,
    '--dsv-color-on-secondary-container': color.onAccent,
    '--dsv-color-background': color.background,
    '--dsv-color-on-background': color.onBackground,
    '--dsv-color-surface': color.surface,
    '--dsv-color-on-surface': color.onBackground,
    '--dsv-color-surface-container-low': color.surfaceContainerLow,
    '--dsv-color-on-surface-variant': color.onSurfaceVariant,
    '--dsv-color-border': color.border,
    '--dsv-color-success': color.correct,
    '--dsv-color-success-container': color.correctContainer,
    '--dsv-color-on-success-container': color.onCorrectContainer,
    '--dsv-color-danger': color.incorrect,
    '--dsv-color-danger-container': color.incorrectContainer,
    '--dsv-color-on-danger-container': color.onIncorrectContainer,
    '--dsv-color-link': color.link,
    '--dsv-color-focus-ring': color.focusRing,
    '--dsv-text-body-m-size': px(text.bodySize),
    '--dsv-text-body-m-line-height': px(text.bodyLineHeight),
    '--dsv-text-control-size': px(text.controlSize),
    '--dsv-text-control-line-height': px(text.controlLineHeight),
    '--dsv-text-h1-size': px(text.headingSize),
    '--dsv-text-h1-line-height': px(text.headingLineHeight),
    '--dsv-radius-sm': px(radius.control),
    '--dsv-radius-md': px(radius.card),
    '--dsv-question-size': px(text.questionSize),
    '--dsv-question-line-height': px(text.questionLineHeight),
    '--dsv-option-radius': px(radius.option),
    '--dsv-touch-target': px(theme.touchTarget),
    '--dsv-block-gap': px(theme.spacing.block),
    '--dsv-inline-gap': px(theme.spacing.inline),
  };
}
