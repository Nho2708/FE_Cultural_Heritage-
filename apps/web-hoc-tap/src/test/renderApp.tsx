import type { StudentProfile } from '@dsvhvn/dung-chung/api';
import { ToastProvider } from '@dsvhvn/dung-chung/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '../app/queryClient';
import { routes } from '../app/router';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { sessionStore } from '../lib/auth/session';
import { sessionOf, studentOf } from './fixtures';

// Dựng toàn bộ ứng dụng trên cây route thật (src/app/router.tsx) tại một đường dẫn, không dựng cây giả.

export function renderApp(path: string, state?: unknown) {
  const [pathname = '/', search] = path.split('?');
  const router = createMemoryRouter(routes, { initialEntries: [{ pathname, search: search ? `?${search}` : '', state }] });
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { router, ...view };
}

export function signInAs(student: StudentProfile = studentOf()) {
  sessionStore.setSession(sessionOf(student));
}
