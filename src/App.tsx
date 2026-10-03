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
  const documentOperationRef = useRef(0);
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
          const latestFile = currentFileRef.current;
          let targetPath = tab.path || (latestFile?.id === tab.id ? latestFile.path : '');
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
            updatedFile?.id === tab.id && updatedFile.revision === savedRevision;

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

  const canReplaceCurrentFile = useCallback(async (operation: number): Promise<boolean> => {
    const file = currentFileRef.current;
    if (!file || !file.isModified) {
      return true;
    }

    const action = await getUnsavedChangesAction(file.name, file.isModified);
    const current = currentFileRef.current;
    if (operation !== documentOperationRef.current || current?.id !== file.id ||
        current.revision !== file.revision) {
      return false;
    }
    if (action === 'cancel') {
      return false;
    }
    if (action === 'discard') {
      return true;
    }

    return await saveTab(file) && operation === documentOperationRef.current;
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
      const operation = ++documentOperationRef.current;
      if (!(await canReplaceCurrentFile(operation)) || operation !== documentOperationRef.current) {
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
      const operation = ++documentOperationRef.current;
      try {
        let shouldClose = await canReplaceCurrentFileRef.current(operation) &&
          operation === documentOperationRef.current;
        if (shouldClose) {
          const closingFile = currentFileRef.current;
          await window.electronAPI.updateRecoveryDraft(null);
          const current = currentFileRef.current;
          shouldClose = operation === documentOperationRef.current &&
            current?.id === closingFile?.id && current?.revision === closingFile?.revision;
        }
        await window.electronAPI.respondToCloseRequest(shouldClose);
      } catch {
        await window.electronAPI.respondToCloseRequest(false);
      }
    });

    let active = true;
    const startupOperation = documentOperationRef.current;
    void (async () => {
      try {
        const draft = await window.electronAPI.getRecoveryDraft();
        if (active && draft && documentOperationRef.current === startupOperation) {
          updateCurrentFile(() => ({
            id: generateId(), path: '', name: draft.name, content: draft.content,
            isModified: true, revision: 0,
          }));
          setViewMode('edit');
          showToast('已恢复未保存的草稿，请选择保存位置', 'info');
        }
      } catch (error) {
        console.error('Failed to recover draft:', error);
      } finally {
        if (active) await window.electronAPI.notifyRendererReady();
      }
    })();

    return () => {
      active = false;
      unsubscribeOpen();
      unsubscribeClose();
    };
  }, [showToast, updateCurrentFile]);

  useEffect(() => {
    if (!window.electronAPI || !currentFile) return;
    const persistDraft = () => {
      void window.electronAPI.updateRecoveryDraft(currentFile.isModified ? {
        name: currentFile.name, content: currentFile.content,
      } : null).catch((error) => console.error('Failed to back up draft:', error));
    };
    if (!currentFile.isModified) {
      persistDraft();
      return;
    }
    const timeout = window.setTimeout(persistDraft, 750);
    return () => window.clearTimeout(timeout);
  }, [currentFile]);

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
    const operation = ++documentOperationRef.current;
    if (!(await canReplaceCurrentFile(operation)) || operation !== documentOperationRef.current) {
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

    const operation = ++documentOperationRef.current;
    if (!(await canReplaceCurrentFile(operation)) || operation !== documentOperationRef.current) {
      return;
    }
    const authorizedFile = currentFileRef.current;

    try {
      const result = await window.electronAPI.showOpenDialog();
      if (result.canceled || result.filePaths.length === 0) {
        return;
      }

      const filePath = result.filePaths[0];
      const fileResult = await window.electronAPI.readFile(filePath);
      if (operation !== documentOperationRef.current) return;
      if (!fileResult.success) {
        showToast(`打开文件失败：${fileResult.error}`, 'error');
        return;
      }

      const current = currentFileRef.current;
      if ((current?.id !== authorizedFile?.id || current?.revision !== authorizedFile?.revision) &&
          !(await canReplaceCurrentFile(operation))) {
        return;
      }
      if (operation !== documentOperationRef.current) return;

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
