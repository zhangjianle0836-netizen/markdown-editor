import { OpenDialogReturnValue, SaveDialogReturnValue } from 'electron';

export interface Tab {
  id: string;
  path: string;
  name: string;
  content: string;
  isModified: boolean;
  revision: number;
}

export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface FileSaveResult {
  success: boolean;
  error?: string;
}

export interface ElectronAPI {
  readFile: (filePath: string) => Promise<FileReadResult>;
  saveFile: (filePath: string, content: string) => Promise<FileSaveResult>;
  exportPdf: (request: { name: string; html: string }) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }>;
  showOpenDialog: () => Promise<OpenDialogReturnValue>;
  showSaveDialog: () => Promise<SaveDialogReturnValue>;
  showUnsavedChangesDialog: (tabName: string) => Promise<{ response: number }>;
  notifyRendererReady: () => Promise<boolean>;
  respondToCloseRequest: (shouldClose: boolean) => Promise<boolean>;
  onOpenFileFromSystem: (
    callback: (data: { path: string; name: string; content: string }) =>
      | void
      | Promise<void>
  ) => () => void;
  onCloseRequested: (callback: () => void | Promise<void>) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
