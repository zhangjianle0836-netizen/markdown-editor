import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';

/**
 * 配置 marked 选项
 * 启用 GitHub Flavored Markdown 和其他功能
 */
marked.setOptions({
  gfm: true,           // GitHub Flavored Markdown
  breaks: true,        // 支持 GitHub 风格的换行
  pedantic: false,     // 不严格遵循原始 markdown.pl
});

/**
 * 自定义渲染器
 * 增强链接和代码块的渲染
 */
const renderer = new marked.Renderer();

// 自定义链接渲染（添加安全属性）
const originalLinkRenderer = renderer.link;
renderer.link = (href, title, text) => {
  // 过滤危险的协议
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'ftp:'];
  let safeHref = href;

  try {
    const url = new URL(href, window.location.origin);
    if (!allowedProtocols.includes(url.protocol)) {
      safeHref = '#'; // 阻止危险协议
    }
  } catch {
    // 相对路径或无效 URL，保持原样
    safeHref = href;
  }

  const titleAttr = title ? ` title="${title}"` : '';
  const targetAttr = ' target="_blank" rel="noopener noreferrer"';
  return `<a href="${safeHref}"${titleAttr}${targetAttr}>${text}</a>`;
};

// 自定义代码块渲染（添加语言类名）
const originalCodeRenderer = renderer.code;
renderer.code = (code, language) => {
  const langClass = language ? ` class="language-${language}"` : '';
  return `<pre><code${langClass}>${code}</code></pre>`;
};

// 应用自定义渲染器
marked.use({ renderer });

/**
 * 将 Markdown 转换为安全的 HTML
 * @param markdown - Markdown 内容
 * @returns 安全的 HTML 字符串
 */
export const markdownToHTML = (markdown: string): string => {
  try {
    // 输入验证
    if (!markdown || typeof markdown !== 'string') {
      return '<p></p>';
    }

    // 1. 解析 Markdown
    const rawHtml = marked(markdown);

    // 2. 清理 XSS（使用 DOMPurify）
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      // 允许的标签
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 'u', 's',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'div', 'span',
        'input', // 任务列表需要
      ],
      // 允许的属性
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'class', 'title',
        'type', 'disabled', 'checked', // 任务列表
      ],
      ALLOW_DATA_ATTR: false,
    });

    return cleanHtml;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return '<p><strong>Error parsing markdown</strong></p>';
  }
};

/**
 * 获取导出文档的基础样式
 */
const getExportStyles = (): string => {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }

    /* 标题 */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 32px; border-bottom: 1px solid #e0e0e0; padding-bottom: 12px; }
    h2 { font-size: 24px; }
    h3 { font-size: 20px; }
    h4 { font-size: 18px; }
    h5 { font-size: 16px; }
    h6 { font-size: 14px; }

    /* 代码 */
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }

    /* 链接 */
    a {
      color: #1890ff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    /* 列表 */
    ul, ol {
      margin: 16px 0;
      padding-left: 32px;
    }
    li {
      margin: 8px 0;
    }

    /* 引用 */
    blockquote {
      border-left: 4px solid #e0e0e0;
      padding-left: 16px;
      margin-left: 0;
      color: #666;
    }

    /* 图片 */
    img {
      max-width: 100%;
      height: auto;
    }

    /* 水平线 */
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 24px 0;
    }

    /* 表格 */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #e0e0e0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }

    /* 任务列表 */
    .task-list-item {
      list-style: none;
      margin-left: -20px;
    }
    .task-list-item input {
      margin-right: 8px;
    }

    /* 删除线 */
    del, s {
      text-decoration: line-through;
      color: #666;
    }
  `;
};

/**
 * 导出为 PDF
 */
export const exportToPDF = async (
  markdown: string,
  filename: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 输入验证
    if (!markdown || typeof markdown !== 'string') {
      return { success: false, error: 'Invalid markdown content' };
    }

    if (!filename || typeof filename !== 'string') {
      return { success: false, error: 'Invalid filename' };
    }

    // 文件名清理（移除非法字符）
    const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');

    // 转换 Markdown
    const html = markdownToHTML(markdown);

    const styledHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${getExportStyles()}</style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    const element = document.createElement('div');
    element.innerHTML = styledHTML;

    const opt = {
      margin: 1,
      filename: `${safeFilename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
    };

    await html2pdf().set(opt).from(element).save();

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during PDF export';
    console.error('PDF export error:', error);
    return { success: false, error: errorMessage };
  }
};

/**
 * 导出为 HTML
 */
export const exportToHTML = (
  markdown: string,
  filename: string
): { success: boolean; error?: string } => {
  try {
    // 输入验证
    if (!markdown || typeof markdown !== 'string') {
      return { success: false, error: 'Invalid markdown content' };
    }

    if (!filename || typeof filename !== 'string') {
      return { success: false, error: 'Invalid filename' };
    }

    // 文件名清理
    const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');

    // 转换 Markdown
    const html = markdownToHTML(markdown);

    const styledHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeFilename}</title>
        <style>${getExportStyles()}</style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    const blob = new Blob([styledHTML], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${safeFilename}.html`);

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during HTML export';
    console.error('HTML export error:', error);
    return { success: false, error: errorMessage };
  }
};
