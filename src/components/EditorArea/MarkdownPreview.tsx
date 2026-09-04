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

interface SearchMatch {
  index: number;
  label: string;
  level: number | null;
}

const MAX_SEARCH_MATCHES = 500;

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

const buildEnhancedHtml = (
  rawHtml: string
): { html: string; headings: HeadingItem[] } => {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(rawHtml, 'text/html');
  const headingNodes = documentNode.body.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headings: HeadingItem[] = [];
  const slugCount = new Map<string, number>();

  headingNodes.forEach((headingNode) => {
    const text = headingNode.textContent?.trim() || '未命名章节';
    const level = Number(headingNode.tagName.slice(1));
    const baseSlug = slugify(text);
    const currentCount = slugCount.get(baseSlug) || 0;
    const id = currentCount > 0 ? `${baseSlug}-${currentCount + 1}` : baseSlug;
    slugCount.set(baseSlug, currentCount + 1);
    const heading = { id, level, text };
    headings.push(heading);

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

  return { html: documentNode.body.innerHTML, headings };
};

function MarkdownPreviewComponent({ content }: MarkdownPreviewProps) {
  const deferredContent = useDeferredValue(content);
  const containerRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const tocBodyRef = useRef<HTMLDivElement | null>(null);
  const lastTocSyncAtRef = useRef(0);
  const lastMatchSyncAtRef = useRef(0);
  const [html, setHtml] = useState('<p></p>');
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searchResultsTruncated, setSearchResultsTruncated] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    let isActive = true;

    const renderMarkdown = async () => {
      const markdownToHTML = await loadConverter();
      const rendered = buildEnhancedHtml(markdownToHTML(deferredContent));

      if (isActive) {
        setHeadings(rendered.headings);
        setHtml(rendered.html);
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
      articleNode.querySelectorAll<HTMLElement>(
        'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'
      )
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const articleNode = articleRef.current;
    const containerNode = containerRef.current;
    if (!articleNode || !containerNode) {
      return;
    }

    const rawTerm = debouncedSearchTerm;
    const escapedTerm = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const markerNodes = articleNode.querySelectorAll('mark[data-preview-search]');
    markerNodes.forEach((markerNode) => {
      const parentNode = markerNode.parentNode;
      if (!parentNode) {
        return;
      }

      parentNode.replaceChild(
        document.createTextNode(markerNode.textContent || ''),
        markerNode
      );
      parentNode.normalize();
    });

    if (!rawTerm) {
      setMatches([]);
      setActiveMatchIndex(0);
      setSearchResultsTruncated(false);
      return;
    }

    const walker = document.createTreeWalker(articleNode, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        const parentElement = node.parentElement;
        if (!parentElement) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parentElement.closest('pre, code, .markdown-preview-toc')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const regex = new RegExp(escapedTerm, 'gi');
    const nextMatches: SearchMatch[] = [];
    let matchCounter = 0;
    let resultsTruncated = false;

    while (walker.nextNode()) {
      if (matchCounter >= MAX_SEARCH_MATCHES) {
        resultsTruncated = true;
        break;
      }

      const textNode = walker.currentNode as Text;
      const originalText = textNode.textContent || '';
      let lastIndex = 0;
      let matched = false;
      const fragment = document.createDocumentFragment();
      let result = regex.exec(originalText);

      while (result && matchCounter < MAX_SEARCH_MATCHES) {
        matched = true;
        const matchedText = result[0];
        const beforeText = originalText.slice(lastIndex, result.index);
        if (beforeText) {
          fragment.appendChild(document.createTextNode(beforeText));
        }

        const markNode = document.createElement('mark');
        markNode.dataset.previewSearch = 'true';
        markNode.dataset.matchIndex = String(matchCounter);
        markNode.textContent = matchedText;
        fragment.appendChild(markNode);

        const ownerHeading = textNode.parentElement?.closest<HTMLElement>('h1, h2, h3, h4, h5, h6');
        nextMatches.push({
          index: matchCounter,
          label: ownerHeading?.textContent?.replace('#', '').trim() || matchedText,
          level: ownerHeading ? Number(ownerHeading.tagName.slice(1)) : null,
        });

        matchCounter += 1;
        lastIndex = result.index + matchedText.length;
        result = regex.exec(originalText);
      }

      if (result) {
        resultsTruncated = true;
      }

      if (!matched) {
        regex.lastIndex = 0;
        continue;
      }

      const afterText = originalText.slice(lastIndex);
      if (afterText) {
        fragment.appendChild(document.createTextNode(afterText));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
      regex.lastIndex = 0;
    }

    setMatches(nextMatches);
    setActiveMatchIndex(0);
    setSearchResultsTruncated(resultsTruncated);

    if (nextMatches.length > 0) {
      requestAnimationFrame(() => {
        const firstMatch = articleNode.querySelector<HTMLElement>('mark[data-match-index="0"]');
        firstMatch?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
  }, [html, debouncedSearchTerm]);

  useEffect(() => {
    const articleNode = articleRef.current;
    if (!articleNode || matches.length === 0) {
      return;
    }

    const matchNodes = Array.from(
      articleNode.querySelectorAll<HTMLElement>('mark[data-preview-search]')
    );

    matchNodes.forEach((matchNode) => {
      matchNode.classList.toggle(
        'active',
        Number(matchNode.dataset.matchIndex) === activeMatchIndex
      );
    });

    const activeMatchNode = articleNode.querySelector<HTMLElement>(
      `mark[data-match-index="${activeMatchIndex}"]`
    );
    activeMatchNode?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeMatchIndex, matches]);

  useEffect(() => {
    const containerNode = containerRef.current;
    const articleNode = articleRef.current;
    if (!containerNode || !articleNode) {
      return;
    }

    let frameId: number | null = null;

    const updateProgress = () => {
      const totalScrollable = containerNode.scrollHeight - containerNode.clientHeight;
      if (totalScrollable <= 0) {
        setReadingProgress(0);
        return;
      }

      const nextProgress = Math.min(
        100,
        Math.max(0, (containerNode.scrollTop / totalScrollable) * 100)
      );
      setReadingProgress((prevProgress) =>
        Math.abs(prevProgress - nextProgress) < 0.5 ? prevProgress : nextProgress
      );
    };

    const scheduleProgressUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateProgress();
      });
    };

    updateProgress();
    containerNode.addEventListener('scroll', scheduleProgressUpdate, { passive: true });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      containerNode.removeEventListener('scroll', scheduleProgressUpdate);
    };
  }, [html]);

  useEffect(() => {
    const tocBodyNode = tocBodyRef.current;
    if (!tocBodyNode || !activeHeadingId) {
      return;
    }

    const activeLink = tocBodyNode.querySelector<HTMLElement>(
      `.markdown-preview-toc-link.active[href="#${CSS.escape(activeHeadingId)}"]`
    );
    if (!activeLink) {
      return;
    }

    const now = performance.now();
    const behavior: ScrollBehavior =
      now - lastTocSyncAtRef.current > 240 ? 'smooth' : 'auto';
    lastTocSyncAtRef.current = now;

    activeLink?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior,
    });
  }, [activeHeadingId]);

  useEffect(() => {
    const tocBodyNode = tocBodyRef.current;
    if (!tocBodyNode || !debouncedSearchTerm || matches.length === 0) {
      return;
    }

    const activeMatchItem = tocBodyNode.querySelector<HTMLElement>(
      `.markdown-preview-search-outline-item.active[data-match-index="${activeMatchIndex}"]`
    );
    if (!activeMatchItem) {
      return;
    }

    const now = performance.now();
    const behavior: ScrollBehavior =
      now - lastMatchSyncAtRef.current > 240 ? 'smooth' : 'auto';
    lastMatchSyncAtRef.current = now;

    activeMatchItem.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior,
    });
  }, [activeMatchIndex, debouncedSearchTerm, matches]);

  const hasSearchResults = matches.length > 0;
  const hasPendingSearch = searchTerm.trim() !== debouncedSearchTerm;

  const handleSearchMove = (direction: 'prev' | 'next') => {
    if (!hasSearchResults) {
      return;
    }

    setActiveMatchIndex((prev) => {
      if (direction === 'next') {
        return (prev + 1) % matches.length;
      }

      return (prev - 1 + matches.length) % matches.length;
    });
  };

  return (
    <section
      ref={containerRef}
      className="markdown-preview"
      aria-label="Markdown preview"
    >
      <header className="markdown-preview-tools">
        <div
          className="markdown-preview-progress"
          aria-label={`已阅读 ${Math.round(readingProgress)}%`}
        >
          <span className="markdown-preview-progress-text">
            {Math.round(readingProgress)}%
          </span>
          <div className="markdown-preview-progress-track" aria-hidden="true">
            <span
              className="markdown-preview-progress-bar"
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        </div>
        <div className="markdown-preview-tools-row">
          <div className="markdown-preview-search">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="markdown-preview-search-input"
              type="text"
              placeholder="搜索正文内容"
              aria-label="搜索正文内容"
            />
            <span className="markdown-preview-search-status">
              {searchTerm.trim()
                ? hasPendingSearch
                  ? '搜索中'
                  : hasSearchResults
                  ? `${activeMatchIndex + 1}/${matches.length}${
                      searchResultsTruncated ? '+' : ''
                    }`
                  : '0 结果'
                : '输入后高亮正文'}
            </span>
            <button
              type="button"
              className="markdown-preview-search-button"
              onClick={() => handleSearchMove('prev')}
              disabled={!hasSearchResults}
            >
              上一个
            </button>
            <button
              type="button"
              className="markdown-preview-search-button"
              onClick={() => handleSearchMove('next')}
              disabled={!hasSearchResults}
            >
              下一个
            </button>
          </div>
        </div>
      </header>
      {headings.length >= 3 && (
        <aside className="markdown-preview-toc" aria-label="文档目录">
          <div className="markdown-preview-toc-card">
            <span className="markdown-preview-toc-eyebrow">On this page</span>
            <h3>目录</h3>
            <div ref={tocBodyRef} className="markdown-preview-toc-body">
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
              {debouncedSearchTerm && matches.length > 0 && (
                <div className="markdown-preview-search-outline">
                  <span className="markdown-preview-search-outline-title">搜索命中</span>
                  <div className="markdown-preview-search-outline-list">
                    {matches.map((match) => (
                      <button
                        key={match.index}
                        type="button"
                        className={`markdown-preview-search-outline-item ${
                          activeMatchIndex === match.index ? 'active' : ''
                        }`}
                        data-match-index={match.index}
                        data-level={match.level || 1}
                        onClick={() => setActiveMatchIndex(match.index)}
                      >
                        {match.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
