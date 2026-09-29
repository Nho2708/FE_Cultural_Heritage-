import { themeForStudent } from '@dsvhvn/dung-chung/theme';
import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '../lib/auth/context';
import { applyTheme } from './applyTheme';
import { LearningThemeContext } from './context';

// Chọn bộ giao diện theo cấp học của học sinh đang đăng nhập (khách dùng bộ mặc định) và ghi các biến CSS của bộ đó lên
// thẻ <html>. Ghi ở gốc tài liệu để cả token component (định nghĩa ở :root, trỏ về token ngữ nghĩa) cũng đổi theo.
// Mọi trang của web học tập — kể cả trang khám phá công khai — dùng cùng bố cục, chỉ khác giá trị token.

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const theme = useMemo(() => themeForStudent(user), [user]);

  // Ghi trước khi trình duyệt vẽ để không nháy bộ mặc định khi học sinh đã đăng nhập tải lại trang.
  useLayoutEffect(() => applyTheme(theme), [theme]);

  return <LearningThemeContext.Provider value={theme}>{children}</LearningThemeContext.Provider>;
}
