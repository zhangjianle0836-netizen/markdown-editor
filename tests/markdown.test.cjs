const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve('src/utils/markdownEnhancements.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(filename, module);
loaded._compile(compiled, filename);
const { createHeadingId, highlightCode } = loaded.exports;

test('heading IDs remain unique when natural names collide with generated suffixes', () => {
  const used = new Set();
  const ids = ['A', 'A', 'A-2', 'A', '😀', '😀'].map(text => createHeadingId(text, used));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.slice(0, 3), ['a', 'a-2', 'a-2-2']);
});

test('highlighting preserves literal source, URLs, token markers and HTML characters', async () => {
  const { fromHtml } = await import('hast-util-from-html');
  const text = node => node.type === 'text' ? node.value : (node.children || []).map(text).join('');
  const cases = [
    ['bash', 'echo "$HOME" # comment\nnpm install @@TOKEN_0@@'],
    ['js', 'const url = "https://example.com";\nconst literal = "@@TOKEN_0@@ <img onerror=evil()>";'],
    ['css', '.a { color: #aabbcc; width: 10px; }'],
    ['html', '<img src="x" onerror="evil()">'],
    ['markdown', '# Heading\n[link](https://example.com)'],
    ['unknown', '<script>alert(1)</script> & text'],
    ['js', '<'.repeat(100001)],
  ];
  for (const [language, source] of cases) {
    const tree = fromHtml(highlightCode(source, language), { fragment: true });
    assert.equal(text(tree), source, language);
    const walk = node => {
      if (node.type === 'element') assert.equal(node.tagName, 'span');
      (node.children || []).forEach(walk);
    };
    walk(tree);
  }
});
