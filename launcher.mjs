import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { supportedNode } from './scripts/runtime.mjs';
import { selectPort } from './scripts/local-port.mjs';
import { buildFingerprint } from './scripts/build-cache.mjs';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
process.env.PATH = path.dirname(process.execPath) + path.delimiter + (process.env.PATH || '');
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (existsSync('.env')) process.loadEnvFile('.env');
const savedPort = existsSync('.local-port') ? readFileSync('.local-port', 'utf8').trim() : '';
let port = process.env.PORT || (/^\d+$/.test(savedPort) && +savedPort > 0 && +savedPort <= 65535 ? savedPort : '3000');
let url = `http://127.0.0.1:${port}`;
function openBrowser() {
  if (process.env.BROWSER === 'none') return;
  const command = process.platform === 'win32' ? 'powershell.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['-NoProfile', '-Command', `Start-Process '${url}' -ErrorAction Stop`] : [url];
  const result = spawnSync(command, args, { windowsHide: true, stdio: 'ignore' });
  if (result.error || result.status !== 0) console.log(`请手动打开浏览器：${url}`);
}
async function health() {
  try { return await (await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) })).json(); } catch { return null; }
}
function npm(...args) {
  const win = process.platform === 'win32';
  const result = spawnSync(win ? 'cmd.exe' : 'npm', win ? ['/d', '/c', 'npm', ...args] : args, { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`npm ${args.join(' ')} 失败，请检查上方信息。`);
}
try {
  if (!supportedNode(process.versions.node)) throw new Error('请安装 Node.js 22.19 或更新版本。');
  if (!/^\d+$/.test(port) || +port < 1 || +port > 65535) throw new Error('PORT 必须是 1–65535 的整数。');
  const selected = await selectPort(+port);
  if (selected.port !== +port) console.log(`端口 ${port} 已被占用，自动改用 ${selected.port}。`);
  port = String(selected.port);
  url = `http://127.0.0.1:${port}`;
  writeFileSync('.local-port', port);
  writeFileSync('.local-entry.js', `window.EASYREADER_URL = ${JSON.stringify(url)};\n`);
  if (selected.running) { console.log(`应用已经运行：${url}`); openBrowser(); process.exit(0); }
  const hash = createHash('sha256').update(readFileSync('package-lock.json')).update(process.execPath).update(process.versions.node).update(process.platform).update(process.arch).digest('hex');
  if (!existsSync('node_modules/tsx') || !existsSync('.deps-ready') || readFileSync('.deps-ready', 'utf8') !== hash) {
    console.log('首次启动：正在安装依赖……'); npm('ci'); writeFileSync('.deps-ready', hash);
  }
  const buildHash = buildFingerprint(process.cwd());
  if (!existsSync('dist/index.html') || !existsSync('.build-ready') || readFileSync('.build-ready', 'utf8') !== buildHash) {
    console.log('正在更新阅读界面……'); npm('run', 'build'); writeFileSync('.build-ready', buildHash);
  } else console.log('界面未变更，直接启动。');
  if (existsSync('.launcher-stopping')) unlinkSync('.launcher-stopping');
  writeFileSync('.launcher-process.json', JSON.stringify({ pid: process.pid, script: fileURLToPath(import.meta.url), executable: process.execPath }));
  process.on('exit', () => {
    try { if (JSON.parse(readFileSync('.launcher-process.json', 'utf8')).pid === process.pid) unlinkSync('.launcher-process.json'); } catch {}
  });
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { env: { ...process.env, NODE_ENV: 'production', PORT: port }, stdio: 'inherit', windowsHide: true });
  server.on('error', error => { console.error(error.message); process.exit(1); });
  server.on('exit', code => process.exit(code ?? 1));
  process.on('SIGINT', () => { server.kill(); process.exit(0); });
  process.on('SIGTERM', () => { server.kill(); process.exit(0); });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if ((await health())?.appId === 'easyreader-local') { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) { server.kill(); throw new Error('启动超时，请检查上方错误。'); }
  console.log(`已启动：${url}\n${process.env.EASYREADER_SILENT === '1' ? '后台运行中，双击“停止后台.cmd”退出。' : '关闭窗口或按 Ctrl+C 停止服务。'}`); openBrowser();
} catch (error) { console.error(error.message); process.exitCode = 1; }
