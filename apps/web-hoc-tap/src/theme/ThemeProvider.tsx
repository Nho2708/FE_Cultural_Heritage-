import { LEARNING_THEMES, themeForStudent } from '@dsvhvn/dung-chung/theme';
import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useMatches } from 'react-router';
import { isRouteHandle } from '../app/routeHandle';
import { useAuth } from '../lib/auth/context';
import { applyTheme } from './applyTheme';
import { LearningThemeContext } from '@dsvhvn/dung-chung/lesson';

// Chọn bộ giao diện và ghi các biến CSS của bộ đó lên thẻ <html>. Bộ theo cấp học của học sinh chỉ dùng ở khu học
// (trang học, nhập mã, bài học, làm bài kiểm tra, kết quả, tiến độ, đổi mật khẩu); các trang khám phá công khai (trang
// chủ, tìm kiếm, bản đồ, chi tiết di sản, dòng thời gian) luôn dùng bộ mặc định, kể cả khi học sinh đã đăng nhập.
// Ghi ở gốc tài liệu để cả token component (định nghĩa ở :root, trỏ về token ngữ nghĩa) cũng đổi theo.
// Đặt bên trong router vì phải biết đang ở khu nào.

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const inLearningArea = useMatches().some((match) => isRouteHandle(match.handle) && match.handle.area === 'learning');
  const theme = useMemo(() => (inLearningArea ? themeForStudent(user) : LEARNING_THEMES['mac-dinh']), [inLearningArea, user]);

  // Ghi trước khi trình duyệt vẽ để không nháy bộ mặc định khi học sinh đã đăng nhập tải lại trang.
  useLayoutEffect(() => applyTheme(theme), [theme]);

  return <LearningThemeContext.Provider value={theme}>{children}</LearningThemeContext.Provider>;
}
