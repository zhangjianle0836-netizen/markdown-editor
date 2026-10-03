import {
  memo,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRenderedMarkdown } from '../../hooks/useRenderedMarkdown';

interface MarkdownPreviewProps {
  content: string;
}

interface SearchMatch {
  index: number;
  label: string;
  level: number | null;
}

const MAX_SEARCH_MATCHES = 500;

function MarkdownPreviewComponent({ content }: MarkdownPreviewProps) {
  const { html, headings, error, retry } = useRenderedMarkdown(content);
  const containerRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const tocBodyRef = useRef<HTMLDivElement | null>(null);
  const lastTocSyncAtRef = useRef(0);
  const lastMatchSyncAtRef = useRef(0);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searchResultsTruncated, setSearchResultsTruncated] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

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

    // Complete traversal before replacing nodes, so the walker stays attached.
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    for (const textNode of textNodes) {
      if (matchCounter >= MAX_SEARCH_MATCHES) {
        regex.lastIndex = 0;
        if (regex.test(textNode.textContent || '')) {
          resultsTruncated = true;
          break;
        }
        continue;
      }

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
        firstMatch?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
    activeMatchNode?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches && now - lastTocSyncAtRef.current > 240 ? 'smooth' : 'auto';
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
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches && now - lastMatchSyncAtRef.current > 240 ? 'smooth' : 'auto';
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
      className={`markdown-preview ${headings.length >= 3 ? 'has-toc' : ''}`}
      aria-label="Markdown 预览"
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
            <span className="markdown-preview-search-status" role="status" aria-live="polite">
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
                    aria-current={activeHeadingId === heading.id ? 'location' : undefined}
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
      {error && <div role="alert">预览加载失败 <button onClick={retry}>重试</button></div>}
      <article
        ref={articleRef}
        className="markdown-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export const MarkdownPreview = memo(MarkdownPreviewComponent);
