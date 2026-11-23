import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router'],
  },
  test: {
    server: {
      deps: {
        inline: [/dung-chung/, 'react', 'react-dom', 'react-router'],
      },
    },
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    env: { VITE_API_BASE_URL: 'http://api.test/api/v1', VITE_ADMIN_WEB_URL: 'http://quantri.test' },
    restoreMocks: true,
  },
});
