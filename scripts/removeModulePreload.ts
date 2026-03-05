import type { Plugin } from 'vite';

/**
 * 移除 modulepreload 标签的 Vite 插件
 * 用于实现真正的按需加载
 */
export default function removeModulePreload(): Plugin {
  return {
    name: 'remove-module-preload',
    transformIndexHtml(html) {
      // 移除所有的 modulepreload 标签
      return html.replace(/<link rel="modulepreload"[^>]*>\n?/g, '');
    },
  };
}
