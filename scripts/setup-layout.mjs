import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pythonPath } from './runtime.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.HTTPS_PROXY && !process.env.HTTP_PROXY && process.platform === 'win32') {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', "$p = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if ($p.ProxyEnable -eq 1) { $p.ProxyServer }"], { encoding: 'utf8', windowsHide: true });
  const value = result.stdout?.trim();
  const proxy = value?.includes('=') ? value.split(';').find(p => p.startsWith('https='))?.slice(6) || value.split(';').find(p => p.startsWith('http='))?.slice(5) : value;
  if (proxy) process.env.HTTPS_PROXY = process.env.HTTP_PROXY = proxy.includes('://') ? proxy : `http://${proxy}`;
}
const python = pythonPath(root);
const candidate = path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'uv.exe' : 'uv');
const uv = existsSync(candidate) ? candidate : 'uv';
const stamp = path.join(root, '.layout-ready');
const hash = createHash('sha256').update(readFileSync('scripts/layout-requirements.txt')).update(python).digest('hex');
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true, env: { ...process.env, PYTHONUTF8: '1' } });
  if (result.error || result.status !== 0) throw new Error(`版式资源准备失败：${result.error?.message || command}。请确认 uv 已安装且网络可用。`);
}
try {
  const ready = existsSync(python) && existsSync(stamp) && readFileSync(stamp, 'utf8') === hash;
  if (!ready) {
    if (!existsSync(python)) run(uv, ['venv', '--python', '3.12', '.babeldoc-venv']);
    run(uv, ['pip', 'install', '--python', python, '-r', 'scripts/layout-requirements.txt']);
    run(python, ['-c', 'from babeldoc.format.pdf.high_level import async_translate; from rapidocr_onnxruntime import RapidOCR']);
  }
  run(python, ['scripts/prepare-assets.py']);
  writeFileSync(stamp, hash);
} catch (error) { console.error(error.message); process.exitCode = 1; }
