import { ToastProvider } from '@dsvhvn/dung-chung/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { originOf, servePreviewToken } from '@dsvhvn/dung-chung/auth';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router/dom';
import { LEARNING_WEB_URL } from '../config/env';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { sessionStore } from '../lib/auth/session';
import { createQueryClient } from './queryClient';
import { createAppRouter } from './router';

/**
 * Token cho tab xem trước bản nháp: chỉ quản trị hệ thống đang đăng nhập, chỉ cho cửa sổ do chính trang này vừa mở và chỉ gửi
 * tới đúng nguồn gốc web học tập (xem dung-chung/auth/previewToken).
 */
function usePreviewTokenServer() {
  useEffect(() => {
    const learningOrigin = originOf(LEARNING_WEB_URL);
    if (!learningOrigin) return;
    return servePreviewToken({
      learningOrigin,
      getToken: () => {
        const session = sessionStore.getSession();
        return session?.user.role === 'ADMIN' ? session.accessToken : null;
      },
    });
  }, []);
}

export function App() {
  usePreviewTokenServer();
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
