import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_BASE lets the same build serve from a sub-path (GitHub Pages) or the root.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', sourcemap: false, target: 'es2022' },
});
