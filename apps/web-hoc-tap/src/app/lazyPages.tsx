import { lazy, Suspense } from 'react';

// Hai trang giới thiệu, trang Chính sách quyền riêng tư và Album di sản (chỉ học sinh cấp 1 mở) tách thành phần tải riêng: người xem
// Trang chủ, bản đồ hay khu học không phải tải chúng.

const AboutPage = lazy(() => import('../pages/AboutPage').then((module) => ({ default: module.AboutPage })));
const ForSchoolsPage = lazy(() => import('../pages/ForSchoolsPage').then((module) => ({ default: module.ForSchoolsPage })));
const AlbumPage = lazy(() => import('../pages/AlbumPage').then((module) => ({ default: module.AlbumPage })));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));

const FALLBACK = <div className="min-h-[60dvh]" aria-busy="true" />;

export function LazyAboutPage() {
  return (
    <Suspense fallback={FALLBACK}>
      <AboutPage />
    </Suspense>
  );
}

export function LazyForSchoolsPage() {
  return (
    <Suspense fallback={FALLBACK}>
      <ForSchoolsPage />
    </Suspense>
  );
}

export function LazyPrivacyPage() {
  return (
    <Suspense fallback={FALLBACK}>
      <PrivacyPage />
    </Suspense>
  );
}

export function LazyAlbumPage() {
  return (
    <Suspense fallback={FALLBACK}>
      <AlbumPage />
    </Suspense>
  );
}
