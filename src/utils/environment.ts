/**
 * 环境检测工具
 */

/**
 * 检测是否在 Electron 环境中运行
 */
export const isElectron = (): boolean => {
  return !!window.electronAPI;
};

/**
 * 检测是否在浏览器环境中运行
 */
export const isBrowser = (): boolean => {
  return !isElectron();
};

/**
 * 检测操作系统
 */
export const getPlatform = (): 'mac' | 'windows' | 'linux' | 'unknown' => {
  const platform = navigator.platform.toUpperCase();

  if (platform.includes('MAC')) return 'mac';
  if (platform.includes('WIN')) return 'windows';
  if (platform.includes('LINUX')) return 'linux';

  return 'unknown';
};

/**
 * 检测是否为 macOS
 */
export const isMac = (): boolean => {
  return getPlatform() === 'mac';
};

/**
 * 获取环境信息
 */
export const getEnvironment = () => {
  return {
    isElectron: isElectron(),
    isBrowser: isBrowser(),
    platform: getPlatform(),
    isMac: isMac(),
  };
};
