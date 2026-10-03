import { memo } from 'react';
import { useRenderedMarkdown } from '../../hooks/useRenderedMarkdown';

export const MarkdownDocument = memo(function MarkdownDocument({ content }: { content: string }) {
  const { html, error, retry } = useRenderedMarkdown(content);
  return error ? <div className="editor-loading" role="alert">
    预览加载失败 <button onClick={retry}>重试</button>
  </div> : <article className="markdown-preview-content markdown-split-content"
    dangerouslySetInnerHTML={{ __html: html }} />;
});
