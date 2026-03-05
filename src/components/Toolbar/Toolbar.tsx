import { Tab } from '../../types/electron';
import { generateId } from '../../utils/id';
import './Toolbar.css';

interface ToolbarProps {
  activeTab?: Tab;
  onFileOpen: (tab: Tab) => void;
  onTabSave: (tabId: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function Toolbar({
  activeTab,
  onFileOpen,
  onTabSave,
  showToast,
}: ToolbarProps) {
  const handleNewFile = () => {
    const newTab: Tab = {
      id: generateId(),
      path: '',
      name: 'Untitled',
      content: '',
      isModified: false,
    };
    onFileOpen(newTab);
  };

  const handleOpenFile = async () => {
    // 检查是否在 Electron 环境中
    if (!window.electronAPI) {
      showToast(
        'File operations are only available in the Electron app. Please use "npm run electron:dev" to run in Electron mode.',
        'info'
      );
      return;
    }

    try {
      const result = await window.electronAPI.showOpenDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];

        // 获取文件名
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;

        const fileResult = await window.electronAPI.readFile(filePath);
        if (fileResult.success && fileResult.content) {
          const newTab: Tab = {
            id: generateId(),
            path: filePath,
            name: fileName,
            content: fileResult.content,
            isModified: false,
          };
          onFileOpen(newTab);
        } else {
          showToast(`Failed to open file: ${fileResult.error}`, 'error');
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to open file: ${errorMessage}`, 'error');
    }
  };

  const handleSaveFile = async () => {
    if (activeTab) {
      onTabSave(activeTab.id);
    }
  };

  // 检测是否为 macOS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className={`toolbar ${isMac ? 'toolbar-macos' : ''}`}>
      <div className="toolbar-left">
        <button onClick={handleNewFile} className="toolbar-button">
          New
        </button>
        <button onClick={handleOpenFile} className="toolbar-button">
          Open
        </button>
        <button
          onClick={handleSaveFile}
          className="toolbar-button"
          disabled={!activeTab || !activeTab.isModified}
        >
          Save
        </button>
      </div>
      <div className="toolbar-title">MD Editor</div>
      <div className="toolbar-right">{/* 可扩展功能按钮 */}</div>
    </div>
  );
}
