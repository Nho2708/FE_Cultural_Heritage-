import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setTtsBaseUrl } from '@dsvhvn/dung-chung/lesson';
import { App } from './app/App';
import { API_BASE_URL } from './config/env';
import './styles/index.css';

setTtsBaseUrl(API_BASE_URL);

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử #root trong index.html.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
