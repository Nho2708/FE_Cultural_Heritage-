import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { sessionStore } from '../lib/auth/session';

// jsdom không cài window.scrollTo (ScrollRestoration của React Router gọi tới).
Object.defineProperty(window, 'scrollTo', { value: vi.fn<() => void>(), writable: true });

// Mọi trang biên tập di sản nạp bản đồ Leaflet (import động) ngay lần đầu của mỗi tệp test; chừa thời gian cho lần dịch mã đó.
configure({ asyncUtilTimeout: 4000 });

// jsdom không đo kích thước và không có SVG đầy đủ: Leaflet (bản đồ chọn tọa độ) cần cả hai để dựng bản đồ.
Object.defineProperty(SVGElement.prototype, 'createSVGRect', { value: () => ({}), configurable: true });
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 360, configurable: true });
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 288, configurable: true });

afterEach(() => {
  cleanup();
  sessionStore.clear();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});
