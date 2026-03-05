import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let pendingFilePath: string | null = null; // 待打开的文件路径

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    // 优化启动速度：使用背景色减少白屏时间
    backgroundColor: '#ffffff', // 浅色主题默认背景（与 CSS 一致）
    show: false, // 先隐藏窗口，等内容加载后再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 启用硬件加速
      enableWebSQL: false,
      spellcheck: false,
    },
    // 只在 macOS 上使用特定样式
    ...(isMac && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 15, y: 15 },
    }),
  });

  // 开发模式下加载本地服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // 生产环境也打开开发者工具（用于调试白屏问题）
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    console.log('[Main] Loading file from:', path.join(__dirname, '../dist/index.html'));
  }

  // ✅ 始终打开开发者工具（包括生产环境，用于调试）
  mainWindow.webContents.openDevTools();
  console.log('[Main] DevTools opened');

  // 优化：窗口准备好后再显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 优化：窗口准备好后再显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window is ready to show');
    mainWindow?.show();
  });

  // 监听加载事件
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[Main] Web contents started loading');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Web contents finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription);
  });

  // 捕获渲染进程错误
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main] Render process gone:', details);
  });

  // 捕获控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer]', message);
  });

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed');
    mainWindow = null;
  });

  // 窗口准备好后，打开待处理的文件
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingFilePath) {
      openFileInRenderer(pendingFilePath);
      pendingFilePath = null;
    }
  });
}

// 获取用户主目录
ipcMain.handle('system:home', () => {
  return app.getPath('home');
});

// 获取待打开的文件路径（用于渲染进程轮询）
ipcMain.handle('system:getPendingFile', () => {
  return pendingFilePath;
});

// 清除待打开的文件路径
ipcMain.handle('system:clearPendingFile', () => {
  pendingFilePath = null;
});

// 打开文件到渲染进程
async function openFileInRenderer(filePath: string) {
  if (!mainWindow) {
    pendingFilePath = filePath;
    return;
  }

  try {
    // 读取文件内容
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // 发送到渲染进程
    mainWindow.webContents.send('file:openFromSystem', {
      path: filePath,
      name: fileName,
      content: content,
    });
  } catch (error) {
    console.error('Failed to open file:', error);
  }
}

// 验证文件路径合法性
const validatePath = (filePath: string): boolean => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // 解析为绝对路径
    const resolved = path.resolve(filePath);

    // 基本安全检查
    // 1. 不允许路径遍历攻击
    if (resolved.includes('..')) {
      return false;
    }

    // 2. 不允许访问系统关键目录（Unix/macOS）
    const forbiddenPaths = ['/etc', '/usr', '/bin', '/sbin', '/var'];
    if (forbiddenPaths.some(p => resolved.startsWith(p))) {
      return false;
    }

    // 3. Windows 系统目录
    if (process.platform === 'win32') {
      const winForbidden = ['C:\\Windows', 'C:\\Program Files'];
      if (winForbidden.some(p => resolved.toLowerCase().startsWith(p.toLowerCase()))) {
        return false;
      }
    }

    // 允许访问用户主目录、桌面、文档、下载等常见目录
    return true;
  } catch {
    return false;
  }
};

// 文件读取
ipcMain.handle('file:read', async (_, filePath: string) => {
  try {
    // 验证路径
    if (!validatePath(filePath)) {
      return { success: false, error: 'Invalid file path. Access denied.' };
    }

    // 检查文件大小（限制 10MB）
    const stats = await fs.promises.stat(filePath);
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 10MB.',
      };
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 文件保存
ipcMain.handle('file:save', async (_, filePath: string, content: string) => {
  try {
    // 验证路径
    if (!validatePath(filePath)) {
      return { success: false, error: 'Invalid file path. Access denied.' };
    }

    // 检查内容大小（使用 Buffer 计算实际字节大小）
    const maxSize = 10 * 1024 * 1024; // 10MB
    const byteSize = Buffer.byteLength(content, 'utf-8');
    if (byteSize > maxSize) {
      return {
        success: false,
        error: 'Content too large. Maximum size is 10MB.',
      };
    }

    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 打开文件对话框
ipcMain.handle('dialog:open', async () => {
  if (!mainWindow) {
    return { canceled: true, filePaths: [] };
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });
  return result;
});

// 保存文件对话框
ipcMain.handle('dialog:save', async () => {
  if (!mainWindow) {
    return { canceled: true, filePath: undefined };
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'HTML', extensions: ['html'] },
      { name: 'PDF', extensions: ['pdf'] },
    ],
  });
  return result;
});

// 消息对话框
ipcMain.handle('dialog:message', async (_, options: Electron.MessageBoxOptions) => {
  if (!mainWindow) {
    return { response: 2 }; // Cancel
  }
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// 应用就绪
app.whenReady().then(() => {
  console.log('[Main] App is ready, creating window...');
  createWindow();
});

// 全局错误捕获
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

// 处理通过文件关联打开的文件（应用已运行时）
app.on('open-file', async (event, filePath) => {
  event.preventDefault();

  // 如果窗口已存在，直接打开
  if (mainWindow) {
    await openFileInRenderer(filePath);
  } else {
    // 窗口不存在，保存路径等待窗口创建
    pendingFilePath = filePath;
    createWindow();
  }
});

// 处理应用启动时的命令行参数
const args = process.argv.slice(1);
const fileArg = args.find(arg => arg.endsWith('.md') || arg.endsWith('.markdown'));
if (fileArg && fs.existsSync(fileArg)) {
  pendingFilePath = fileArg;
}

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
