import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('file:save', filePath, content),

  // 对话框
  showOpenDialog: () => ipcRenderer.invoke('dialog:open'),
  showSaveDialog: () => ipcRenderer.invoke('dialog:save'),
  showMessageBox: (options: Electron.MessageBoxOptions) =>
    ipcRenderer.invoke('dialog:message', options),

  // 系统信息
  getHomePath: () => ipcRenderer.invoke('system:home'),
  getPendingFile: () => ipcRenderer.invoke('system:getPendingFile'),
  clearPendingFile: () => ipcRenderer.invoke('system:clearPendingFile'),

  // 文件关联打开监听
  onOpenFileFromSystem: (callback: (data: { path: string; name: string; content: string }) => void) => {
    ipcRenderer.on('file:openFromSystem', (_, data) => callback(data));
  },
  removeOpenFileFromSystemListener: () => {
    ipcRenderer.removeAllListeners('file:openFromSystem');
  },
});
