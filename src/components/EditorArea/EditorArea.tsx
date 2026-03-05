import { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash-es';
import MarkdownEditor from '@uiw/react-md-editor';
import { Tab } from '../../types/electron';
import { ViewMode } from '../../App';
import './EditorArea.css';

interface EditorAreaProps {
  tab?: Tab;
  onContentChange: (content: string) => void;
  viewMode: ViewMode;
  onNewFile?: () => void;
  onOpenFile?: () => void;
}

export function EditorArea({ tab, onContentChange, viewMode, onNewFile, onOpenFile }: EditorAreaProps) {
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
          <div className="welcome-icon">📝</div>
          <h2>欢迎使用 MD Editor</h2>
          <p>开始创建或打开一个 Markdown 文档</p>
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
  // 'preview' -> 只显示预览，隐藏工具栏
  // 'edit' -> 只显示编辑器
  // 'live' -> 显示编辑器和预览
  const getPreviewMode = () => {
    switch (viewMode) {
      case 'preview':
        return 'preview';
      case 'edit':
        return 'edit';
      case 'live':
        return 'live';
      default:
        return 'preview';
    }
  };

  return (
    <div className="editor-area">
      <MarkdownEditor
        value={content}
        onChange={handleChange}
        height="100%"
        preview={getPreviewMode()}
        enableScroll={true}
        visibleDragbar={false}
        hideToolbar={true} // 始终隐藏编辑器工具栏，使用自定义 Toolbar
      />
    </div>
  );
}
