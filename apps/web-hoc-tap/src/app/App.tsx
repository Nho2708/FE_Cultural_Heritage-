import { SpeechNotice } from '@dsvhvn/dung-chung/lesson';
import { ThemeProvider } from '@dsvhvn/dung-chung/theme';
import { ToastProvider } from '@dsvhvn/dung-chung/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { createQueryClient } from './queryClient';
import { createAppRouter } from './router';

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultMode="light">
        <ToastProvider>
          <AuthProvider>
            <LanguageProvider>
              <RouterProvider router={router} />
              <SpeechNotice />
            </LanguageProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
