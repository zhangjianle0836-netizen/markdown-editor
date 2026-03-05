import { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash-es';
import MarkdownEditor from '@uiw/react-md-editor';
import { Tab } from '../../types/electron';
import './EditorArea.css';

interface EditorAreaProps {
  tab?: Tab;
  onContentChange: (tabId: string, content: string) => void;
}

export function EditorArea({ tab, onContentChange }: EditorAreaProps) {
  const [content, setContent] = useState('');

  // 使用 ref 存储防抖函数
  const debouncedOnChangeRef = useRef(
    debounce((tabId: string, newContent: string) => {
      onContentChange(tabId, newContent);
    }, 300)
  );

  // 更新防抖函数的回调（避免重新创建）
  useEffect(() => {
    const debounced = debouncedOnChangeRef.current;
    debounced.cancel(); // 先取消之前的

    debouncedOnChangeRef.current = debounce((tabId: string, newContent: string) => {
      onContentChange(tabId, newContent);
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
    if (tab) {
      debouncedOnChangeRef.current(tab.id, newContent);
    }
  };

  if (!tab) {
    return (
      <div className="editor-area-empty">
        <div className="empty-state">
          <h2>No File Open</h2>
          <p>Create a new file or open an existing one to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-area">
      <MarkdownEditor
        value={content}
        onChange={handleChange}
        height="100%"
        preview="live"
        enableScroll={true}
        visibleDragbar={false}
      />
    </div>
  );
}
