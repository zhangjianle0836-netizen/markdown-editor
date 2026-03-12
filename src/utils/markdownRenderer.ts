import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
});

const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

/**
 * 将 Markdown 转换为安全的 HTML
 * @param markdown - Markdown 内容
 * @returns 安全的 HTML 字符串
 */
export const markdownToHTML = (markdown: string): string => {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return '<p></p>';
    }

    const rawHtml = marked.parse(markdown, { async: false });

    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 'u', 's',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'div', 'span',
        'input',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'class', 'title',
        'type', 'disabled', 'checked',
      ],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP,
    });
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
    if (!markdown || typeof markdown !== 'string') {
      return { success: false, error: 'Invalid markdown content' };
    }

    if (!filename || typeof filename !== 'string') {
      return { success: false, error: 'Invalid filename' };
    }

    const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
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

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

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
export const exportToHTML = async (
  markdown: string,
  filename: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return { success: false, error: 'Invalid markdown content' };
    }

    if (!filename || typeof filename !== 'string') {
      return { success: false, error: 'Invalid filename' };
    }

    const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
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

    const { saveAs } = await import('file-saver');
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
