// Recover an actual persisted draft in an isolated Electron profile.
const assert = require('node:assert/strict');
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'md-editor-recovery-'));
const draftPath = path.join(profile, 'recovery-draft.json');
const content = '# Recovered 中文\n\nUnsaved content';
fs.writeFileSync(draftPath, JSON.stringify({ name: 'original.md', content, path: '/unauthorized.md' }));
app.setPath('userData', profile);
BrowserWindow.prototype.show = function () {};
let prompts = 0;
dialog.showMessageBox = async () => { prompts++; return { response: 0 }; };
const destination = path.join(profile, 'recovered.md');
dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async predicate => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(40);
  }
  throw new Error('Recovery integration timed out');
};
const watchdog = setTimeout(() => app.exit(1), 25000);
require('../dist-electron/main.js');
app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0];
  const evaluate = code => win.webContents.executeJavaScript(code);
  await waitFor(() => evaluate(`document.querySelector('textarea')?.value === ${JSON.stringify(content)}`).catch(() => false));
  assert.equal(prompts, 1);
  assert.equal(await evaluate(`document.querySelector('.toolbar-title-meta').textContent`), '未保存更改');
  assert.equal((await evaluate(`window.electronAPI.saveFile('/unauthorized.md', 'denied')`)).success, false);
  assert.equal(await evaluate(`window.electronAPI.updateRecoveryDraft({name:'bad',content:42})`), false);
  await delay(850);
  assert.equal(JSON.parse(fs.readFileSync(draftPath, 'utf8')).content, content);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '保存').click()`);
  await waitFor(() => Promise.resolve(fs.existsSync(destination) && !fs.existsSync(draftPath)));
  assert.equal(fs.readFileSync(destination, 'utf8'), content);
  console.log('PASS persisted draft recovery, bounded IPC, fresh save authorization and draft cleanup');
}).then(() => { clearTimeout(watchdog); app.exit(0); }).catch(error => {
  console.error(error); clearTimeout(watchdog); app.exit(1);
});
