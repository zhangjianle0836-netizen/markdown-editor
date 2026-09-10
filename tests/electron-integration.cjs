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
BrowserWindow.prototype.show = function () {};
let saveResult = { canceled: true };
let openResult = { canceled: true, filePaths: [] };
let unsavedResponse = 2;
let saveDialogCount = 0;
let unsavedDialogCount = 0;
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

  win.setSize(800, 650);
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
