import { Tab } from '../../types/electron';
import { ViewMode } from '../../App';
import { generateId } from '../../utils/id';
import './Toolbar.css';

interface ToolbarProps {
  activeTab?: Tab;
  onFileOpen: (tab: Tab, isNewFile?: boolean) => void;
  onTabSave: (tabId: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function Toolbar({
  activeTab,
  onFileOpen,
  onTabSave,
  showToast,
  viewMode,
  onViewModeChange,
}: ToolbarProps) {
  const handleNewFile = () => {
    const newTab: Tab = {
      id: generateId(),
      path: '',
      name: 'Untitled',
      content: '',
      isModified: false,
    };
    onFileOpen(newTab, true); // 新建文件
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
          onFileOpen(newTab, false); // 打开已有文件
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
      <div className="toolbar-right">
        {/* 视图切换按钮 */}
        <div className="view-mode-buttons">
          <button
            onClick={() => onViewModeChange('preview')}
            className={`toolbar-button ${viewMode === 'preview' ? 'active' : ''}`}
            title="查看视图"
          >
            查看
          </button>
          <button
            onClick={() => onViewModeChange('edit')}
            className={`toolbar-button ${viewMode === 'edit' ? 'active' : ''}`}
            title="编辑视图"
          >
            编辑
          </button>
          <button
            onClick={() => onViewModeChange('live')}
            className={`toolbar-button ${viewMode === 'live' ? 'active' : ''}`}
            title="全部视图"
          >
            全部
          </button>
        </div>
      </div>
    </div>
  );
}
