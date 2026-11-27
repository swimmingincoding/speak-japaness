import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // 로컬 개발 환경 등에서는 무시
      });
    }
    // iOS Safari / 홈 화면 웹앱(PWA)에서 맞춤 언어팩(IndexedDB)과 오프라인 캐시가 임의 삭제되지 않도록 영구 보관 요청
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().catch(() => {
        // ignore
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
