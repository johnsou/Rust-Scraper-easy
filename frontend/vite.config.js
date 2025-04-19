// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy any request starting with /api to your Rust backend
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        secure: false,
        // No rewrite needed, backend expects /api/scrape
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});
