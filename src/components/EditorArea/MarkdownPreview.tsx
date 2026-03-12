import { memo, useEffect, useState } from 'react';

interface MarkdownPreviewProps {
  content: string;
}

type MarkdownConverter = (markdown: string) => string;

let converter: MarkdownConverter | null = null;
let converterLoadingPromise: Promise<MarkdownConverter> | null = null;

const loadConverter = async (): Promise<MarkdownConverter> => {
  if (converter) {
    return converter;
  }

  if (!converterLoadingPromise) {
    converterLoadingPromise = import('../../utils/markdownRenderer').then((module) => {
      converter = module.markdownToHTML;
      return converter;
    });
  }

  return converterLoadingPromise;
};

function MarkdownPreviewComponent({ content }: MarkdownPreviewProps) {
  const [html, setHtml] = useState('<p></p>');

  useEffect(() => {
    let isActive = true;

    const renderMarkdown = async () => {
      const markdownToHTML = await loadConverter();
      if (isActive) {
        setHtml(markdownToHTML(content));
      }
    };

    void renderMarkdown();

    return () => {
      isActive = false;
    };
  }, [content]);

  return (
    <section className="markdown-preview" aria-label="Markdown preview">
      <article
        className="markdown-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export const MarkdownPreview = memo(MarkdownPreviewComponent);
