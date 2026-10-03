import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('commonjsHelpers') ||
              /\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (/\/node_modules\/(marked|dompurify)\//.test(id)) return 'markdown-vendor';
          if (id.includes('/node_modules/')) return 'editor-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      maxWorkers: 2,
      compress: {
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    cssCodeSplit: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['@uiw/react-md-editor', 'marked', 'dompurify'],
    exclude: ['electron'],
  },
});
