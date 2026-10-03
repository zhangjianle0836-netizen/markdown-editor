import { useDeferredValue, useEffect, useState } from 'react';
import { buildEnhancedHtml, type HeadingItem } from '../utils/markdownEnhancements';

type Converter = (markdown: string) => string;
let converterPromise: Promise<Converter> | null = null;
const loadConverter = (): Promise<Converter> => {
  if (!converterPromise) {
    converterPromise = import('../utils/markdownRenderer').then(module => module.markdownToHTML)
      .catch(error => { converterPromise = null; throw error; });
  }
  return converterPromise;
};

/** Share deferred, sanitized Markdown rendering between reading and split view. */
export const useRenderedMarkdown = (content: string) => {
  const deferredContent = useDeferredValue(content);
  const [rendered, setRendered] = useState<{ html: string; headings: HeadingItem[] }>({ html: '<p></p>', headings: [] });
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const convert = await loadConverter();
        if (!active) return;
        const result = buildEnhancedHtml(convert(deferredContent));
        if (active) { setRendered(result); setError(false); }
      } catch (reason) {
        console.error('Markdown preview failed:', reason);
        if (active) setError(true);
      }
    })();
    return () => { active = false; };
  }, [deferredContent, attempt]);
  return { ...rendered, error, retry: () => setAttempt(value => value + 1) };
};
