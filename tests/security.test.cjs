const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const {
  findSupportedFileArgument,
  isSafeExternalUrl,
  matchesTrustedRendererUrl,
  normalizePathKey,
} = require('../dist-electron/security.js');

test('renderer URL validation only accepts the configured document', () => {
  const trusted = 'file:///Applications/MDEditor/resources/app/dist/index.html';

  assert.equal(matchesTrustedRendererUrl(trusted, trusted), true);
  assert.equal(matchesTrustedRendererUrl(`${trusted}#section`, trusted), true);
  assert.equal(
    matchesTrustedRendererUrl('https://attacker.example/index.html', trusted),
    false
  );
  assert.equal(
    matchesTrustedRendererUrl(
      'file:///Applications/MDEditor/resources/app/dist/other.html',
      trusted
    ),
    false
  );
});

test('external URL validation rejects executable and local protocols', () => {
  assert.equal(isSafeExternalUrl('https://example.com/docs'), true);
  assert.equal(isSafeExternalUrl('mailto:test@example.com'), true);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('file:///etc/passwd'), false);
  assert.equal(isSafeExternalUrl('custom-protocol://payload'), false);
});

test('file argument parsing is case insensitive and ignores unsupported inputs', () => {
  const existing = new Set([
    path.resolve('/tmp/README.MD'),
    path.resolve('/tmp/notes.mdown'),
  ]);
  const exists = (filePath) => existing.has(filePath);

  assert.equal(
    findSupportedFileArgument(['--flag', '/tmp/README.MD'], exists),
    path.resolve('/tmp/README.MD')
  );
  assert.equal(
    findSupportedFileArgument(['/tmp/notes.mdown'], exists),
    path.resolve('/tmp/notes.mdown')
  );
  assert.equal(findSupportedFileArgument(['/tmp/script.js'], () => true), null);
});

test('path normalization rejects null bytes and normalizes Windows casing', () => {
  assert.equal(normalizePathKey('bad\0path'), null);
  assert.equal(
    normalizePathKey('/TMP/Document.MD', 'win32'),
    path.resolve('/TMP/Document.MD').toLowerCase()
  );
});
