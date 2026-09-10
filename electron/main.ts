import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type IpcMainInvokeEvent,
} from 'electron';
import * as crypto from 'crypto';
import { getPdfFileName, isPdfExportRequest, isPdfFilePath, renderPdf, type PdfExportResult } from './pdf';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import {
  findSupportedFileArgument,
  isSafeExternalUrl,
  matchesTrustedRendererUrl,
  normalizePathKey,
} from './security';

let mainWindow: BrowserWindow | null = null;
let rendererReady = false;
let closeRequestPending = false;
let forceClose = false;
let isQuitting = false;
let isDrainingOpenQueue = false;
let pdfExportPending = false;

const pendingFilePaths: string[] = [];
const readablePaths = new Set<string>();
const writablePaths = new Set<string>();
const MAX_MARKDOWN_FILE_SIZE = 10 * 1024 * 1024;

const getRendererEntryUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000/';
  }

  return pathToFileURL(path.join(__dirname, '../dist/index.html')).toString();
};

const isTrustedRendererUrl = (rawUrl: string): boolean => {
  return matchesTrustedRendererUrl(rawUrl, getRendererEntryUrl());
};

const isTrustedIpcSender = (event: IpcMainInvokeEvent): boolean => {
  return Boolean(
    mainWindow &&
      event.sender === mainWindow.webContents &&
      event.senderFrame &&
      isTrustedRendererUrl(event.senderFrame.url)
  );
};

const grantFileAccess = (filePath: string): void => {
  const key = normalizePathKey(filePath);
  if (!key) {
    return;
  }

  readablePaths.add(key);
  writablePaths.add(key);
};

const hasFileAccess = (
  filePath: string,
  access: 'read' | 'write'
): boolean => {
  const key = normalizePathKey(filePath);
  if (!key) {
    return false;
  }

  return access === 'read' ? readablePaths.has(key) : writablePaths.has(key);
};

const openExternalUrl = (rawUrl: string): void => {
  if (!isSafeExternalUrl(rawUrl)) {
    return;
  }

  void shell.openExternal(rawUrl).catch((error) => {
    console.error('[Main] Failed to open external URL:', error);
  });
};

const configureNavigationProtection = (window: BrowserWindow): void => {
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (isTrustedRendererUrl(targetUrl)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(targetUrl);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });
};

const atomicWriteFile = async (
  filePath: string,
  content: string | Buffer
): Promise<void> => {
  const directory = path.dirname(filePath);
  const filename = path.basename(filePath);
  const temporaryPath = path.join(
    directory,
    `.${filename}.${process.pid}.${crypto.randomUUID()}.tmp`
  );

  let mode = 0o600;
  try {
    const existingStats = await fs.promises.stat(filePath);
    mode = existingStats.mode & 0o777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  let temporaryFile: fs.promises.FileHandle | null = null;
  try {
    temporaryFile = await fs.promises.open(temporaryPath, 'wx', mode);
    await temporaryFile.writeFile(content, { encoding: 'utf-8' });
    await temporaryFile.sync();
    await temporaryFile.close();
    temporaryFile = null;
    await fs.promises.rename(temporaryPath, filePath);
  } catch (error) {
    if (temporaryFile) {
      await temporaryFile.close().catch(() => undefined);
    }
    await fs.promises.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
};

const readLocalMarkdownFile = async (
  filePath: string,
  requireGrant = true
): Promise<{ success: boolean; content?: string; error?: string }> => {
  try {
    const normalizedPath = normalizePathKey(filePath);
    if (!normalizedPath || (requireGrant && !hasFileAccess(filePath, 'read'))) {
      return { success: false, error: 'File access was not authorized.' };
    }

    const stats = await fs.promises.stat(normalizedPath);
    if (!stats.isFile()) {
      return { success: false, error: 'Path is not a file.' };
    }

    if (stats.size > MAX_MARKDOWN_FILE_SIZE) {
      return {
        success: false,
        error: 'File too large. Maximum size is 10MB.',
      };
    }

    const content = await fs.promises.readFile(normalizedPath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

function queueFileOpen(filePath: string): void {
  const normalizedPath = path.resolve(filePath);
  if (!pendingFilePaths.includes(normalizedPath)) {
    pendingFilePaths.push(normalizedPath);
  }

  if (mainWindow && rendererReady) {
    void drainPendingFiles();
  }
}

const openFileInRenderer = async (filePath: string): Promise<void> => {
  if (!mainWindow || !rendererReady) {
    queueFileOpen(filePath);
    return;
  }

  const targetWindow = mainWindow;
  const normalizedPath = path.resolve(filePath);
  grantFileAccess(normalizedPath);
  const fileResult = await readLocalMarkdownFile(normalizedPath, false);
  if (!fileResult.success) {
    if (!targetWindow.isDestroyed()) {
      await dialog.showMessageBox(targetWindow, {
        type: 'error',
        title: '无法打开文件',
        message: `无法打开“${path.basename(normalizedPath)}”`,
        detail: fileResult.error || '未知错误',
      });
    }
    return;
  }

  if (
    mainWindow !== targetWindow ||
    targetWindow.isDestroyed() ||
    !rendererReady
  ) {
    queueFileOpen(normalizedPath);
    return;
  }

  targetWindow.webContents.send('file:openFromSystem', {
    path: normalizedPath,
    name: path.basename(normalizedPath),
    content: fileResult.content ?? '',
  });
};

const drainPendingFiles = async (): Promise<void> => {
  if (isDrainingOpenQueue || !mainWindow || !rendererReady) {
    return;
  }

  isDrainingOpenQueue = true;
  try {
    while (pendingFilePaths.length > 0 && mainWindow && rendererReady) {
      const filePath = pendingFilePaths.shift();
      if (filePath) {
        await openFileInRenderer(filePath);
      }
    }
  } finally {
    isDrainingOpenQueue = false;
  }
};

function createWindow(): void {
  const isMac = process.platform === 'darwin';
  rendererReady = false;
  closeRequestPending = false;
  forceClose = false;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
    },
    ...(isMac && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 15, y: 15 },
    }),
  });

  configureNavigationProtection(mainWindow);

  if (process.env.NODE_ENV === 'development') {
    void mainWindow.loadURL(getRendererEntryUrl());
    mainWindow.webContents.openDevTools();
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-start-navigation', (details) => {
    // Heading anchors keep React and its IPC listeners alive.
    if (details.isMainFrame && !details.isSameDocument) {
      rendererReady = false;
    }
  });

  mainWindow.on('close', (event) => {
    if (forceClose || !rendererReady || !mainWindow) {
      return;
    }

    event.preventDefault();
    if (!closeRequestPending) {
      closeRequestPending = true;
      mainWindow.webContents.send('app:requestClose');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    rendererReady = false;
    closeRequestPending = false;
    forceClose = false;
  });
}

