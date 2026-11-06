import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const FAVICON_HREF = '/favicon-efficientia.svg?v=20261106';

function enforceOfficialFavicon() {
  if (typeof document === 'undefined') return;
  const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = FAVICON_HREF;
    document.head.appendChild(link);
    return;
  }
  links.forEach((link) => {
    if (link.getAttribute('href') !== FAVICON_HREF) {
      link.setAttribute('href', FAVICON_HREF);
    }
  });
}

enforceOfficialFavicon();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
