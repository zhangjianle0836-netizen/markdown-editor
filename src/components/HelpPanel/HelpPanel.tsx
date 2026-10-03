import { useEffect, useRef, useState } from 'react';
import './HelpPanel.css';

export function HelpPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isVisible && !dialog.open) dialog.showModal();
    if (!isVisible && dialog.open) dialog.close();
  }, [isVisible]);

  const syntaxList = [
    {
      category: '标题',
      items: [
        { syntax: '# 一级标题', desc: '最大标题' },
        { syntax: '## 二级标题', desc: '次级标题' },
        { syntax: '### 三级标题', desc: '小标题' },
      ],
    },
    {
      category: '文本样式',
      items: [
        { syntax: '**粗体**', desc: '粗体文本' },
        { syntax: '*斜体*', desc: '斜体文本' },
        { syntax: '~~删除线~~', desc: '删除线' },
        { syntax: '`代码`', desc: '行内代码' },
      ],
    },
    {
      category: '列表',
      items: [
        { syntax: '- 无序列表项', desc: '无序列表' },
        { syntax: '1. 有序列表项', desc: '有序列表' },
        { syntax: '- [ ] 待办事项', desc: '待办清单' },
      ],
    },
    {
      category: '链接和图片',
      items: [
        { syntax: '[链接文字](URL)', desc: '超链接' },
        { syntax: '![图片描述](图片URL)', desc: '插入图片' },
      ],
    },
    {
      category: '代码块',
      items: [
        { syntax: '```语言名\n代码\n```', desc: '代码块（支持语法高亮）' },
      ],
    },
    {
      category: '引用',
      items: [
        { syntax: '> 引用文本', desc: '引用块' },
      ],
    },
    {
      category: '表格',
      items: [
        { syntax: '| 列1 | 列2 |\n|-----|-----|\n| 内容 | 内容 |', desc: '表格' },
      ],
    },
    {
      category: '其他',
      items: [
        { syntax: '---', desc: '分割线' },
        { syntax: '***', desc: '分割线' },
      ],
    },
  ];

  return (
    <div className="help-panel-container">
      <button
        className="help-button"
        onClick={() => setIsVisible(!isVisible)}
        title="Markdown 语法帮助"
        aria-label="Markdown 语法帮助"
        aria-haspopup="dialog"
        aria-expanded={isVisible}
      >
        ?
      </button>

      <dialog ref={dialogRef} className="help-panel" aria-labelledby="markdown-help-title"
        onClose={() => setIsVisible(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) setIsVisible(false);
        }}>
            <div className="help-header">
              <h3 id="markdown-help-title">Markdown 语法帮助</h3>
              <button
                className="help-close"
                aria-label="关闭语法帮助"
                autoFocus
                onClick={() => setIsVisible(false)}
              >
                ×
              </button>
            </div>
            <div className="help-content">
              {syntaxList.map((category, idx) => (
                <div key={idx} className="help-category">
                  <h4 className="help-category-title">{category.category}</h4>
                  <div className="help-items">
                    {category.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="help-item">
                        <code className="help-syntax">{item.syntax}</code>
                        <span className="help-desc">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="help-footer">
                <p>💡 提示：可直接参考以上示例编写 Markdown</p>
              </div>
            </div>
      </dialog>
    </div>
  );
}
