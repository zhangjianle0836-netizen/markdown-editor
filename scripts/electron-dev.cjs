const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const binary = name => path.join(root, 'node_modules', '.bin', name + (process.platform === 'win32' ? '.cmd' : ''));
const compiler = spawn(binary('tsc'), ['-p', 'tsconfig.electron.json', '--watch', '--preserveWatchOutput'], { cwd: root, shell: process.platform === 'win32', stdio: ['inherit', 'pipe', 'inherit'] });
let electron;
let restartPending = false;
let stopping = false;
function startElectron() {
  electron = spawn(require('electron'), ['.'], { cwd: root, env: { ...process.env, NODE_ENV: 'development' }, stdio: 'inherit' });
  electron.on('exit', () => { electron = null; if (restartPending && !stopping) { restartPending = false; startElectron(); } });
}
let output = '';
compiler.stdout.on('data', data => {
  process.stdout.write(data);
  output += data.toString();
  if (!output.includes('Watching for file changes.')) return;
  const succeeded = output.includes('Found 0 errors.');
  output = '';
  if (!succeeded) return;
  if (electron) { restartPending = true; electron.kill('SIGTERM'); }
  else startElectron();
});
compiler.on('exit', code => { if (!stopping) { stopping = true; if (electron) electron.kill('SIGTERM'); process.exitCode = code || 1; } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopping = true; compiler.kill(signal); if (electron) electron.kill(signal); });
