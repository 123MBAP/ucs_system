import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './Src'),
      'Src': path.resolve(__dirname, './Src'),
    },
  },
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
});
