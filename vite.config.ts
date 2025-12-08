import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  publicDir: path.resolve(__dirname, 'frontend/public'),
  resolve: {
    alias: {
      'pdfjs-dist/legacy/build/pdf': 'pdfjs-dist/legacy/build/pdf.mjs'
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
