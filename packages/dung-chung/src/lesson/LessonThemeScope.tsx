import type { ReactNode } from 'react';
import type { SchoolLevel } from '../api';
import { themeForLevel } from '../theme';
import { lessonScopeStyle } from './lessonScopeStyle';
import { LearningThemeContext } from './themeContext';

// Bộ giao diện của một cấp học, ghi trên một khối thay vì trên <html>: dùng khi cần xem bố cục của cấp ngay trong trang có bộ
// giao diện khác (giáo viên "xem như học sinh" trong web quản trị). Các token của component định nghĩa ở :root trỏ về token
// ngữ nghĩa nên không tự đổi theo khối con; những token mà bố cục bài học dùng được ghi lại ở lessonScopeStyle.

export function LessonThemeScope({ level, children }: { level: SchoolLevel | null; children: ReactNode }) {
  const theme = themeForLevel(level);
  return (
    <LearningThemeContext.Provider value={theme}>
      <div
        data-bo-giao-dien={theme.key}
        style={lessonScopeStyle(level)}
        className="rounded-md bg-background text-on-background"
      >
        {children}
      </div>
    </LearningThemeContext.Provider>
  );
}
