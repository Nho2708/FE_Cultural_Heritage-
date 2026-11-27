import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setTtsAccessTokenProvider, setTtsBaseUrl } from '@dsvhvn/dung-chung/lesson';
import { App } from './app/App';
import { API_BASE_URL } from './config/env';
import { sessionStore } from './lib/auth/session';
import './styles/index.css';

setTtsBaseUrl(API_BASE_URL);
// Giọng đọc của máy chủ chỉ phục vụ người đã đăng nhập; chưa có phiên thì dùng giọng trình duyệt.
setTtsAccessTokenProvider(() => sessionStore.getSession()?.accessToken ?? null);

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử #root trong index.html.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
