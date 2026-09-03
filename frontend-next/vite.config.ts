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
      // Proxy API calls in dev so the browser talks to one origin and cookies
      // / CORS are a non-issue. Every backend router prefix is listed here.
      '^/(auth|stock|extract|match|confirm|invoices|customers|business|dashboard)(/|$)': {
        target: apiBaseUrl,
        changeOrigin: true,
      },
    },
  },
});
