import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { sessionStore } from '../lib/auth/session';

// jsdom không cài window.scrollTo (ScrollRestoration của React Router gọi tới).
Object.defineProperty(window, 'scrollTo', { value: vi.fn<() => void>(), writable: true });

afterEach(() => {
  cleanup();
  sessionStore.clear();
  window.sessionStorage.clear();
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-bo-giao-dien');
  vi.unstubAllGlobals();
});
