import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Cổng 5173 cố định cho web quản trị: CORS của backend (Cors:AllowedOrigins) và liên kết đặt mật khẩu trong thư
// (App:FrontendBaseUrl) đều trỏ về http://localhost:5173. Web học tập chạy ở cổng 5174.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
