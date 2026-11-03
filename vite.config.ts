import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-ai': {
        target: 'https://ia-desktop.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-ai/, ''),
        secure: false,
      },
    },
  },
});
