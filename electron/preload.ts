import { contextBridge, ipcRenderer } from 'electron';
import type { PdfExportRequest } from './pdf';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('file:save', filePath, content),
  getRecoveryDraft: () => ipcRenderer.invoke('draft:recover'),
  updateRecoveryDraft: (draft: { name: string; content: string } | null) =>
    ipcRenderer.invoke('draft:update', draft),

  exportPdf: (request: PdfExportRequest) => ipcRenderer.invoke('file:exportPdf', request),

  // 对话框
  showOpenDialog: () => ipcRenderer.invoke('dialog:open'),
  showSaveDialog: () => ipcRenderer.invoke('dialog:save'),
  showUnsavedChangesDialog: (tabName: string) =>
    ipcRenderer.invoke('dialog:unsavedChanges', tabName),

  // 生命周期
  notifyRendererReady: () => ipcRenderer.invoke('renderer:ready'),
  respondToCloseRequest: (shouldClose: boolean) =>
    ipcRenderer.invoke('app:closeResponse', shouldClose),

  // 文件关联打开监听
  onOpenFileFromSystem: (
    callback: (data: { path: string; name: string; content: string }) =>
      | void
      | Promise<void>
  ) => {
    let queue = Promise.resolve();
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { path: string; name: string; content: string }
    ) => {
      queue = queue.then(() => callback(data)).catch((error) => {
        console.error('[Preload] Failed to process system file:', error);
      });
    };
    ipcRenderer.on('file:openFromSystem', listener);
    return () => ipcRenderer.removeListener('file:openFromSystem', listener);
  },
  onCloseRequested: (callback: () => void | Promise<void>) => {
    const listener = () => {
      void Promise.resolve(callback()).catch((error) => {
        console.error('[Preload] Failed to process close request:', error);
      });
    };
    ipcRenderer.on('app:requestClose', listener);
    return () => ipcRenderer.removeListener('app:requestClose', listener);
  },
});
