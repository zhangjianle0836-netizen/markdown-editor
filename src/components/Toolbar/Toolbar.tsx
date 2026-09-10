import { Tab } from '../../types/electron';
import { ViewMode } from '../../App';
import { HelpPanel } from '../HelpPanel/HelpPanel';
import './Toolbar.css';

interface ToolbarProps {
  activeTab: Tab | null;
  onNewFile: () => void;
  onOpenFile: () => void;
  onTabSave: () => void;
  onExportPdf: () => void;
  isExportingPdf: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function Toolbar({
  activeTab,
  onNewFile,
  onOpenFile,
  onTabSave,
  onExportPdf,
  isExportingPdf,
  viewMode,
  onViewModeChange,
}: ToolbarProps) {
  const handleSaveFile = async () => {
    if (activeTab) {
      onTabSave();
    }
  };

  // 检测是否为 macOS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const documentName = activeTab?.name || 'Preview-first workspace';
  const documentMeta = activeTab
    ? activeTab.isModified ? '未保存更改' : '已保存'
    : '打开一个 Markdown 文档开始阅读或创作';

  return (
    <div className={`toolbar ${isMac ? 'toolbar-macos' : ''}`}>
      <div className="toolbar-left">
        <button onClick={onNewFile} className="toolbar-button toolbar-button-primary">
          新建
        </button>
        <button onClick={onOpenFile} className="toolbar-button">
          打开
        </button>
        <button
          onClick={handleSaveFile}
          className="toolbar-button"
          disabled={!activeTab || !activeTab.isModified}
        >
          保存
        </button>
        <button
          onClick={onExportPdf}
          className="toolbar-button"
          disabled={!activeTab || isExportingPdf}
          aria-busy={isExportingPdf}
          title="将当前内容导出为 PDF，包含未保存的更改"
        >
          {isExportingPdf ? '正在导出…' : '导出 PDF'}
        </button>
      </div>
      <div className="toolbar-title">
        <span className="toolbar-title-eyebrow">Markdown Atelier</span>
        <strong className="toolbar-title-main">{documentName}</strong>
        <span className="toolbar-title-meta">{documentMeta}</span>
      </div>
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
