import { useState, useCallback, useEffect } from 'react';
import { EditorArea } from './components/EditorArea/EditorArea';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Toast } from './components/Toast/Toast';
import { Tab } from './types/electron';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { generateId } from './utils/id';
import { getFileName } from './utils/path';
import { checkCanCloseTab } from './utils/dialog';
import './App.css';

// 调试面板组件
function DebugPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    // 捕获控制台错误
    const originalError = console.error;
    console.error = (...args) => {
      addLog(`❌ ERROR: ${args.join(' ')}`);
      originalError.apply(console, args);
    };

    // 捕获控制台警告
    const originalWarn = console.warn;
    console.warn = (...args) => {
      addLog(`⚠️ WARN: ${args.join(' ')}`);
      originalWarn.apply(console, args);
    };

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      addLog(`🔥 GLOBAL ERROR: ${event.message}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
      addLog(`🔥 UNHANDLED PROMISE: ${event.reason}`);
    });

    addLog('✅ App component loaded');
    addLog(`📍 Electron API: ${window.electronAPI ? 'Available' : 'NOT Available'}`);
    addLog(`🌐 Platform: ${navigator.platform}`);
    addLog(`📦 Environment: ${import.meta.env.MODE}`);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          zIndex: 10000,
          padding: '8px 16px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        🐛 Show Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        width: 400,
        maxHeight: 300,
        background: '#1a1a1a',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: 12,
        borderRadius: 8,
        overflow: 'auto',
        zIndex: 10000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong style={{ color: '#00ff00' }}>🐛 Debug Panel</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ff0000',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ borderBottom: '1px solid #333', marginBottom: 8, paddingBottom: 8 }}>
        <div>React: ✅ Loaded</div>
        <div>Electron: {window.electronAPI ? '✅' : '❌'}</div>
        <div>DOM Ready: {document.readyState}</div>
      </div>
      <div style={{ fontSize: 10 }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: 4, color: log.includes('ERROR') ? '#ff0000' : log.includes('WARN') ? '#ffaa00' : '#00ff00' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [currentFile, setCurrentFile] = useState<Tab | null>(null);
  const { toasts, showToast, removeToast } = useToast();

  // 处理从系统打开文件
  const openFileFromSystem = useCallback(async (data: { path: string; name: string; content: string }) => {
    // 检查当前文件是否有未保存的更改
    if (currentFile && currentFile.isModified) {
      const canClose = await checkCanCloseTab(
        currentFile.name,
        currentFile.isModified
      );
      if (!canClose) return;
    }

    setCurrentFile({
      id: generateId(),
      path: data.path,
      name: data.name,
      content: data.content,
      isModified: false,
    });
  }, [currentFile]);

  // 监听从系统打开文件的事件
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onOpenFileFromSystem(openFileFromSystem);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeOpenFileFromSystemListener();
      }
    };
  }, [openFileFromSystem]);

  const handleContentChange = useCallback((content: string) => {
    if (currentFile) {
      setCurrentFile({ ...currentFile, content, isModified: true });
    }
  }, [currentFile]);

  const handleSave = useCallback(async () => {
    if (!currentFile) return;

    try {
      if (currentFile.path) {
        const result = await window.electronAPI.saveFile(
          currentFile.path,
          currentFile.content
        );
        if (result.success) {
          setCurrentFile({ ...currentFile, isModified: false });
          showToast('File saved successfully', 'success');
        } else {
          showToast(`Failed to save: ${result.error}`, 'error');
        }
      } else {
        // 如果没有路径，提示保存对话框
        const dialogResult = await window.electronAPI.showSaveDialog();
        if (!dialogResult.canceled && dialogResult.filePath) {
          const result = await window.electronAPI.saveFile(
            dialogResult.filePath,
            currentFile.content
          );
          if (result.success) {
            const fileName = getFileName(dialogResult.filePath);
            setCurrentFile({
              ...currentFile,
              path: dialogResult.filePath,
              name: fileName,
              isModified: false,
            });
            showToast('File saved successfully', 'success');
          } else {
            showToast(`Failed to save: ${result.error}`, 'error');
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to save: ${errorMessage}`, 'error');
    }
  }, [currentFile, showToast]);

  const handleNewFile = useCallback(async () => {
    // 检查当前文件是否有未保存的更改
    if (currentFile && currentFile.isModified) {
      const canClose = await checkCanCloseTab(
        currentFile.name,
        currentFile.isModified
      );
      if (!canClose) return;
    }

    setCurrentFile({
      id: generateId(),
      path: '',
      name: 'Untitled',
      content: '',
      isModified: false,
    });
  }, [currentFile]);

  const handleOpenFile = useCallback(async () => {
    // 检查当前文件是否有未保存的更改
    if (currentFile && currentFile.isModified) {
      const canClose = await checkCanCloseTab(
        currentFile.name,
        currentFile.isModified
      );
      if (!canClose) return;
    }

    try {
      const result = await window.electronAPI.showOpenDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileName = getFileName(filePath);

        const fileResult = await window.electronAPI.readFile(filePath);
        if (fileResult.success && fileResult.content) {
          setCurrentFile({
            id: generateId(),
            path: filePath,
            name: fileName,
            content: fileResult.content,
            isModified: false,
          });
        } else {
          showToast(`Failed to open file: ${fileResult.error}`, 'error');
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to open file: ${errorMessage}`, 'error');
    }
  }, [currentFile, showToast]);

  // 键盘快捷键
  useKeyboardShortcuts({
    onOpen: handleOpenFile,
    onSave: currentFile ? handleSave : undefined,
    onNew: handleNewFile,
  });

  return (
    <>
      <div className="app">
        <Toolbar
          activeTab={currentFile}
          onFileOpen={(file) => setCurrentFile(file)}
          onTabSave={handleSave}
          showToast={showToast}
        />
        <div className="main-container">
          <EditorArea tab={currentFile} onContentChange={handleContentChange} />
        </div>
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
      <DebugPanel />
    </>
  );
}
