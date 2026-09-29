import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    env: { VITE_API_BASE_URL: 'http://api.test/api/v1', VITE_LEARNING_WEB_URL: 'http://hoc.test' },
    restoreMocks: true,
  },
});
