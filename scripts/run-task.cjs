const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = fs.realpathSync(path.join(__dirname, '..'));
const task = process.argv[2];
const executable = name => path.join(root, 'node_modules', '.bin', name + (process.platform === 'win32' ? '.cmd' : ''));
const steps = {
  typecheck: [['tsc', '--noEmit'], ['tsc', '-p', 'tsconfig.electron.json', '--noEmit']],
  test: [['tsc', '-p', 'tsconfig.electron.json'], [process.execPath, '--test', '--test-concurrency=2', ...fs.readdirSync(path.join(root, 'tests')).filter(file => file.endsWith('.test.cjs')).map(file => 'tests/' + file)]],
  build: [['tsc', '--noEmit'], ['tsc', '-p', 'tsconfig.electron.json'], ['vite', 'build'], [process.execPath, 'scripts/check-bundle.cjs']],
  integration: [['electron', 'tests/electron-integration.cjs'], ['electron', 'tests/recovery-integration.cjs']],
  verify: [],
  package: [['electron-builder', ...process.argv.slice(3)]],
};
steps.verify = [...steps.test, ...steps.build, ...steps.integration];
if (!steps[task]) throw new Error('Unknown task: ' + task);
const lockDirectory = path.join(root, 'work');
const lockFile = path.join(lockDirectory, 'verification.lock');
fs.mkdirSync(lockDirectory, { recursive: true });
function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const descriptor = fs.openSync(lockFile, 'wx', 0o600);
      fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, hostname: os.hostname(), task }));
      fs.closeSync(descriptor);
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let owner;
      try { owner = JSON.parse(fs.readFileSync(lockFile, 'utf8')); } catch { throw new Error('Existing verification lock cannot be inspected.'); }
      let alive = true;
      if (owner.hostname === os.hostname()) {
        try { process.kill(owner.pid, 0); } catch (check) { if (check.code === 'ESRCH') alive = false; }
      }
      if (alive) throw new Error(`Another ${owner.task} operation is active (PID ${owner.pid}). Wait for it to finish.`);
      fs.unlinkSync(lockFile);
    }
  }
  throw new Error('Could not acquire verification lock.');
}
let child;
let receivedSignal;
function releaseLock() {
  try {
    if (JSON.parse(fs.readFileSync(lockFile, 'utf8')).pid === process.pid) fs.unlinkSync(lockFile);
  } catch (error) { if (error.code !== 'ENOENT') console.error(error.message); }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { receivedSignal = signal; if (child) child.kill(signal); });
(async () => {
  acquireLock();
  process.on('exit', releaseLock);
  for (const [program, ...args] of steps[task]) {
    if (receivedSignal) throw new Error('Verification interrupted.');
    const command = program === process.execPath ? program : executable(program);
    console.log(`Running ${path.basename(program)} ${args.join(' ')}`);
    const code = await new Promise((resolve, reject) => {
      child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, GOMAXPROCS: '2', UV_THREADPOOL_SIZE: '2' } });
      child.on('error', reject);
      child.on('exit', exitCode => { child = null; resolve(exitCode); });
    });
    if (code !== 0) { process.exitCode = typeof code === 'number' ? code : 1; return; }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
