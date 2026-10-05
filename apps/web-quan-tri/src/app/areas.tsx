import type { StaffRole } from '@dsvhvn/dung-chung/api';
import { lazy, Suspense, type ReactNode } from 'react';
import { useAuth } from '../lib/auth/context';

// Ba khu làm việc /giao-vien, /truong, /quan-tri và màn hình của chúng tách chunk riêng: chỉ tải khi route guard của
// khu đã cho qua, nên vai trò khác không tải mã của khu không phải của mình.

const TeacherArea = lazy(() => import('../areas/teacher/TeacherArea'));
const SchoolArea = lazy(() => import('../areas/school/SchoolArea'));
const AdminArea = lazy(() => import('../areas/admin/AdminArea'));

/** Màn hình trong khu làm việc (tải lười; AreaLayout bọc Suspense quanh nội dung). */
export const SchoolInfoPage = lazy(() => import('../pages/school/SchoolInfoPage'));
export const TeachersPage = lazy(() => import('../pages/school/TeachersPage'));
export const SchoolsPage = lazy(() => import('../pages/admin/SchoolsPage'));
export const SchoolDetailPage = lazy(() => import('../pages/admin/SchoolDetailPage'));
export const HeritagesPage = lazy(() => import('../pages/admin/HeritagesPage'));
export const HeritageEditorPage = lazy(() => import('../pages/admin/HeritageEditorPage'));
export const ClassesPage = lazy(() => import('../pages/teacher/ClassesPage'));
export const ClassDetailPage = lazy(() => import('../pages/teacher/ClassDetailPage'));
export const LessonsPage = lazy(() => import('../pages/teacher/LessonsPage'));
export const QuestionBankPage = lazy(() => import('../pages/teacher/QuestionBankPage'));
export const AiQuestionsPage = lazy(() => import('../pages/teacher/AiQuestionsPage'));
export const LessonEditorPage = lazy(() => import('../pages/teacher/LessonEditorPage'));
export const AuditLogPage = lazy(() => import('../pages/admin/AuditLogPage'));

function AreaFallback() {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-dvh items-center justify-center type-body-m text-on-surface-variant"
    >
      Đang tải…
    </div>
  );
}

const AREA_OF: Record<StaffRole, typeof TeacherArea> = {
  TEACHER: TeacherArea,
  ORG_ADMIN: SchoolArea,
  ADMIN: AdminArea,
};

/** Khung khu làm việc của một vai trò; `children` thay cho route con (ví dụ trang 403 ở cổng khu). */
export function AreaRoute({ role, children }: { role: StaffRole; children?: ReactNode }) {
  const Area = AREA_OF[role];
  return (
    <Suspense fallback={<AreaFallback />}>
      <Area>{children}</Area>
    </Suspense>
  );
}

/**
 * Khung khu làm việc của người đang đăng nhập — dùng cho màn hình chung của ba vai trò (Hồ sơ cá nhân) và cho trang
 * 403 khi mở nhầm khu của vai trò khác, để người dùng vẫn có thanh bên và menu tài khoản của mình.
 */
export function OwnAreaRoute({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null; // route guard đã chặn Khách
  return <AreaRoute role={user.role}>{children}</AreaRoute>;
}
