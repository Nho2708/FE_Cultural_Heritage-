import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Cổng 5174 cố định cho web học tập (web quản trị ở 5173). CORS của backend (Cors:AllowedOrigins) phải có
// http://localhost:5174 thì trình duyệt mới gọi được API.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
});
