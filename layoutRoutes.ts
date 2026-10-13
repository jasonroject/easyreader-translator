import express from 'express';
import { pythonPath } from './scripts/runtime.mjs';
import { spawn, spawnSync, ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { networkProxy } from './network';

const root = path.resolve(import.meta.dirname, '.layout-jobs');
const python = pythonPath(import.meta.dirname);
type Job = { id: string; state: 'running' | 'done' | 'error' | 'cancelled'; stage: string; progress: number; error?: string };
const jobs = new Map<string, Job>();
const processes = new Map<string, ChildProcess>();
function stopChild(child?: ChildProcess) {
  if (!child?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill();
}
const languages = new Set(['auto', 'en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'it', 'pt', 'ar']);
export const layoutRoutes = express.Router();
layoutRoutes.get('/status', (_req, res) => res.json({ installed: existsSync(python), version: '0.6.4' }));
layoutRoutes.post('/jobs', express.raw({ type: 'application/pdf', limit: '50mb' }), (req, res) => {
  if ([...jobs.values()].some(job => job.state === 'running')) return res.status(409).json({ error: '已有版式任务正在处理，请等待完成或取消。' });
  if (!Buffer.isBuffer(req.body) || !req.body.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return res.status(400).json({ error: '请选择有效的 PDF 文件（最大 50 MB）。' });
  const source = String(req.query.source || 'auto'), target = String(req.query.target || 'zh-CN');
  const engine = String(req.query.engine || 'bing');
  if (!['bing', 'google'].includes(engine) || !languages.has(source) || !languages.has(target) || target === 'auto') return res.status(400).json({ error: '不支持的语言或翻译引擎。' });
  const id = randomUUID();
  const dir = path.join(root, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'source.pdf'), req.body);
  writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ engine, source, target, api_url: `http://127.0.0.1:${process.env.PORT || 3000}/api/translate` }));
  const job: Job = { id, state: 'running', stage: '正在准备保留版式环境', progress: 0 };
  jobs.set(id, job);
  const save = () => writeFileSync(path.join(dir, 'status.json'), JSON.stringify(job));
  const fail = (message: string) => { if (job.state === 'running') { job.state = 'error'; job.error = message; save(); } };
  const env = { ...process.env, PYTHONUTF8: '1', PYTHONUNBUFFERED: '1', ...(networkProxy ? { HTTPS_PROXY: networkProxy, HTTP_PROXY: networkProxy } : {}) };
  const run = () => {
    if (job.state !== 'running') return;
    const child = spawn(python, ['scripts/layout_worker.py', dir], { cwd: import.meta.dirname, windowsHide: true, env });
    processes.set(id, child);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    let buffer = '', errors = '';
    child.stdout.on('data', chunk => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n'); buffer = lines.pop() || '';
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (job.state !== 'running') continue;
          if (event.error) fail(event.error);
          else { job.stage = event.stage || job.stage; job.progress = Math.max(job.progress, Math.min(99, Number(event.progress) || 0)); save(); }
        } catch { /* Library diagnostics are not progress events. */ }
      }
    });
    child.stderr.on('data', chunk => { errors = (errors + chunk.toString('utf8')).slice(-5000); });
    child.on('error', error => fail(error.message));
    const timer = setTimeout(() => { fail('任务超过 60 分钟，请缩小 PDF 后重试。'); stopChild(child); }, 60 * 60 * 1000);
    child.on('close', code => {
      clearTimeout(timer); processes.delete(id);
      if (code === 0 && job.state === 'running' && existsSync(path.join(dir, 'mono.pdf')) && existsSync(path.join(dir, 'dual.pdf'))) {
        job.state = 'done'; job.progress = 100; job.stage = '已完成'; save();
      } else fail(errors.slice(-1000) || '任务未完成，请检查网络或 PDF 文件。');
    });
  };
  save();
  const stamp = path.join(import.meta.dirname, '.layout-ready');
  const hash = createHash('sha256').update(readFileSync(path.join(import.meta.dirname, 'scripts/layout-requirements.txt'))).update(python).digest('hex');
  if (existsSync(python) && existsSync(stamp) && readFileSync(stamp, 'utf8') === hash) run();
  else {
    const setup = spawn(process.execPath, ['scripts/setup-layout.mjs'], { cwd: import.meta.dirname, env, windowsHide: true });
    processes.set(id, setup);
    setup.stdout.resume(); setup.stderr.resume();
    setup.on('error', error => fail(error.message));
    setup.on('close', code => { processes.delete(id); if (code === 0) run(); else fail('环境安装失败，请安装 uv 后重试。'); });
  }
  res.status(202).json(job);
});
function getJob(id: string): Job | undefined {
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  if (jobs.has(id)) return jobs.get(id);
  try {
    const job: Job = JSON.parse(readFileSync(path.join(root, id, 'status.json'), 'utf8'));
    if (job.state === 'running') { job.state = 'error'; job.error = '服务曾重启，请重新生成。'; }
    return job;
  } catch { return; }
}
layoutRoutes.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: '任务不存在' });
  res.json(job);
});
layoutRoutes.delete('/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: '任务不存在' });
  if (job.state === 'running') { job.state = 'cancelled'; job.stage = '已取消'; stopChild(processes.get(job.id)); writeFileSync(path.join(root, job.id, 'status.json'), JSON.stringify(job)); }
  res.json(job);
});
layoutRoutes.get('/jobs/:id/:file', (req, res) => {
  const job = getJob(req.params.id), file = req.params.file;
  if (!job || job.state !== 'done' || !['mono.pdf', 'dual.pdf', 'source.pdf'].includes(file)) return res.status(404).end();
  res.setHeader('Content-Type', 'application/pdf');
  if (req.query.download === '1') res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
  res.sendFile(path.join(root, job.id, file));
});
