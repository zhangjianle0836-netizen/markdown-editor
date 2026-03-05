/**
 * 跨平台路径工具函数
 */

/**
 * 从路径中提取文件名
 * 兼容 Windows 和 Unix 系统
 */
export const getFileName = (filePath: string): string => {
  if (!filePath) return 'Untitled';

  // 处理两种路径分隔符
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || 'Untitled';
};

/**
 * 规范化路径（统一使用正斜杠）
 */
export const normalizePath = (filePath: string): string => {
  return filePath.replace(/\\/g, '/');
};
