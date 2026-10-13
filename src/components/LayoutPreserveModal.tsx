import { EngineeringOptions } from './EngineeringOptions';
import { TranslationProgress } from './TranslationProgress';
import { Layers, FileText, Columns2, Download, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { TranslationDocument } from '../types';
import { loadPdf } from '../services/pdfFiles';
import { ContinuousPdfPreview as PdfPreview } from './ContinuousPdfPreview';

type Job = { id: string; state: 'running' | 'done' | 'error' | 'cancelled'; stage: string; progress: number; error?: string; warning?: string; current?: number; total?: number; startedAt?: number; updatedAt?: number };
const stageLabels: Record<string, string> = {
  'Parse PDF and Create Intermediate Representation': '正在解析 PDF',
  'Detect Scanned File': '正在检查扫描页', 'Parse Page Layout': '正在识别页面布局',
  'Parse Table': '正在识别表格', 'Parse Paragraphs': '正在识别段落',
  'Parse Formulas and Styles': '正在识别公式与字体', 'Translate Paragraphs': '正在翻译段落',
  'Typesetting': '正在排版', 'Add Fonts': '正在嵌入字体', 'Generate drawing instructions': '正在生成 PDF',
};
export function LayoutPreserveModal({ isOpen, onClose, document: doc }: { isOpen: boolean; onClose: () => void; document: TranslationDocument }) {
  const [file, setFile] = useState<Blob | null>(null), [name, setName] = useState('');
  const [engine, setEngine] = useState('bing'), [target, setTarget] = useState(doc.targetLang);
  const [job, setJob] = useState<Job | null>(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [view, setView] = useState<'dual' | 'mono' | 'source'>('dual');
  const [domain, setDomain] = useState('general'), [glossary, setGlossary] = useState('');
  const [speed, setSpeed] = useState('balanced'), [ocr, setOcr] = useState('balanced');
  const input = useRef<HTMLInputElement>(null);
  const [jobId, setJobId] = useState(() => localStorage.getItem('easyreader-layout-job') || '');
  useEffect(() => {
    if (!jobId) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/api/layout/jobs/${jobId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '读取任务失败');
        if (stopped) return;
        setJob(result); setError('');
        if (result.state === 'running') timer = setTimeout(poll, 1500);
      } catch (e: any) { if (!stopped) { setError(e.message); timer = setTimeout(poll, 5000); } }
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [jobId]);
  const running = busy || job?.state === 'running';
  const useCurrent = async () => {
    setError('');
    try {
      const original = await loadPdf(doc.id);
      if (!original) throw new Error('当前文档没有保存原始 PDF，请在此选择原文件。');
      setFile(original); setName(doc.fileName); setTarget(doc.targetLang);
    } catch (e: any) { setError(e.message); }
  };
  const start = async () => {
    if (!file || running) return;
    setBusy(true); setError('');
    try {
      const params = new URLSearchParams({ source: 'auto', target, engine, domain, glossary, speed, ocr });
      const response = await fetch(`/api/layout/jobs?${params}`, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '无法创建任务');
      setJob(result); setJobId(result.id);
      localStorage.setItem('easyreader-layout-job', result.id);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!job) return;
    try {
      const response = await fetch(`/api/layout/jobs/${job.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('取消失败，请稍后重试');
      setJob(await response.json());
    } catch (e: any) { setError(e.message); }
  };
  if (!isOpen) return null;
  const button = 'surface-button inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-40';
  return <div className="layer-enter fixed inset-0 z-50 flex flex-col bg-background text-foreground" role="dialog" aria-modal="true" aria-label="保留版式">
    <header className="flex items-center justify-between border-b border-border p-4">
      <div><h1 className="flex items-center gap-3 font-bold text-lg"><span className="feature-orb"><Layers size={20} /></span>保留版式 · BabelDOC</h1><p className="text-xs text-muted-foreground">保留原 PDF 的图片、公式与布局，生成可下载的译文和双语 PDF。</p></div>
      <button className={button} onClick={onClose}>返回阅读</button>
    </header>
    <details open={job?.state !== 'done'} className="border-b border-border">
    <summary className="surface-button cursor-pointer px-4 py-2 text-sm text-muted-foreground">翻译设置 · 文件 / 领域 / 速度 / OCR</summary>
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
      <input ref={input} type="file" accept=".pdf" className="hidden" onChange={e => {
        const selected = e.target.files?.[0];
        if (selected) { setFile(selected); setName(selected.name); setError(''); }
        e.target.value = '';
      }} />
      <button className={button} disabled={running} onClick={() => input.current?.click()}>选择 PDF</button>
      <button className={button} disabled={running || doc.fileType !== 'pdf'} onClick={useCurrent}>使用当前 PDF</button>
      <span className="max-w-64 truncate text-sm">{name || '请选择文件（最大 50 MB）'}</span>
      <label className="text-sm">引擎 <select className={button} value={engine} disabled={running} onChange={e => setEngine(e.target.value)}><option value="bing">Bing（默认）</option><option value="google">Google</option><option value="gemini-flash">Gemini · 逻辑翻译（需配置）</option></select></label>
      <label className="text-sm">译为 <select className={button} value={target} disabled={running} onChange={e => setTarget(e.target.value as typeof target)}>
        {Object.entries({ 'zh-CN': '简体中文', 'zh-TW': '繁体中文', en: '英语', ja: '日语', ko: '韩语', fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', it: '意大利语', pt: '葡萄牙语', ar: '阿拉伯语' }).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
      </select></label>
      <button className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-40" disabled={!file || running} onClick={start}>{running ? '正在生成…' : '生成保留版式 PDF'}</button>
      {job?.state === 'running' && <button className={button} onClick={cancel}>取消任务</button>}
    </div>
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <EngineeringOptions domain={domain} onDomain={setDomain} glossary={glossary} onGlossary={setGlossary} disabled={running} />
      <label className="text-sm">速度 <select aria-label="翻译速度" disabled={running} value={speed} onChange={e => setSpeed(e.target.value)} className={button}><option value="stable">稳妥 · 单任务</option><option value="balanced">均衡 · 并发复用</option><option value="fast">加速 · 可能限流</option></select></label>
      <label className="text-sm">OCR <select aria-label="OCR 精度" disabled={running} value={ocr} onChange={e => setOcr(e.target.value)} className={button}><option value="fast">快速 · 清晰扫描件</option><option value="balanced">均衡</option><option value="quality">精细 · 小字扫描件</option></select></label>
      <span className="text-xs text-muted-foreground">领域模式统一英→简中术语；AI 模式约束条件、因果、单位和公式，仍需校核。</span>
    </div>
    </details>
    {(error || job?.error) && <p role="alert" className="p-3 text-sm text-red-500 whitespace-pre-wrap">{error || job?.error}</p>}
    {job?.warning && <p role="status" className="px-4 py-2 text-sm text-amber-600 dark:text-amber-400">{job.warning}</p>}
    {job?.state === 'running' && <TranslationProgress {...job} stage={stageLabels[job.stage] || job.stage} />}
    {job?.state === 'done' ? <>
      <div className="flex flex-wrap gap-3 p-3 border-b border-border">
        <button aria-pressed={view === 'source'} className={button} onClick={() => setView('source')}><Layers size={16} />原始 PDF</button>
        <button aria-pressed={view === 'dual'} className={button} onClick={() => setView('dual')}><Columns2 size={16} />双语对照</button>
        <button aria-pressed={view === 'mono'} className={button} onClick={() => setView('mono')}><FileText size={16} />仅看译文</button>
        <a className={button} href={`/api/layout/jobs/${job.id}/mono.pdf?download=1`}><Download size={16} />下载译文 PDF</a>
        <a className={button} href={`/api/layout/jobs/${job.id}/dual.pdf?download=1`}><Download size={16} />下载双语 PDF</a>
      </div>
      <PdfPreview key={`${job.id}-${view}`} url={`/api/layout/jobs/${job.id}/${view}.pdf`} />
    </> : <div className="p-8 text-muted-foreground text-sm leading-7">
      <p>适合有文字层的论文、报告和技术文档。复杂表格与文字较密的页面，生成后请检查排版。</p>
      <p>首次使用会准备依赖、版面模型、字体与本地 OCR，之后复用缓存，不会每次重新安装。也可提前运行“准备版式资源.cmd”。关闭此面板后任务仍会继续；关闭本地服务会中断任务。</p>
      <p>Bing / Google 无需密钥；Gemini 逻辑翻译需配置密钥和模型。无文字层的扫描页会自动进行本地 OCR（主要支持中英文印刷体）；已有 OCR 层自动启用扫描页兼容处理。请检查识别及排版结果。</p>
      {job?.state === 'cancelled' && <p>任务已取消，可以重新生成。</p>}
    </div>}
  </div>;
}
