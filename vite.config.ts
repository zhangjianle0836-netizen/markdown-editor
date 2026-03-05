import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin } from 'vite';

// 移除 modulepreload 标签的插件
function removeModulePreload(): Plugin {
  return {
    name: 'remove-module-preload',
    transformIndexHtml(html) {
      // 移除所有的 modulepreload 标签，实现真正的按需加载
      return html.replace(/<link rel="modulepreload"[^>]*>\n?/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), removeModulePreload()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 代码分割优化 - 简化配置避免循环依赖
    rollupOptions: {
      output: {
        // 简化的代码分割，避免循环依赖
        manualChunks: {
          // React 生态
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    // 提高块大小警告限制
    chunkSizeWarningLimit: 1000,
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // 移除 console.log
      },
    },
    // CSS 代码分割
    cssCodeSplit: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['@uiw/react-md-editor', 'marked', 'dompurify'],
    exclude: ['electron'], // Electron 不需要预构建
  },
});
