export interface HeadingItem {
  id: string;
  level: number;
  text: string;
}

export const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const slugify = (value: string): string => value.trim().toLowerCase()
  .replace(/[`*_~[\]()#+.!?]/g, '').replace(/\s+/g, '-')
  .replace(/[^\w\u4e00-\u9fa5-]/g, '') || 'section';

export const createHeadingId = (text: string, usedIds: Set<string>): string => {
  const base = slugify(text);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  return id;
};

const JS_KEYWORDS = new Set('const let var function return if else for while switch case break import from export default class extends new await async try catch throw typeof interface type implements'.split(' '));
const SHELL_KEYWORDS = new Set('if then else fi for do done echo export cd npm pnpm git node'.split(' '));

/** Tokenize original source once; generated markup is never tokenized again. */
export const highlightCode = (source: string, language: string): string => {
  const lang = language.toLowerCase();
  if (source.length > 100_000) return escapeHtml(source);
  let pattern: RegExp;
  let classify: (token: string) => string | null;
  if (['js', 'jsx', 'ts', 'tsx', 'json'].includes(lang)) {
    pattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b/g;
    classify = token => token.startsWith('//') || token.startsWith('/*') ? 'comment'
      : /^["'`]/.test(token) ? 'string' : /^\d/.test(token) ? 'number'
      : JS_KEYWORDS.has(token) ? 'keyword'
      : ['true', 'false', 'null', 'undefined'].includes(token) ? 'literal' : null;
  } else if (['bash', 'sh', 'zsh', 'shell'].includes(lang)) {
    pattern = /#[^\n]*|"(?:\\.|[^"\\])*"|'[^']*'|\$\w+|\b[A-Za-z_]\w*\b/g;
    classify = token => token.startsWith('#') ? 'comment' : /^["']/.test(token) ? 'string'
      : token.startsWith('$') ? 'literal' : SHELL_KEYWORDS.has(token) ? 'keyword' : null;
  } else if (['css', 'scss', 'less'].includes(lang)) {
    pattern = /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%)?|[\w-]+(?=\s*:)/g;
    classify = token => token.startsWith('/*') ? 'comment' : /^["']/.test(token) ? 'string'
      : /^[#\d]/.test(token) ? 'number' : 'attr';
  } else if (['html', 'xml', 'svg'].includes(lang)) {
    pattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g;
    classify = token => token.startsWith('<!--') ? 'comment' : 'tag';
  } else if (['md', 'markdown'].includes(lang)) {
    pattern = /```[\s\S]*?```|`[^`\n]+`|^#{1,6}\s[^\n]*|\*\*[^\n]*?\*\*|\[[^\]\n]*\]\([^\n)]*\)/gm;
    classify = token => token.startsWith('#') ? 'keyword' : token.startsWith('[') ? 'tag' : 'string';
  } else {
    return escapeHtml(source);
  }
  let lastIndex = 0;
  let html = '';
  for (const match of source.matchAll(pattern)) {
    html += escapeHtml(source.slice(lastIndex, match.index));
    const type = classify(match[0]);
    const text = escapeHtml(match[0]);
    html += type ? `<span class="markdown-token-${type}">${text}</span>` : text;
    lastIndex = match.index! + match[0].length;
  }
  return html + escapeHtml(source.slice(lastIndex));
};

export const buildEnhancedHtml = (rawHtml: string): { html: string; headings: HeadingItem[] } => {
  const documentNode = new DOMParser().parseFromString(rawHtml, 'text/html');
  const headings: HeadingItem[] = [];
  const usedIds = new Set<string>();
  documentNode.body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(node => {
    const text = node.textContent?.trim() || '未命名章节';
    const heading = { id: createHeadingId(text, usedIds), level: Number(node.tagName.slice(1)), text };
    headings.push(heading);
    node.id = heading.id;
    node.classList.add('markdown-heading');
    const anchor = documentNode.createElement('a');
    anchor.href = `#${heading.id}`;
    anchor.className = 'markdown-heading-anchor';
    anchor.setAttribute('aria-label', `跳转到 ${heading.text}`);
    anchor.textContent = '#';
    node.appendChild(anchor);
  });
  documentNode.body.querySelectorAll('pre').forEach(preNode => {
    const codeNode = preNode.querySelector('code');
    const language = Array.from(codeNode?.classList || []).find(name => name.startsWith('language-'))?.slice(9) || 'text';
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
    if (codeNode) codeNode.innerHTML = highlightCode(codeNode.textContent || '', language);
    header.append(dots, label);
    preNode.parentNode?.insertBefore(wrapper, preNode);
    wrapper.append(header, preNode);
  });
  return { html: documentNode.body.innerHTML, headings };
};
