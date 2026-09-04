import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
});

const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

/**
 * 将 Markdown 转换为经过白名单清洗的 HTML。
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
    return '<p><strong>Markdown 解析失败</strong></p>';
  }
};
