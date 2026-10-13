import express from 'express';
import { pythonPath } from './scripts/runtime.mjs';
import { spawn, spawnSync, ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { networkProxy } from './network';
import { engineeringDomains } from './src/services/engineeringDomains';

const root = path.resolve(import.meta.dirname, '.layout-jobs');
const python = pythonPath(import.meta.dirname);
type Job = { id: string; state: 'running' | 'done' | 'error' | 'cancelled'; stage: string; progress: number; error?: string; warning?: string; current?: number; total?: number; startedAt?: number; updatedAt?: number };
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
layoutRoutes.post('/annotated-pdf', (req, res) => {
  if (!existsSync(python)) return res.status(400).json({ error: '请先运行“准备版式资源.cmd”，安装本地 PDF 写入环境。' });
  const { pdf, pages } = req.body || {};
  if (typeof pdf !== 'string' || pdf.length > 42_000_000 || !Array.isArray(pages) || pages.length > 1000) return res.status(400).json({ error: 'PDF 或插入文字数据不合法。' });
  let count = 0;
  for (const item of pages) {
    if (!Number.isInteger(item?.page) || item.page < 1 || !Array.isArray(item.notes)) return res.status(400).json({ error: '批注页码不合法。' });
    for (const note of item.notes) {
      if (++count > 1000 || typeof note?.text !== 'string' || note.text.length > 10000 || ![note.point?.x, note.point?.y].every(value => Number.isFinite(value) && value >= 0 && value < 1000) || (note.color && !/^#[0-9a-f]{6}$/i.test(note.color)) || (note.fontSize != null && (!Number.isFinite(note.fontSize) || note.fontSize < 6 || note.fontSize > 60))) return res.status(400).json({ error: '插入文字的位置、长度或样式不合法。' });
    }
  }
  const bytes = Buffer.from(pdf, 'base64');
  if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return res.status(400).json({ error: '不是有效的 PDF。' });
  const dir = path.join(root, randomUUID()); mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'input.pdf'), bytes); writeFileSync(path.join(dir, 'notes.json'), JSON.stringify(pages));
  const child = spawn(python, ['scripts/annotate_pdf.py', dir], { cwd: import.meta.dirname, windowsHide: true, env: { ...process.env, PYTHONUTF8: '1' } });
  let errors = '', timedOut = false;
  child.stdout.resume(); child.stderr.on('data', value => { errors = (errors + value.toString()).slice(-1000); });
  const timer = setTimeout(() => { timedOut = true; stopChild(child); }, 60000);
  child.on('error', () => { if (!res.headersSent) res.status(500).json({ error: '无法启动 PDF 写入程序。' }); });
  child.on('close', code => {
    clearTimeout(timer); if (res.headersSent) return;
    if (code !== 0) return res.status(500).json({ error: timedOut ? '插字导出超时，请缩小 PDF 后重试。' : errors || '插字导出失败。' });
    res.type('application/pdf').sendFile(path.join(dir, 'annotated.pdf'));
  });
});
layoutRoutes.post('/jobs', express.raw({ type: 'application/pdf', limit: '50mb' }), (req, res) => {
  if ([...jobs.values()].some(job => job.state === 'running')) return res.status(409).json({ error: '已有版式任务正在处理，请等待完成或取消。' });
  if (!Buffer.isBuffer(req.body) || !req.body.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return res.status(400).json({ error: '请选择有效的 PDF 文件（最大 50 MB）。' });
  const source = String(req.query.source || 'auto'), target = String(req.query.target || 'zh-CN');
  const engine = String(req.query.engine || 'bing');
  const speed = String(req.query.speed || 'balanced'), ocr = String(req.query.ocr || 'balanced');
  const domain = String(req.query.domain || 'general'), glossary = String(req.query.glossary || '');
  if (!['stable', 'balanced', 'fast'].includes(speed) || !['fast', 'balanced', 'quality'].includes(ocr) || !Object.hasOwn(engineeringDomains, domain) || glossary.length > 2000) return res.status(400).json({ error: '版式参数不合法。' });
  if (!['bing', 'google', 'gemini-flash'].includes(engine) || !languages.has(source) || !languages.has(target) || target === 'auto') return res.status(400).json({ error: '不支持的语言或翻译引擎。' });
  if (engine === 'gemini-flash' && (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL)) return res.status(400).json({ error: 'AI 工程翻译需要在 .env.local 中配置 GEMINI_API_KEY 与 GEMINI_MODEL。免 Key 可选 Bing 或 Google。' });
  const id = randomUUID();
  const dir = path.join(root, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'source.pdf'), req.body);
  writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ engine, source, target, speed, ocr, domain, glossary, model: engine === 'gemini-flash' ? process.env.GEMINI_MODEL : '', api_url: `http://127.0.0.1:${process.env.PORT || 3000}/api/translate` }));
  const job: Job = { id, state: 'running', stage: '正在准备保留版式环境', progress: 0, startedAt: Date.now() };
  jobs.set(id, job);
  const save = () => { job.updatedAt = Date.now(); writeFileSync(path.join(dir, 'status.json'), JSON.stringify(job)); };
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
          if (event.error) { fail(event.error); stopChild(child); }
          else if (event.warning) { job.warning = event.warning; save(); }
          else {
            job.stage = event.stage || job.stage;
            job.current = typeof event.current === 'number' ? event.current : undefined;
            job.total = typeof event.total === 'number' ? event.total : undefined;
            job.progress = Math.max(job.progress, Math.min(99, Number(event.progress) || 0)); save();
          }
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
    const setupTimer = setTimeout(() => { fail('环境准备超过 15 分钟，请检查网络后运行“准备版式资源.cmd”，完成后重试。'); stopChild(setup); }, 15 * 60 * 1000);
    setup.stdout.resume(); setup.stderr.resume();
    setup.on('error', error => fail(error.message));
    setup.on('close', code => { clearTimeout(setupTimer); processes.delete(id); if (code === 0) run(); else fail('环境安装失败，请运行“准备版式资源.cmd”查看具体错误，并确认 uv 已安装、网络可用。'); });
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
