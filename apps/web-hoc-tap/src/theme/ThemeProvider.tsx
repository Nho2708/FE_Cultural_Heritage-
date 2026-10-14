import { LEARNING_THEMES, themeForStudent, useTheme } from '@dsvhvn/dung-chung/theme';
import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useMatches } from 'react-router';
import { isRouteHandle } from '../app/routeHandle';
import { useAuth } from '../lib/auth/context';
import { applyTheme } from './applyTheme';
import { LearningThemeContext } from '@dsvhvn/dung-chung/lesson';

// Chọn bộ giao diện và ghi các biến CSS của bộ đó lên thẻ <html>. Bộ theo cấp học của học sinh chỉ dùng ở khu học
// (trang học, nhập mã, bài học, làm bài kiểm tra, kết quả, tiến độ, đổi mật khẩu); các trang khám phá công khai (trang
// chủ, tìm kiếm, bản đồ, chi tiết di sản, dòng thời gian) luôn dùng bộ mặc định, kể cả khi học sinh đã đăng nhập.
// Chế độ tối (dark mode) chỉ dành cho khách tham quan; học sinh luôn dùng nền sáng theo cấp học.

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { mode } = useTheme();
  const inLearningArea = useMatches().some((match) => isRouteHandle(match.handle) && match.handle.area === 'learning');
  const theme = useMemo(() => (inLearningArea ? themeForStudent(user) : LEARNING_THEMES['mac-dinh']), [inLearningArea, user]);

  // Ghi trước khi trình duyệt vẽ để không nháy bộ mặc định khi học sinh đã đăng nhập tải lại trang.
  useLayoutEffect(() => {
    if (user) {
      // Học sinh đã đăng nhập: không áp dụng dark mode, luôn giữ giao diện sáng
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // Khách tham quan: dùng giao diện sáng / tối / theo hệ thống do khách chọn
      document.documentElement.setAttribute('data-theme', mode);
    }
    applyTheme(theme);
  }, [theme, user, mode]);

  return <LearningThemeContext.Provider value={theme}>{children}</LearningThemeContext.Provider>;
}
