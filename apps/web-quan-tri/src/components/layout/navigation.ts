import type { StaffRole } from '@dsvhvn/dung-chung/api';
import type { IconName } from '@dsvhvn/dung-chung/ui';
import { canOpen } from '../../access/access';
import { pathOf, screen, type ScreenKey } from '../../access/screens';

// Mục điều hướng suy ra từ ma trận phân quyền: mục nào vai trò không mở được thì không hiện.

export interface NavItem {
  to: string;
  label: string;
  icon?: IconName;
}

interface NavSpec {
  screen: ScreenKey;
  label: string;
  icon?: IconName;
}

function build(specs: readonly NavSpec[], role: StaffRole | null | undefined): NavItem[] {
  return specs
    .filter((s) => canOpen(screen(s.screen), role))
    .map((s) => ({ to: pathOf(s.screen), label: s.label, icon: s.icon }));
}

/** Menu tài khoản: Hồ sơ. Lối vào khu làm việc lấy từ `workArea` của vai trò. */
const ACCOUNT: readonly NavSpec[] = [{ screen: 'profile', label: 'Hồ sơ', icon: 'user' }];

/** Thanh bên /giao-vien: Lớp học · Bài học · Ngân hàng câu hỏi · Bài kiểm tra. */
const TEACHER: readonly NavSpec[] = [
  { screen: 'classes', label: 'Lớp học', icon: 'users' },
  { screen: 'lessons', label: 'Bài học', icon: 'book-open' },
  { screen: 'questionBank', label: 'Ngân hàng câu hỏi', icon: 'shield-check' },
  { screen: 'quizzes', label: 'Bài kiểm tra', icon: 'check' },
];

/** Thanh bên /truong: Tổng quan · Trường và gói · Giáo viên. */
const SCHOOL: readonly NavSpec[] = [
  { screen: 'schoolOverview', label: 'Tổng quan', icon: 'bar-chart' },
  { screen: 'schoolInfo', label: 'Trường và gói', icon: 'building' },
  { screen: 'schoolTeachers', label: 'Giáo viên', icon: 'users' },
];

/** Thanh bên /quan-tri: Tổng quan · Trường · Di sản · Bản dịch · Câu hỏi · Gói dịch vụ · Nhật ký. */
const ADMIN: readonly NavSpec[] = [
  { screen: 'adminOverview', label: 'Tổng quan', icon: 'bar-chart' },
  { screen: 'schools', label: 'Trường', icon: 'building' },
  { screen: 'heritages', label: 'Di sản', icon: 'map-pin' },
  { screen: 'translationReview', label: 'Bản dịch', icon: 'languages' },
  { screen: 'questionModeration', label: 'Câu hỏi', icon: 'shield-check' },
  { screen: 'plans', label: 'Gói dịch vụ', icon: 'star' },
  { screen: 'auditLog', label: 'Nhật ký', icon: 'file-text' },
];

export const accountNav = (role: StaffRole | null | undefined) => build(ACCOUNT, role);
export const teacherNav = (role: StaffRole | null | undefined) => build(TEACHER, role);
export const schoolNav = (role: StaffRole | null | undefined) => build(SCHOOL, role);
export const adminNav = (role: StaffRole | null | undefined) => build(ADMIN, role);
