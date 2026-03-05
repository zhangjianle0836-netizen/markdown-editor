import { OpenDialogReturnValue, SaveDialogReturnValue, MessageBoxReturnValue } from 'electron';

export interface Tab {
  id: string;
  path: string;
  name: string;
  content: string;
  isModified: boolean;
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
  showOpenDialog: () => Promise<OpenDialogReturnValue>;
  showSaveDialog: () => Promise<SaveDialogReturnValue>;
  showMessageBox: (options: Electron.MessageBoxOptions) => Promise<MessageBoxReturnValue>;
  getHomePath: () => Promise<string>;
  getPendingFile: () => Promise<string | null>;
  clearPendingFile: () => Promise<void>;
  onOpenFileFromSystem: (callback: (data: { path: string; name: string; content: string }) => void) => void;
  removeOpenFileFromSystemListener: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
