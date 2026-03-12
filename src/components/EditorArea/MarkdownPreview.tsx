import {
  memo,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';

interface MarkdownPreviewProps {
  content: string;
}

type MarkdownConverter = (markdown: string) => string;

interface HeadingItem {
  id: string;
  level: number;
  text: string;
}

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

const slugify = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()#+.!?]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '');

  return normalized || 'section';
};

const extractHeadings = (markdown: string): HeadingItem[] => {
  const headings: HeadingItem[] = [];
  const slugCount = new Map<string, number>();
  const lines = markdown.split('\n');
  let inFence = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      return;
    }

    if (inFence) {
      return;
    }

    const match = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (!match) {
      return;
    }

    const level = match[1].length;
    const text = match[2].trim().replace(/#+$/, '').trim();
    const baseSlug = slugify(text);
    const currentCount = slugCount.get(baseSlug) || 0;
    slugCount.set(baseSlug, currentCount + 1);

    headings.push({
      id: currentCount > 0 ? `${baseSlug}-${currentCount + 1}` : baseSlug,
      level,
      text,
    });
  });

  return headings;
};

const getCodeLanguage = (codeElement: Element | null): string => {
  if (!codeElement) {
    return 'text';
  }

  const languageClass = Array.from(codeElement.classList).find((className) =>
    className.startsWith('language-')
  );

  return languageClass ? languageClass.replace('language-', '') : 'text';
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const highlightCode = (source: string, language: string): string => {
  const placeholders: string[] = [];
  const storeToken = (html: string): string => {
    const marker = `@@TOKEN_${placeholders.length}@@`;
    placeholders.push(html);
    return marker;
  };

  let html = escapeHtml(source);
  const lang = language.toLowerCase();

  if (['js', 'jsx', 'ts', 'tsx', 'json'].includes(lang)) {
    html = html.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match) =>
      storeToken(`<span class="markdown-token-comment">${match}</span>`)
    );
    html = html.replace(/("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)/g, (match) =>
      storeToken(`<span class="markdown-token-string">${match}</span>`)
    );
    html = html.replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|import|from|export|default|class|extends|new|await|async|try|catch|throw|typeof|interface|type|implements)\b/g, '<span class="markdown-token-keyword">$1</span>');
    html = html.replace(/\b(true|false|null|undefined)\b/g, '<span class="markdown-token-literal">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="markdown-token-number">$1</span>');
  } else if (['html', 'xml', 'svg'].includes(lang)) {
    html = html.replace(/(&lt;\/?)([\w-]+)(.*?)(\/?&gt;)/g, (_match, open, tag, attrs, close) => {
      const highlightedAttrs = attrs.replace(/([\w:-]+)=(".*?"|'.*?')/g, '<span class="markdown-token-attr">$1</span>=<span class="markdown-token-string">$2</span>');
      return `${open}<span class="markdown-token-tag">${tag}</span>${highlightedAttrs}${close}`;
    });
  } else if (['css', 'scss', 'less'].includes(lang)) {
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="markdown-token-comment">$1</span>');
    html = html.replace(/([.#]?[\w-]+)(\s*\{)/g, '<span class="markdown-token-tag">$1</span>$2');
    html = html.replace(/([\w-]+)(:\s*)([^;]+)(;?)/g, '<span class="markdown-token-attr">$1</span>$2<span class="markdown-token-string">$3</span>$4');
  } else if (['bash', 'sh', 'zsh', 'shell'].includes(lang)) {
    html = html.replace(/(#.*$)/gm, '<span class="markdown-token-comment">$1</span>');
    html = html.replace(/("(?:\\.|[^"])*"|'(?:\\.|[^'])*')/g, '<span class="markdown-token-string">$1</span>');
    html = html.replace(/\b(if|then|else|fi|for|do|done|echo|export|cd|npm|pnpm|git|node)\b/g, '<span class="markdown-token-keyword">$1</span>');
    html = html.replace(/(\$\w+)/g, '<span class="markdown-token-literal">$1</span>');
  } else if (lang === 'md' || lang === 'markdown') {
    html = html.replace(/^(#{1,6}\s.*)$/gm, '<span class="markdown-token-keyword">$1</span>');
    html = html.replace(/(```[\s\S]*?```|`[^`]+`)/g, '<span class="markdown-token-string">$1</span>');
    html = html.replace(/(\*\*.*?\*\*|\*.*?\*)/g, '<span class="markdown-token-literal">$1</span>');
    html = html.replace(/(\[.*?\]\(.*?\))/g, '<span class="markdown-token-tag">$1</span>');
  }

  return html.replace(/@@TOKEN_(\d+)@@/g, (_match, index) => placeholders[Number(index)] || '');
};

const buildEnhancedHtml = (rawHtml: string, headings: HeadingItem[]): string => {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(rawHtml, 'text/html');
  const headingNodes = documentNode.body.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headingNodes.forEach((headingNode, index) => {
    const heading = headings[index];
    if (!heading) {
      return;
    }

    headingNode.id = heading.id;
    headingNode.classList.add('markdown-heading');

    const anchor = documentNode.createElement('a');
    anchor.href = `#${heading.id}`;
    anchor.className = 'markdown-heading-anchor';
    anchor.setAttribute('aria-label', `跳转到 ${heading.text}`);
    anchor.textContent = '#';
    headingNode.appendChild(anchor);
  });

  const preNodes = documentNode.body.querySelectorAll('pre');
  preNodes.forEach((preNode) => {
    const codeNode = preNode.querySelector('code');
    const language = getCodeLanguage(codeNode);

    const wrapper = documentNode.createElement('section');
    wrapper.className = 'markdown-code-block';

    const header = documentNode.createElement('header');
    header.className = 'markdown-code-header';

    const dots = documentNode.createElement('div');
    dots.className = 'markdown-code-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    const label = documentNode.createElement('span');
    label.className = 'markdown-code-label';
    label.textContent = language;

    if (codeNode) {
      codeNode.innerHTML = highlightCode(codeNode.textContent || '', language);
    }

    header.appendChild(dots);
    header.appendChild(label);

    preNode.parentNode?.insertBefore(wrapper, preNode);
    wrapper.appendChild(header);
    wrapper.appendChild(preNode);
  });

  return documentNode.body.innerHTML;
};

function MarkdownPreviewComponent({ content }: MarkdownPreviewProps) {
  const deferredContent = useDeferredValue(content);
  const articleRef = useRef<HTMLElement | null>(null);
  const [html, setHtml] = useState('<p></p>');
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  useEffect(() => {
    let isActive = true;

    const renderMarkdown = async () => {
      const markdownToHTML = await loadConverter();
      const nextHeadings = extractHeadings(deferredContent);
      const nextHtml = buildEnhancedHtml(
        markdownToHTML(deferredContent),
        nextHeadings
      );

      if (isActive) {
        setHeadings(nextHeadings);
        setHtml(nextHtml);
      }
    };

    void renderMarkdown();

    return () => {
      isActive = false;
    };
  }, [deferredContent]);

  useEffect(() => {
    const articleNode = articleRef.current;
    if (!articleNode) {
      return;
    }

    const headingNodes = Array.from(
      articleNode.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]')
    );

    if (headingNodes.length === 0) {
      setActiveHeadingId('');
      return;
    }

    setActiveHeadingId(headingNodes[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visibleEntry) {
          setActiveHeadingId((visibleEntry.target as HTMLElement).id);
        }
      },
      {
        root: articleNode.closest('.markdown-preview'),
        rootMargin: '-18% 0px -65% 0px',
        threshold: [0, 1],
      }
    );

    headingNodes.forEach((headingNode) => observer.observe(headingNode));

    return () => observer.disconnect();
  }, [html]);

  return (
    <section className="markdown-preview" aria-label="Markdown preview">
      {headings.length >= 3 && (
        <aside className="markdown-preview-toc" aria-label="文档目录">
          <div className="markdown-preview-toc-card">
            <span className="markdown-preview-toc-eyebrow">On this page</span>
            <h3>目录</h3>
            <nav className="markdown-preview-toc-nav">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`markdown-preview-toc-link ${
                    activeHeadingId === heading.id ? 'active' : ''
                  }`}
                  data-level={heading.level}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
      <article
        ref={articleRef}
        className="markdown-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export const MarkdownPreview = memo(MarkdownPreviewComponent);
