import { themeForLevel, themeForStudent, type LearningTheme } from '@dsvhvn/dung-chung/theme';
import { createContext, useContext, type ReactNode } from 'react';
import { useApp, useAuth } from '../state/AppProvider';

// Bộ giao diện theo cấp học dùng chung với web học tập (token trong gói dùng chung): học sinh đã đăng nhập nhận bộ của cấp lớp mình,
// khách và học sinh chưa đăng nhập dùng bộ mặc định. App đọc thẳng đối tượng token, không có biến CSS.

const ThemeContext = createContext<LearningTheme>(themeForLevel(null));

export function useTheme(): LearningTheme {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { mode } = useApp();
  const { session } = useAuth();
  const theme = mode === 'student' && session ? themeForStudent(session.user) : themeForLevel(null);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
