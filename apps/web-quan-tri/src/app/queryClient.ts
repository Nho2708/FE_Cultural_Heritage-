import { ApiError } from '@dsvhvn/dung-chung/api';
import { QueryClient } from '@tanstack/react-query';

// Lỗi 4xx là kết quả nghiệp vụ, thử lại không đổi được gì; chỉ thử lại một lần với lỗi mạng / 5xx.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
