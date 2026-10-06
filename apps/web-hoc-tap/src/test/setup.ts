import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { sessionStore } from '../lib/auth/session';

// jsdom không cài window.scrollTo (ScrollRestoration của React Router gọi tới).
Object.defineProperty(window, 'scrollTo', { value: vi.fn<() => void>(), writable: true });

// Trình duyệt của người dùng thử nghiệm dùng tiếng Việt: ngôn ngữ mặc định lần đầu mở theo trình duyệt (test ngôn ngữ khác tự đặt lựa chọn).
Object.defineProperty(window.navigator, 'languages', { value: ['vi-VN', 'vi'], configurable: true });
Object.defineProperty(window.navigator, 'language', { value: 'vi-VN', configurable: true });

afterEach(() => {
  cleanup();
  sessionStore.clear();
  window.sessionStorage.clear();
  window.localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('data-bo-giao-dien');
  vi.unstubAllGlobals();
});
