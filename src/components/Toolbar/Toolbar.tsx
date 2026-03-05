import { Tab } from '../../types/electron';
import { ViewMode } from '../../App';
import { generateId } from '../../utils/id';
import { HelpPanel } from '../HelpPanel/HelpPanel';
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
      name: '未命名',
      content: '',
      isModified: false,
    };
    onFileOpen(newTab, true); // 新建文件
  };

  const handleOpenFile = async () => {
    // 检查是否在 Electron 环境中
    if (!window.electronAPI) {
      showToast(
        '文件操作仅在 Electron 应用中可用，请使用 "npm run electron:dev" 运行',
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
          showToast(`打开文件失败：${fileResult.error}`, 'error');
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '未知错误';
      showToast(`打开文件失败：${errorMessage}`, 'error');
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
          新建
        </button>
        <button onClick={handleOpenFile} className="toolbar-button">
          打开
        </button>
        <button
          onClick={handleSaveFile}
          className="toolbar-button"
          disabled={!activeTab || !activeTab.isModified}
        >
          保存
        </button>
      </div>
      <div className="toolbar-title">MD Editor</div>
      <div className="toolbar-right">
        {/* 视图切换按钮 */}
        <div className="view-mode-buttons">
          <button
            onClick={() => onViewModeChange('preview')}
            className={`toolbar-button ${viewMode === 'preview' ? 'active' : ''}`}
            title="仅显示预览效果"
          >
            预览
          </button>
          <button
            onClick={() => onViewModeChange('edit')}
            className={`toolbar-button ${viewMode === 'edit' ? 'active' : ''}`}
            title="仅显示编辑器"
          >
            编辑
          </button>
          <button
            onClick={() => onViewModeChange('live')}
            className={`toolbar-button ${viewMode === 'live' ? 'active' : ''}`}
            title="左侧编辑，右侧实时预览"
          >
            分屏
          </button>
        </div>
        {/* 帮助按钮 */}
        <HelpPanel />
      </div>
    </div>
  );
}