const registerIpcHandlers = (): void => {
  ipcMain.handle('renderer:ready', async (event) => {
    if (!isTrustedIpcSender(event)) {
      return false;
    }

    rendererReady = true;
    void drainPendingFiles();
    return true;
  });

  ipcMain.handle('app:closeResponse', async (event, shouldClose: boolean) => {
    if (!isTrustedIpcSender(event) || typeof shouldClose !== 'boolean') {
      return false;
    }

    closeRequestPending = false;
    if (!shouldClose || !mainWindow) {
      isQuitting = false;
      return true;
    }

    forceClose = true;
    if (isQuitting) {
      app.quit();
    } else {
      mainWindow.close();
    }
    return true;
  });

  ipcMain.handle('file:read', async (event, filePath: string) => {
    if (!isTrustedIpcSender(event)) {
      return { success: false, error: 'Untrusted IPC sender.' };
    }
    return readLocalMarkdownFile(filePath);
  });

  ipcMain.handle(
    'file:save',
    async (event, filePath: string, content: string) => {
      if (!isTrustedIpcSender(event)) {
        return { success: false, error: 'Untrusted IPC sender.' };
      }

      try {
        const normalizedPath = normalizePathKey(filePath);
        if (!normalizedPath || !hasFileAccess(filePath, 'write')) {
          return { success: false, error: 'File access was not authorized.' };
        }

        if (typeof content !== 'string') {
          return { success: false, error: 'Invalid file content.' };
        }

        const byteSize = Buffer.byteLength(content, 'utf-8');
        if (byteSize > MAX_MARKDOWN_FILE_SIZE) {
          return {
            success: false,
            error: 'Content too large. Maximum size is 10MB.',
          };
        }

        await atomicWriteFile(normalizedPath, content);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  );

  ipcMain.handle('file:exportPdf', async (event, request: unknown): Promise<PdfExportResult> => {
    if (!isTrustedIpcSender(event) || !mainWindow) {
      return { success: false, error: 'Untrusted IPC sender.' };
    }
    if (!isPdfExportRequest(request)) {
      return { success: false, error: '导出内容无效或超过 20MB。' };
    }
    if (pdfExportPending) {
      return { success: false, error: '正在导出 PDF，请稍候。' };
    }

    pdfExportPending = true;
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '导出 PDF',
        defaultPath: getPdfFileName(request.name),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }
      if (!isPdfFilePath(result.filePath)) {
        return { success: false, error: '请使用 .pdf 文件扩展名。' };
      }

      const pdf = await renderPdf(request);
      await atomicWriteFile(result.filePath, pdf);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      pdfExportPending = false;
    }
  });

  ipcMain.handle('dialog:open', async (event) => {
    if (!isTrustedIpcSender(event) || !mainWindow) {
      return { canceled: true, filePaths: [] };
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        {
          name: 'Markdown',
          extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    result.filePaths.forEach(grantFileAccess);
    return result;
  });

  ipcMain.handle('dialog:save', async (event) => {
    if (!isTrustedIpcSender(event) || !mainWindow) {
      return { canceled: true, filePath: undefined };
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });
    if (result.filePath) {
      grantFileAccess(result.filePath);
    }
    return result;
  });

  ipcMain.handle(
    'dialog:unsavedChanges',
    async (event, tabName: string) => {
      if (!isTrustedIpcSender(event) || !mainWindow) {
        return { response: 2 };
      }

      const safeTabName =
        typeof tabName === 'string' && tabName.trim()
          ? tabName.trim().slice(0, 200)
          : '未命名';
      return dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['保存', '不保存', '取消'],
        defaultId: 0,
        cancelId: 2,
        title: '未保存的更改',
        message: `是否保存“${safeTabName}”的更改？`,
        detail: '如果不保存，当前更改将会丢失。',
      });
    }
  );
};

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled Rejection:', reason);
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  registerIpcHandlers();

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    queueFileOpen(filePath);

    if (app.isReady() && !mainWindow) {
      createWindow();
    }
  });

  app.on('second-instance', (_event, commandLine) => {
    const filePath = findSupportedFileArgument(commandLine);
    if (filePath) {
      queueFileOpen(filePath);
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  const initialFilePath = findSupportedFileArgument(process.argv.slice(1));
  if (initialFilePath) {
    queueFileOpen(initialFilePath);
  }

  void app.whenReady().then(() => {
    if (!mainWindow) {
      createWindow();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
