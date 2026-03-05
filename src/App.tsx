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
  );
}
