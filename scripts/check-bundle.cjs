const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve('dist');
const assets = path.join(directory, 'assets');
const files = fs.readdirSync(assets);
const entry = files.find(file => /^index-.*\.js$/.test(file));
const visited = new Set();
function visit(filename) {
  if (visited.has(filename)) return;
  visited.add(filename);
  const source = fs.readFileSync(path.join(assets, filename), 'utf8');
  // Follow only static import/export declarations; dynamic imports stay lazy.
  for (const match of source.matchAll(/(?:\bimport\s*(?:[^;"']*?\bfrom\s*)?|\bexport\s*[^;"']*?\bfrom\s*)["']\.\/([^"']+\.js)["']/g)) visit(match[1]);
}
assert.ok(entry, 'Production entry missing.');
visit(entry);
assert.ok(![...visited].some(file => file.includes('editor-vendor')), 'Editor leaked into initial static dependency graph.');
assert.ok(!fs.readFileSync(path.join(directory, 'index.html'), 'utf8').includes('href="./assets/editor-vendor'), 'Editor preloaded on startup.');
console.log(`PASS preview entry loads only ${[...visited].join(', ')}`);
