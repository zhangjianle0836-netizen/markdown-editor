// Run with Electron, using a disposable profile and native-dialog stubs.
const assert = require('node:assert/strict');
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'md-editor-test-'));
const output = path.resolve('work/pdf-verification');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', profile);
// Xvfb runners have no hardware compositor for hidden-window capture.
if (process.platform === 'linux') app.disableHardwareAcceleration();
BrowserWindow.prototype.show = function () {};
let saveResult = { canceled: true };
let openResult = { canceled: true, filePaths: [] };
let unsavedResponse = 2;
let saveDialogCount = 0;
let unsavedDialogCount = 0;
const initialRequests = [];
app.on('web-contents-created', (_event, contents) => {
  contents.session.webRequest.onBeforeRequest((details, callback) => {
    initialRequests.push(details.url);
    callback({});
  });
});
const originalReadFile = fs.promises.readFile.bind(fs.promises);
let readGate;
let readStarted = false;
let unlinkGate;
let unlinkStarted = false;
const originalUnlink = fs.promises.unlink.bind(fs.promises);
fs.promises.unlink = async file => {
  if (unlinkGate && file === path.join(profile, 'recovery-draft.json')) {
    unlinkStarted = true;
    await unlinkGate;
  }
  return originalUnlink(file);
};
fs.promises.readFile = async (file, ...args) => {
  if (readGate && file === first) {
    readStarted = true;
    await readGate;
  }
  return originalReadFile(file, ...args);
};
dialog.showSaveDialog = async () => { saveDialogCount += 1; return saveResult; };
dialog.showOpenDialog = async () => openResult;
dialog.showMessageBox = async () => { unsavedDialogCount += 1; return { response: unsavedResponse }; };

const first = path.join(profile, 'first.md');
const second = path.join(profile, 'second.md');
fs.writeFileSync(first, '# First\n\n## Section Two\n\n## Section Three\n');
fs.writeFileSync(second, '# Second\n\nOpened successfully');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (predicate, label) => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(40);
  }
  throw new Error(`Timed out: ${label}`);
};
let win;
const evaluate = code => win.webContents.executeJavaScript(code);
const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)}).click()`);
const titleIs = name => evaluate(`document.querySelector('.toolbar-title-main')?.textContent === ${JSON.stringify(name)}`);
const systemOpen = file => app.emit('open-file', { preventDefault() {} }, file);
const exportFinished = () => evaluate(`Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === '导出 PDF' && !button.disabled)`);
const edit = async text => {
  await click('编辑');
  await waitFor(() => evaluate(`Boolean(document.querySelector('textarea'))`), 'editor');
  await evaluate(`(() => {
    const textarea = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, ${JSON.stringify(text)});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await waitFor(() => evaluate(`document.querySelector('.toolbar-title-meta').textContent === '未保存更改'`), 'modified state');
};
const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'image/svg+xml' });
  response.end('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80"><rect width="400" height="80" fill="#e7f1fa"/><circle cx="40" cy="40" r="22" fill="#0969da"/><text x="80" y="48" font-size="22">PDF IMAGE CHECK</text></svg>');
});
const watchdog = setTimeout(() => { console.error('Integration timeout'); app.exit(1); }, 90000);
require('../dist-electron/main.js');

