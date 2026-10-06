import { LEARNING_THEMES, type LearningTheme } from '../theme';
import { createContext, useContext } from 'react';

export const LearningThemeContext = createContext<LearningTheme>(LEARNING_THEMES['mac-dinh']);

/** Bộ giao diện đang dùng: component đọc giá trị (bộ hình minh họa, cờ hiệu ứng chúc mừng), không rẽ nhánh theo cấp. */
export function useLearningTheme(): LearningTheme {
  return useContext(LearningThemeContext);
}
