import type { ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RequireAccess } from '../access/RequireAccess';
import { SCREENS, screen, type ScreenKey } from '../access/screens';
import { FullScreenLayout, MainLayout, RootLayout } from '../components/layout/Layouts';
import { EmbedLayout } from '../embed/EmbedLayout';
import { EmbedIntroVideoPage } from '../embed/EmbedIntroVideoPage';
import { EmbedMapPage } from '../embed/EmbedMapPage';
import { EmbedModelPage } from '../embed/EmbedModelPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { NotFoundPage, RouteErrorPage } from '../pages/errors/ErrorPages';
import { GuestHistoryPage } from '../pages/GuestHistoryPage';
import { HeritageDetailPage } from '../pages/HeritageDetailPage';
import { HeritagePreviewPage } from '../pages/HeritagePreviewPage';
import { EnterCodePage } from '../pages/EnterCodePage';
import { HomePage } from '../pages/HomePage';
import { LearnHomePage } from '../pages/LearnHomePage';
import { LessonPage } from '../pages/LessonPage';
import { LoginPage } from '../pages/LoginPage';
import { MapPage } from '../pages/MapPage';
import { PendingScreen } from '../pages/PendingScreen';
import { ProgressPage } from '../pages/ProgressPage';
import { ResultPage } from '../pages/ResultPage';
import { SearchPage } from '../pages/SearchPage';
import { TakeQuizPage } from '../pages/TakeQuizPage';
import { TimelinePage } from '../pages/TimelinePage';
import { LazyAboutPage, LazyForSchoolsPage } from './lazyPages';
import type { RouteHandle } from './routeHandle';

// Khung route của web học tập: khám phá công khai (`/`, `/di-san`, `/ban-do`, `/dong-thoi-gian`, `/gioi-thieu`,
// `/nha-truong`) và khu học của học
// sinh (`/dang-nhap`, `/doi-mat-khau`, `/hoc`, `/nhap-ma`, `/bai-hoc/...`, `/ket-qua/...`, `/tien-do`). Mỗi route lấy
// đường dẫn và quyền từ SCREENS; màn hình chưa dựng hiện PendingScreen với đúng guard.

/** Màn hình đã dựng trong bản khung. */
const BUILT: Partial<Record<ScreenKey, ReactNode>> = {
  home: <HomePage />,
  search: <SearchPage />,
  map: <MapPage />,
  heritage: <HeritageDetailPage />,
  heritagePreview: <HeritagePreviewPage />,
  guestHistory: <GuestHistoryPage />,
  timeline: <TimelinePage />,
  about: <LazyAboutPage />,
  forSchools: <LazyForSchoolsPage />,
  login: <LoginPage />,
  changePassword: <ChangePasswordPage />,
  learnHome: <LearnHomePage />,
  enterCode: <EnterCodePage />,
  lesson: <LessonPage />,
  takeQuiz: <TakeQuizPage />,
  result: <ResultPage />,
  progress: <ProgressPage />,
};

function screenRoutes(filter: (fullScreen: boolean) => boolean): RouteObject[] {
  return SCREENS.filter((s) => s.path !== null && filter('fullScreen' in s && s.fullScreen)).flatMap((s) => {
    const target = screen(s.key);
    const element = <RequireAccess screen={target}>{BUILT[s.key] ?? <PendingScreen screen={target} />}</RequireAccess>;
    const paths = [target.path, ...(target.aliases ?? [])].filter((path): path is string => path !== null);
    const handle: RouteHandle = { area: s.area, hideFooter: 'hideFooter' in s && s.hideFooter };
    return paths.map((path): RouteObject => (path === '/' ? { index: true, element, handle } : { path, element, handle }));
  });
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <MainLayout />,
        children: [...screenRoutes((fullScreen) => !fullScreen), { path: '*', element: <NotFoundPage /> }],
      },
      { element: <FullScreenLayout />, children: screenRoutes((fullScreen) => fullScreen) },
      // Trang nhúng cho app mobile (WebView): bản đồ, trình xem 3D và video giới thiệu, công khai, không thanh điều hướng.
      {
        element: <EmbedLayout />,
        children: [
          { path: 'nhung/ban-do', element: <EmbedMapPage /> },
          { path: 'nhung/video-gioi-thieu', element: <EmbedIntroVideoPage /> },
          { path: 'nhung/3d/:slug', element: <EmbedModelPage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
