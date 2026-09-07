import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Backend base URL for the FastAPI service. Defaults to the local dev server.
// Override with VITE_API_BASE_URL in .env.local for other environments.
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      // Proxy API calls to the backend. Some prefixes (/dashboard, /customers,
      // /business) double as client routes, so page navigations go to the SPA.
      '^/(auth|stock|extract|match|confirm|invoices|customers|business|dashboard)(/|$)': {
        target: apiBaseUrl,
        changeOrigin: true,
        bypass: (req) => (req.headers.accept?.includes('text/html') ? '/index.html' : undefined),
      },
    },
  },
});
