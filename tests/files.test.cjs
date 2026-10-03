const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { atomicWriteFile, getFileVersion } = require('../dist-electron/files.js');
const { isRecoveryDraft } = require('../dist-electron/recovery.js');

async function directory(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'md-editor-files-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('atomic saves preserve content, permissions and expose a new disk version', async t => {
  const root = await directory(t);
  const file = path.join(root, 'note.md');
  assert.equal(await getFileVersion(file), null);
  await atomicWriteFile(file, '# First');
  await fs.chmod(file, 0o640);
  const before = await getFileVersion(file);
  await atomicWriteFile(file, '# Updated 中文');
  assert.equal(await fs.readFile(file, 'utf8'), '# Updated 中文');
  assert.notEqual(await getFileVersion(file), before);
  if (process.platform !== 'win32') assert.equal((await fs.stat(file)).mode & 0o777, 0o640);
  assert.deepEqual(await fs.readdir(root), ['note.md']);
  await fs.unlink(file);
  assert.equal(await getFileVersion(file), null);
});

test('saving through a symlink preserves the link and updates its target', { skip: process.platform === 'win32' }, async t => {
  const root = await directory(t);
  const target = path.join(root, 'target.md');
  const link = path.join(root, 'link.md');
  await fs.writeFile(target, 'original');
  await fs.symlink(target, link);
  await atomicWriteFile(link, 'updated');
  assert.ok((await fs.lstat(link)).isSymbolicLink());
  assert.equal(await fs.readFile(target, 'utf8'), 'updated');
  await fs.unlink(target);
  await assert.rejects(atomicWriteFile(link, 'lost target'));
  assert.ok((await fs.lstat(link)).isSymbolicLink());
});

test('failed replacement preserves the original and removes temporary files', async t => {
  const root = await directory(t);
  const target = path.join(root, 'folder.md');
  await fs.mkdir(target);
  await fs.writeFile(path.join(target, 'kept'), 'original');
  await assert.rejects(atomicWriteFile(target, 'replacement'));
  assert.equal(await fs.readFile(path.join(target, 'kept'), 'utf8'), 'original');
  assert.deepEqual(await fs.readdir(root), ['folder.md']);
});

test('PDF export can replace a destination link without overwriting its source target', { skip: process.platform === 'win32' }, async t => {
  const root = await directory(t);
  const source = path.join(root, 'source.md');
  const output = path.join(root, 'export.pdf');
  await fs.writeFile(source, '# Original');
  await fs.symlink(source, output);
  await atomicWriteFile(output, Buffer.from('%PDF-test'), { preserveSymbolicLink: false });
  assert.equal(await fs.readFile(source, 'utf8'), '# Original');
  assert.equal(await fs.readFile(output, 'utf8'), '%PDF-test');
  assert.equal((await fs.lstat(output)).isSymbolicLink(), false);
});

test('recovery accepts bounded text and rejects malformed or oversized drafts', () => {
  assert.ok(isRecoveryDraft({ name: '未命名', content: '中文草稿' }));
  for (const draft of [null, {}, { name: 'a', content: 42 }, { name: 'x'.repeat(256), content: '' },
    { name: 'a', content: '中'.repeat(4 * 1024 * 1024) }]) {
    assert.equal(isRecoveryDraft(draft), false);
  }
});
