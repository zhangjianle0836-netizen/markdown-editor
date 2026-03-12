import { Suspense, lazy, memo, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash-es';
import { Tab } from '../../types/electron';
import { ViewMode } from '../../App';
import { MarkdownPreview } from './MarkdownPreview';
import './EditorArea.css';

interface EditorAreaProps {
  tab: Tab | null;
  onContentChange: (content: string) => void;
  viewMode: ViewMode;
  onNewFile?: () => void;
  onOpenFile?: () => void;
}

const LazyMarkdownEditor = lazy(() => import('./MarkdownEditorLoader'));

function EditorAreaComponent({
  tab,
  onContentChange,
  viewMode,
  onNewFile,
  onOpenFile,
}: EditorAreaProps) {
  const [content, setContent] = useState('');

  // 使用 ref 存储防抖函数
  const debouncedOnChangeRef = useRef(
    debounce((newContent: string) => {
      onContentChange(newContent);
    }, 300)
  );

  // 更新防抖函数的回调（避免重新创建）
  useEffect(() => {
    const debounced = debouncedOnChangeRef.current;
    debounced.cancel(); // 先取消之前的

    debouncedOnChangeRef.current = debounce((newContent: string) => {
      onContentChange(newContent);
    }, 300);

    return () => {
      debouncedOnChangeRef.current.cancel();
    };
  }, [onContentChange]);

  // 切换标签时更新内容
  useEffect(() => {
    if (tab) {
      setContent(tab.content);
      // 取消之前的防抖操作
      debouncedOnChangeRef.current.cancel();
    }
  }, [tab?.id]); // 只在标签 ID 变化时更新

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      debouncedOnChangeRef.current.cancel();
    };
  }, []);

  const handleChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    debouncedOnChangeRef.current(newContent);
  };

  if (!tab) {
    return (
      <div className="editor-area-empty">
        <div className="empty-state">
          <div className="welcome-badge">Preview-first Markdown Studio</div>
          <div className="welcome-icon">📝</div>
          <h2>欢迎使用 MD Editor</h2>
          <p>为长文阅读、说明文档和实时预览而设计的轻量工作区</p>
          <div className="welcome-highlights">
            <span>即时预览</span>
            <span>专注排版</span>
            <span>本地文件</span>
          </div>
          <div className="welcome-actions">
            <button className="welcome-button primary" onClick={onNewFile}>
              <span className="button-icon">📄</span>
              <span>新建文件</span>
            </button>
            <button className="welcome-button" onClick={onOpenFile}>
              <span className="button-icon">📂</span>
              <span>打开文件</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 根据 viewMode 设置预览模式
  const getPreviewMode = () => {
    switch (viewMode) {
      case 'edit':
        return 'edit';
      case 'live':
        return 'live';
      default:
        return 'edit';
    }
  };

  if (viewMode === 'preview') {
    return (
      <div className="editor-area">
        <MarkdownPreview content={content} />
      </div>
    );
  }

  return (
    <div className="editor-area">
      <Suspense fallback={<div className="editor-loading">编辑器加载中...</div>}>
        <LazyMarkdownEditor
          value={content}
          onChange={handleChange}
          height="100%"
          preview={getPreviewMode()}
          enableScroll={true}
          visibleDragbar={false}
          hideToolbar={true}
        />
      </Suspense>
    </div>
  );
}

export const EditorArea = memo(EditorAreaComponent);