app.whenReady().then(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  win = BrowserWindow.getAllWindows()[0];
  await waitFor(() => evaluate(`Boolean(window.electronAPI && document.querySelector('.toolbar-title-main'))`).catch(() => false), 'app startup');
  await delay(100);
  assert.ok(!initialRequests.some(url => url.includes('editor-vendor')), 'Editor should remain unloaded at startup');
  systemOpen(first);
  await waitFor(() => titleIs('first.md'), 'first system file');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.markdown-preview-toc-link'))`), 'outline');
  await evaluate(`document.querySelector('.markdown-preview-toc-link[href="#section-two"]').click()`);
  await waitFor(() => Promise.resolve(win.webContents.getURL().endsWith('#section-two')), 'anchor navigation');
  systemOpen(second);
  await waitFor(() => titleIs('second.md'), 'second file after anchor navigation');
  console.log('PASS system file opening after outline navigation');

  openResult = { canceled: false, filePaths: [first] };
  await click('打开');
  await waitFor(() => titleIs('first.md'), 'toolbar open');
  console.log('PASS toolbar file opening');

  await edit('# Unsaved changes');
  systemOpen(second);
  await waitFor(() => Promise.resolve(unsavedDialogCount > 0), 'unsaved prompt');
  assert.equal(await titleIs('first.md'), true);
  unsavedResponse = 1;
  systemOpen(second);
  await waitFor(() => titleIs('second.md'), 'discard and open');
  console.log('PASS unsaved cancel and discard on repeated open');

  // Opening a file must not overwrite changes made while its read is pending.
  let releaseRead;
  readGate = new Promise(resolve => { releaseRead = resolve; });
  readStarted = false;
  openResult = { canceled: false, filePaths: [first] };
  await click('打开');
  await waitFor(() => Promise.resolve(readStarted), 'pending file read');
  await edit('# Keep my new edit');
  unsavedResponse = 2;
  const promptsBeforeRead = unsavedDialogCount;
  releaseRead();
  readGate = null;
  await waitFor(() => Promise.resolve(unsavedDialogCount > promptsBeforeRead), 'confirm changes after read');
  assert.equal(await titleIs('second.md'), true);
  assert.equal(await evaluate(`document.querySelector('textarea').value`), '# Keep my new edit');
  unsavedResponse = 1;
  systemOpen(second);
  await waitFor(() => evaluate(`document.querySelector('.toolbar-title-meta').textContent !== '未保存更改'`), 'restore saved document');

  readGate = new Promise(resolve => { releaseRead = resolve; });
  readStarted = false;
  await click('打开');
  await waitFor(() => Promise.resolve(readStarted), 'second pending read');
  await click('新建');
  await waitFor(() => titleIs('未命名'), 'new document during read');
  await edit('# New document survives');
  releaseRead();
  readGate = null;
  await delay(200);
  assert.equal(await titleIs('未命名'), true);
  assert.equal(await evaluate(`document.querySelector('textarea').value`), '# New document survives');
  console.log('PASS pending open protects edits and newer document operations');

  const savedNew = path.join(profile, 'saved-new.md');
  saveResult = { canceled: false, filePath: savedNew };
  const savesBefore = saveDialogCount;
  await evaluate(`(() => { const save = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '保存'); save.click(); save.click(); })()`);
  await waitFor(() => titleIs('saved-new.md'), 'queued untitled save');
  await delay(150);
  assert.equal(saveDialogCount, savesBefore + 1);
  assert.equal(fs.readFileSync(savedNew, 'utf8'), '# New document survives');
  console.log('PASS queued untitled saves reuse the selected path');

  const safeMarkdown = '# A\n\n# A\n\n# A-2\n\nneedle first\n\nneedle second\n\nneedle third\n\nline one\nline two\n\n| left | right |\n| :-- | --: |\n| a | b |\n\n<div id="unsafe" style="position:fixed" onclick="evil()">safe text</div>\n\n```bash\necho "$HOME" @@TOKEN_0@@\n```\n\n```js\nconst url = "https://example.com";\n```';
  await edit(safeMarkdown);
  await click('分屏');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.markdown-split-content pre code'))`), 'shared live preview');
  const liveHtml = await evaluate(`document.querySelector('.markdown-split-content').innerHTML`);
  assert.ok(!liveHtml.includes('id="unsafe"') && !liveHtml.includes('onclick') && !liveHtml.includes('style='));
  await click('预览');
  await waitFor(() => evaluate(`document.querySelector('.markdown-preview-content')?.textContent.includes('needle third')`), 'reading rendering');
  assert.equal(await evaluate(`document.querySelector('.markdown-preview-content').innerHTML`), liveHtml);
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.markdown-preview-content h1')).map(h => h.id)`), ['a', 'a-2', 'a-2-2']);
  assert.equal(await evaluate(`document.querySelector('th:last-child').getAttribute('align')`), 'right');
  assert.equal(await evaluate(`document.querySelector('pre code').textContent`), 'echo "$HOME" @@TOKEN_0@@\n');
  await evaluate(`(() => { const input = document.querySelector('.markdown-preview input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'needle'); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await waitFor(() => evaluate(`document.querySelectorAll('mark[data-preview-search]').length === 3`), 'all paragraphs searched');
  await evaluate(`(() => { const input = document.querySelector('.markdown-preview input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ''); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await waitFor(() => evaluate(`document.querySelectorAll('mark[data-preview-search]').length === 0`), 'search cleared');
  console.log('PASS shared sanitized rendering, unique headings, code preservation and multi-paragraph search');

  const searchFor = async term => evaluate(`(() => { const input = document.querySelector('.markdown-preview input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(term)}); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await edit(Array.from({length: 510}, (_, i) => `needle ${i}`).join('\n\n'));
  await click('预览');
  await waitFor(() => evaluate(`document.querySelector('.markdown-preview-content')?.textContent.includes('needle 509')`), 'large search content');
  await searchFor('needle');
  await waitFor(() => evaluate(`document.querySelectorAll('mark[data-preview-search]').length === 500`), 'bounded search results');
  assert.ok(await evaluate(`document.querySelector('.markdown-preview-search-status').textContent.includes('500+')`));
  await edit(Array.from({length: 500}, (_, i) => `needle ${i}`).join('\n\n') + '\n\nNo match here');
  await click('预览');
  await waitFor(() => evaluate(`document.querySelector('.markdown-preview-content')?.textContent.includes('No match here')`), 'exact limit content');
  await searchFor('needle');
  await waitFor(() => evaluate(`document.querySelectorAll('mark[data-preview-search]').length === 500`), 'exactly 500 results');
  assert.equal(await evaluate(`document.querySelector('.markdown-preview-search-status').textContent.includes('500+')`), false);
  console.log('PASS search cap and exact-limit result count');

  await evaluate(`document.querySelector('.help-button').focus(); document.querySelector('.help-button').click()`);
  await waitFor(() => evaluate(`document.querySelector('dialog').open`), 'native help dialog');
  assert.equal(await evaluate(`document.activeElement.className`), 'help-close');
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  await waitFor(() => evaluate(`!document.querySelector('dialog').open`), 'help Escape close');
  assert.equal(await evaluate(`document.activeElement.className`), 'help-button');
  console.log('PASS help keyboard focus and Escape restoration');

  systemOpen(second);
  await waitFor(() => titleIs('second.md'), 'external conflict document');
  fs.writeFileSync(second, 'External changes');
  unsavedResponse = 1;
  const canceledSave = await evaluate(`window.electronAPI.saveFile(${JSON.stringify(second)}, 'my changes')`);
  assert.equal(canceledSave.success, false);
  assert.equal(fs.readFileSync(second, 'utf8'), 'External changes');
  unsavedResponse = 0;
  assert.equal((await evaluate(`window.electronAPI.saveFile(${JSON.stringify(second)}, '# Second\\n\\nOpened successfully')`)).success, true);
  unsavedResponse = 1;
  saveResult = { canceled: true };
  console.log('PASS external disk modifications require explicit overwrite');

  const markdown = `# PDF 导出验证\n\n这是尚未保存的中文内容。UNSAVED_EXPORT_MARKER\n\n## 基础格式\n\n**加粗**、*斜体*、~~删除线~~与 [链接](https://example.com)。\n\n- [x] 已完成\n- [ ] 待处理\n\n> 中文引用保持清晰。\n\n![测试图片](http://127.0.0.1:${server.address().port}/image.svg)\n\n## 表格与代码\n\n| 项目 | 说明 |\n| --- | --- |\n| 中文 | 内容自动换行 |\n\n\`\`\`ts\nconst message = "代码导出测试";\n${'long_line_'.repeat(30)}\n\`\`\`\n\n## 分页验证\n\n${Array.from({length: 75}, (_, i) => `第 ${i + 1} 段：用于检查跨页排版的中文正文。Pagination paragraph ${i + 1}.`).join('\n\n')}\n\nFINAL_PAGE_MARKER\n\n<script>document.title='INJECTED'</script><img src="x" onerror="document.title='INJECTED'">`;
  await edit(markdown);
  await click('导出 PDF');
  await waitFor(exportFinished, 'cancel export');
  assert.ok(!fs.existsSync(path.join(output, 'integration.pdf')) || saveDialogCount > 0);
  const pdfPath = path.join(output, 'integration.pdf');
  saveResult = { canceled: false, filePath: pdfPath };
  const dialogsBefore = saveDialogCount;
  await click('导出 PDF');
  await waitFor(exportFinished, 'PDF export');
  assert.equal(saveDialogCount, dialogsBefore + 1);
  assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString(), '%PDF-');
  assert.equal(fs.readFileSync(second, 'utf-8'), '# Second\n\nOpened successfully');
  assert.equal(await evaluate(`document.querySelector('.toolbar-title-meta').textContent`), '未保存更改');
  assert.ok(await evaluate(`document.body.textContent.includes('PDF 已导出')`));
  assert.equal(BrowserWindow.getAllWindows().length, 1);
  console.log('PASS PDF export from unsaved editor content, cancel, source preservation and window cleanup');

  // Errors never overwrite a non-PDF source; the pending flag resets for retry.
  saveResult = { canceled: false, filePath: second };
  const failure = await evaluate(`window.electronAPI.exportPdf({name:'second.md',html:'<p>bad</p>'})`);
  assert.equal(failure.success, false);
  assert.equal(fs.readFileSync(second, 'utf-8'), '# Second\n\nOpened successfully');
  const invalid = await evaluate(`window.electronAPI.exportPdf(null)`);
  assert.equal(invalid.success, false);
  saveResult = { canceled: false, filePath: path.join(output, 'empty.pdf') };
  assert.equal((await evaluate(`window.electronAPI.exportPdf({name:'未命名',html:'<p></p>'})`)).success, true);
  saveResult = { canceled: false, filePath: path.join(profile, 'missing', 'failure.pdf') };
  assert.equal((await evaluate(`window.electronAPI.exportPdf({name:'失败',html:'<p>test</p>'})`)).success, false);
  assert.equal(BrowserWindow.getAllWindows().length, 1);
  console.log('PASS invalid input, extension protection, empty PDF, write failure and retry');

  // A different renderer cannot gain export privileges even with the same preload.
  const other = new BrowserWindow({ show: false, webPreferences: { preload: path.resolve('dist-electron/preload.js'), sandbox: true, contextIsolation: true } });
  await other.loadURL('data:text/html,<p>Untrusted renderer</p>');
  const countBefore = saveDialogCount;
  const denied = await other.webContents.executeJavaScript(`window.electronAPI.exportPdf({name:'denied.md',html:'<p>denied</p>'})`);
  assert.equal(denied.success, false);
  assert.equal(saveDialogCount, countBefore);
  other.destroy();
  console.log('PASS untrusted IPC sender rejected before save dialog');

  await click('预览');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.markdown-preview-toc-link'))`), 'preview outline');
  await evaluate(`document.querySelector('.markdown-preview-toc-link').click()`);
  unsavedResponse = 2;
  const closePromptsBefore = unsavedDialogCount;
  win.close();
  await waitFor(() => Promise.resolve(unsavedDialogCount > closePromptsBefore), 'close confirmation after anchor');
  assert.equal(win.isDestroyed(), false);
  console.log('PASS close still protects unsaved content after anchor navigation');

  // Even after confirmation, asynchronous draft cleanup cannot hide new edits.
  let releaseUnlink;
  unlinkGate = new Promise(resolve => { releaseUnlink = resolve; });
  unsavedResponse = 1;
  win.close();
  await waitFor(() => Promise.resolve(unlinkStarted), 'pending close draft cleanup');
  await edit('# Changed during close');
  releaseUnlink();
  unlinkGate = null;
  await delay(150);
  assert.equal(win.isDestroyed(), false);
  assert.equal(await evaluate(`document.querySelector('textarea').value`), '# Changed during close');
  console.log('PASS pending close preserves changes during draft cleanup');

  win.setSize(800, 650);
  if (process.platform === 'linux') win.showInactive();
  await delay(150);
  const bounds = await evaluate(`Array.from(document.querySelectorAll('.toolbar-button')).map(button => { const r = button.getBoundingClientRect(); return {left:r.left,right:r.right}; })`);
  assert.ok(bounds.every(rect => rect.left >= 0 && rect.right <= 800));
  const screenshot = await win.webContents.capturePage();
  fs.writeFileSync(path.join(output, 'toolbar-800.png'), screenshot.toPNG());
  console.log(`PASS 800px toolbar layout; PDFs at ${output}`);
}).then(() => {
  clearTimeout(watchdog);
  server.close();
  app.exit(0);
}).catch(error => {
  console.error(error);
  clearTimeout(watchdog);
  server.close();
  app.exit(1);
});
