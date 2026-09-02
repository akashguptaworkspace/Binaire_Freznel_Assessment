import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: the React app runs on :5173 and proxies /api to the backend on :4000
// (run the backend repo with `npm start`).
// Prod: set VITE_API_BASE to the deployed backend URL (Render), or open the app
// once with ?api=<backend-url> — it's remembered in localStorage.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
