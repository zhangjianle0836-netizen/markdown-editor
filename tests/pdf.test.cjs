const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');
const {
  createPdfDocument,
  getPdfFileName,
  isPdfExportRequest,
  isPdfFilePath,
} = require('../dist-electron/pdf.js');

test('PDF request rejects malformed and oversized renderer input', () => {
  for (const request of [null, 'html', {}, { name: 1, html: '' }, { name: '', html: 1 }]) {
    assert.equal(isPdfExportRequest(request), false);
  }
  assert.equal(isPdfExportRequest({ name: '未命名', html: '' }), true);
  assert.equal(isPdfExportRequest({ name: 'a'.repeat(256), html: '' }), false);
  assert.equal(isPdfExportRequest({ name: '中文.md', html: '中'.repeat(7 * 1024 * 1024) }), false);
});

test('PDF names stay a single filename and source Markdown cannot be an export path', () => {
  assert.equal(getPdfFileName('报告.MARKDOWN'), '报告.pdf');
  assert.equal(getPdfFileName('notes.v2.md'), 'notes.v2.pdf');
  assert.equal(getPdfFileName(''), '未命名.pdf');
  assert.equal(getPdfFileName('..'), '未命名.pdf');
  assert.equal(getPdfFileName('../other\\file.md'), '_other_file.pdf');
  assert.equal(isPdfFilePath('/tmp/report.PDF'), true);
  assert.equal(isPdfFilePath('/tmp/source.md'), false);
});

test('PDF title is escaped and CSP permits only the bundled stylesheet', () => {
  const html = createPdfDocument({ name: '</title><script>alert(1)</script>', html: '<p>正文</p>' });
  assert.ok(html.includes('&lt;/title&gt;&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes("script-src 'none'"));
  assert.ok(!html.includes('unsafe-inline'));
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const hash = createHash('sha256').update(css).digest('base64');
  assert.ok(html.includes(`style-src 'sha256-${hash}'`));
  assert.ok(html.includes('<article><p>正文</p></article>'));
});
