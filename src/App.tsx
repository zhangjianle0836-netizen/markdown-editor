import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorArea } from './components/EditorArea/EditorArea';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Toast } from './components/Toast/Toast';
import { Tab } from './types/electron';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { generateId } from './utils/id';
import { getFileName } from './utils/path';
import { getUnsavedChangesAction } from './utils/dialog';
import './App.css';

export type ViewMode = 'preview' | 'edit' | 'live';

type CurrentFileUpdater = (currentFile: Tab | null) => Tab | null;

export default function App() {
  const [currentFile, setCurrentFileState] = useState<Tab | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const pdfExportPendingRef = useRef(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const currentFileRef = useRef<Tab | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const { toasts, showToast, removeToast } = useToast();

  const updateCurrentFile = useCallback((updater: CurrentFileUpdater): Tab | null => {
    const nextFile = updater(currentFileRef.current);
    currentFileRef.current = nextFile;
    setCurrentFileState(nextFile);
    return nextFile;
  }, []);

  const saveTab = useCallback(
    (tab: Tab): Promise<boolean> => {
      const saveOperation = saveQueueRef.current.then(async () => {
        if (!window.electronAPI) {
          showToast(
            '文件操作仅在 Electron 应用中可用，请使用桌面应用运行',
            'info'
          );
          return false;
        }

        try {
          let targetPath = tab.path;
          if (!targetPath) {
            const dialogResult = await window.electronAPI.showSaveDialog();
            if (dialogResult.canceled || !dialogResult.filePath) {
              return false;
            }
            targetPath = dialogResult.filePath;
          }

          const result = await window.electronAPI.saveFile(
            targetPath,
            tab.content
          );
          if (!result.success) {
            showToast(`保存失败：${result.error}`, 'error');
            return false;
          }

          const savedRevision = tab.revision;
          const updatedFile = updateCurrentFile((current) => {
            if (current?.id !== tab.id) {
              return current;
            }

            return {
              ...current,
              path: targetPath,
              name: getFileName(targetPath),
              isModified: current.revision !== savedRevision,
            };
          });
          const savedLatestRevision =
            updatedFile?.id !== tab.id || updatedFile.revision === savedRevision;

          showToast(
            savedLatestRevision ? '文件保存成功' : '此前内容已保存，仍有新的未保存更改',
            savedLatestRevision ? 'success' : 'info'
          );
          return savedLatestRevision;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : '未知错误';
          showToast(`保存失败：${errorMessage}`, 'error');
          return false;
        }
      });

      saveQueueRef.current = saveOperation.then(
        () => undefined,
        () => undefined
      );
      return saveOperation;
    },
    [showToast, updateCurrentFile]
  );

  const canReplaceCurrentFile = useCallback(async (): Promise<boolean> => {
    const file = currentFileRef.current;
    if (!file || !file.isModified) {
      return true;
    }

    const action = await getUnsavedChangesAction(file.name, file.isModified);
    if (action === 'cancel') {
      return false;
    }
    if (action === 'discard') {
      return true;
    }

    return saveTab(file);
  }, [saveTab]);

  const handleFileOpen = useCallback(
    (file: Tab, isNewFile = false) => {
      updateCurrentFile(() => file);
      setViewMode(isNewFile ? 'edit' : 'preview');
    },
    [updateCurrentFile]
  );

  const openFileFromSystem = useCallback(
    async (data: { path: string; name: string; content: string }) => {
      if (!(await canReplaceCurrentFile())) {
        return;
      }

      handleFileOpen(
        {
          id: generateId(),
          path: data.path,
          name: data.name,
          content: data.content,
          isModified: false,
          revision: 0,
        },
        false
      );
    },
    [canReplaceCurrentFile, handleFileOpen]
  );

  const openFileFromSystemRef = useRef(openFileFromSystem);
  const canReplaceCurrentFileRef = useRef(canReplaceCurrentFile);

  useEffect(() => {
    openFileFromSystemRef.current = openFileFromSystem;
  }, [openFileFromSystem]);

  useEffect(() => {
    canReplaceCurrentFileRef.current = canReplaceCurrentFile;
  }, [canReplaceCurrentFile]);

  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }

    const unsubscribeOpen = window.electronAPI.onOpenFileFromSystem((data) =>
      openFileFromSystemRef.current(data)
    );
    const unsubscribeClose = window.electronAPI.onCloseRequested(async () => {
      try {
        const shouldClose = await canReplaceCurrentFileRef.current();
        await window.electronAPI.respondToCloseRequest(shouldClose);
      } catch {
        await window.electronAPI.respondToCloseRequest(false);
      }
    });

    void window.electronAPI.notifyRendererReady();

    return () => {
      unsubscribeOpen();
      unsubscribeClose();
    };
  }, []);

  const handleContentChange = useCallback(
    (content: string) => {
      updateCurrentFile((current) => {
        if (!current || current.content === content) {
          return current;
        }

        return {
          ...current,
          content,
          isModified: true,
          revision: current.revision + 1,
        };
      });
    },
    [updateCurrentFile]
  );

  const handleSave = useCallback(async () => {
    const file = currentFileRef.current;
    if (file) {
      await saveTab(file);
    }
  }, [saveTab]);

  const handleExportPdf = useCallback(async () => {
    const file = currentFileRef.current;
    if (!file || pdfExportPendingRef.current) {
      return;
    }
    if (!window.electronAPI) {
      showToast('请在桌面应用中导出 PDF', 'info');
      return;
    }

    pdfExportPendingRef.current = true;
    setIsExportingPdf(true);
    try {
      const { markdownToHTML } = await import('./utils/markdownRenderer');
      const result = await window.electronAPI.exportPdf({
        name: file.name,
        html: markdownToHTML(file.content),
      });
      if (result.canceled) {
        return;
      }
      if (result.success) {
        showToast('PDF 已导出', 'success');
      } else {
        showToast(`导出 PDF 失败：${result.error || '请重试'}`, 'error');
      }
    } catch (error) {
      showToast(`导出 PDF 失败：${error instanceof Error ? error.message : '请重试'}`, 'error');
    } finally {
      pdfExportPendingRef.current = false;
      setIsExportingPdf(false);
    }
  }, [showToast]);

  const handleNewFile = useCallback(async () => {
    if (!(await canReplaceCurrentFile())) {
      return;
    }

    handleFileOpen(
      {
        id: generateId(),
        path: '',
        name: '未命名',
        content: '',
        isModified: true,
        revision: 0,
      },
      true
    );
  }, [canReplaceCurrentFile, handleFileOpen]);

  const handleOpenFile = useCallback(async () => {
    if (!window.electronAPI) {
      showToast(
        '文件操作仅在 Electron 应用中可用，请使用桌面应用运行',
        'info'
      );
      return;
    }

    if (!(await canReplaceCurrentFile())) {
      return;
    }

    try {
      const result = await window.electronAPI.showOpenDialog();
      if (result.canceled || result.filePaths.length === 0) {
        return;
      }

      const filePath = result.filePaths[0];
      const fileResult = await window.electronAPI.readFile(filePath);
      if (!fileResult.success) {
        showToast(`打开文件失败：${fileResult.error}`, 'error');
        return;
      }

      handleFileOpen(
        {
          id: generateId(),
          path: filePath,
          name: getFileName(filePath),
          content: fileResult.content ?? '',
          isModified: false,
          revision: 0,
        },
        false
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '未知错误';
      showToast(`打开文件失败：${errorMessage}`, 'error');
    }
  }, [canReplaceCurrentFile, handleFileOpen, showToast]);

  useKeyboardShortcuts({
    onOpen: handleOpenFile,
    onSave: currentFile ? handleSave : undefined,
    onNew: handleNewFile,
  });

  return (
    <div className="app">
      <Toolbar
        activeTab={currentFile}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onTabSave={handleSave}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="main-container">
        <EditorArea
          tab={currentFile}
          onContentChange={handleContentChange}
          viewMode={viewMode}
          onNewFile={handleNewFile}
          onOpenFile={handleOpenFile}
        />
      </div>
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
