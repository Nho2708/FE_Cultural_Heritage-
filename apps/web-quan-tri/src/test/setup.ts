import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { sessionStore } from '../lib/auth/session';

// Lần render đầu của mỗi tệp còn phải nạp module (trang tải lười); máy bận hoặc chạy song song nhiều tệp có thể quá 1 giây mặc định.
configure({ asyncUtilTimeout: 4000 });

// jsdom không cài window.scrollTo (ScrollRestoration của React Router gọi tới).
Object.defineProperty(window, 'scrollTo', { value: vi.fn<() => void>(), writable: true });

afterEach(() => {
  cleanup();
  sessionStore.clear();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});
