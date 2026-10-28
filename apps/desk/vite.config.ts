import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the Desk talks to a running `counterpart desk` server
// through the Vite proxy, so the browser sees one origin and SSE just works.
const api = process.env.COUNTERPART_API ?? 'http://127.0.0.1:4747';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: api, changeOrigin: false } },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
