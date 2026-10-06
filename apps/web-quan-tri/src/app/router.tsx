import type { StaffRole } from '@dsvhvn/dung-chung/api';
import type { ReactNode } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { RequireAccess } from '../access/RequireAccess';
import { AREA_ROOT, SCREENS, pathOf, screen, type Area, type ScreenKey } from '../access/screens';
import { AuthFrameLayout, RootLayout } from '../components/layout/Layouts';
import { LoginPage } from '../pages/auth/LoginPage';
import { PasswordPage } from '../pages/auth/PasswordPage';
import { ForbiddenPage, NotFoundPage, RouteErrorPage } from '../pages/errors/ErrorPages';
import { PendingScreen } from '../pages/PendingScreen';
import { HomeRedirect, OutsideNotFound } from './fallbackRoutes';
import { ProfilePage } from '../pages/profile/ProfilePage';
import {
  AiQuestionsPage,
  AreaRoute,
  AuditLogPage,
  ClassDetailPage,
  ClassesPage,
  HeritageEditorPage,
  HeritagesPage,
  LessonEditorPage,
  LessonsPage,
  OwnAreaRoute,
  QuestionBankPage,
  QuizEditorPage,
  QuizResultsPage,
  QuizzesPage,
  SchoolDetailPage,
  SchoolInfoPage,
  SchoolsPage,
  StudentRecordPage,
  TeachersPage,
} from './areas';

// Khung route của web quản trị: xác thực (Đăng nhập, Quên / đặt mật khẩu), Hồ sơ cá nhân, khu giáo viên `/giao-vien`,
// khu quản trị trường `/truong`, khu quản trị hệ thống `/quan-tri`. Mỗi route lấy đường dẫn và quyền từ SCREENS; màn
// hình chưa dựng hiện PendingScreen với đúng guard, khi dựng chỉ cần thay phần tử trong BUILT.

/** Màn hình đã dựng. */
const BUILT: Partial<Record<ScreenKey, ReactNode>> = {
  login: <LoginPage />,
  password: <PasswordPage />,
  profile: <ProfilePage />,
  // Tới khi hai màn hình tổng quan được dựng: /truong mở Giáo viên của trường, /quan-tri mở Quản lý trường.
  schoolOverview: <Navigate to={pathOf('schoolTeachers')} replace />,
  schoolInfo: <SchoolInfoPage />,
  schoolTeachers: <TeachersPage />,
  adminOverview: <Navigate to={pathOf('schools')} replace />,
  schools: <SchoolsPage />,
  schoolDetail: <SchoolDetailPage />,
  heritages: <HeritagesPage />,
  heritageEditor: <HeritageEditorPage />,
  auditLog: <AuditLogPage />,
  classes: <ClassesPage />,
  classDetail: <ClassDetailPage />,
  lessons: <LessonsPage />,
  lessonEditor: <LessonEditorPage />,
  questionBank: <QuestionBankPage />,
  aiQuestions: <AiQuestionsPage />,
  quizzes: <QuizzesPage />,
  quizEditor: <QuizEditorPage />,
  quizResults: <QuizResultsPage />,
  studentRecord: <StudentRecordPage />,
};

/** Route (kèm guard) cho các màn hình có URL trong `keys`. `base` là đường dẫn của route cha (thành route index). */
function screenRoutes(keys: readonly ScreenKey[], base?: string): RouteObject[] {
  return keys.flatMap((key) => {
    const target = screen(key);
    const element = <RequireAccess screen={target}>{BUILT[key] ?? <PendingScreen screen={target} />}</RequireAccess>;
    const paths = [target.path, ...(target.aliases ?? [])].filter((path): path is string => path !== null);
    return paths.map((path): RouteObject => (path === base ? { index: true, element } : { path, element }));
  });
}

function keysOf(area: Area): ScreenKey[] {
  return SCREENS.filter((s) => s.area === area && s.path !== null).map((s) => s.key);
}

/** Cổng của một khu làm việc: chỉ vai trò của khu mới tải chunk; vai trò khác thấy trang 403 trong khu của mình. */
function areaRoute(path: string, role: StaffRole, children: RouteObject[]): RouteObject {
  return {
    path,
    element: (
      <RequireAccess
        actors={[role]}
        forbidden={
          <OwnAreaRoute>
            <ForbiddenPage />
          </OwnAreaRoute>
        }
      >
        <AreaRoute role={role} />
      </RequireAccess>
    ),
    children: [...children, { path: '*', element: <NotFoundPage /> }],
  };
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { element: <AuthFrameLayout />, children: screenRoutes(['login', 'password']) },
      // Hồ sơ cá nhân dùng chung ba vai trò: hiện trong khu làm việc của người đang đăng nhập.
      {
        element: (
          <RequireAccess screen={screen('profile')}>
            <OwnAreaRoute />
          </RequireAccess>
        ),
        children: screenRoutes(['profile']),
      },
      // /giao-vien chuyển tới Lớp học.
      areaRoute(AREA_ROOT.teacher, 'TEACHER', [
        { index: true, element: <Navigate to={pathOf('classes')} replace /> },
        ...screenRoutes(keysOf('teacher')),
      ]),
      areaRoute(AREA_ROOT.school, 'ORG_ADMIN', screenRoutes(keysOf('school'), AREA_ROOT.school)),
      areaRoute(AREA_ROOT.admin, 'ADMIN', screenRoutes(keysOf('admin'), AREA_ROOT.admin)),
      { path: '*', element: <OutsideNotFound /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
