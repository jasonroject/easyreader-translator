import React, { useEffect, useRef, useState } from 'react';
import { TranslationDocument } from '../types';
import { loadPdf } from '../services/pdfFiles';
import { ContinuousPdfPreview as PdfPreview } from './ContinuousPdfPreview';

type Job = { id: string; state: 'running' | 'done' | 'error' | 'cancelled'; stage: string; progress: number; error?: string; current?: number; total?: number; startedAt?: number; updatedAt?: number };
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
  const [busy, setBusy] = useState(false), [view, setView] = useState<'dual' | 'mono'>('dual');
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
      const params = new URLSearchParams({ source: 'auto', target, engine });
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
  const button = 'rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-40';
  return <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground" role="dialog" aria-modal="true" aria-label="保留版式">
    <header className="flex items-center justify-between border-b border-border p-4">
      <div><h1 className="font-bold text-lg">保留版式 · BabelDOC</h1><p className="text-xs text-muted-foreground">保留原 PDF 的图片、公式与布局，生成可下载的译文和双语 PDF。</p></div>
      <button className={button} onClick={onClose}>返回阅读</button>
    </header>
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
      <input ref={input} type="file" accept=".pdf" className="hidden" onChange={e => {
        const selected = e.target.files?.[0];
        if (selected) { setFile(selected); setName(selected.name); setError(''); }
        e.target.value = '';
      }} />
      <button className={button} disabled={running} onClick={() => input.current?.click()}>选择 PDF</button>
      <button className={button} disabled={running || doc.fileType !== 'pdf'} onClick={useCurrent}>使用当前 PDF</button>
      <span className="max-w-64 truncate text-sm">{name || '请选择文件（最大 50 MB）'}</span>
      <label className="text-sm">引擎 <select className={button} value={engine} disabled={running} onChange={e => setEngine(e.target.value)}><option value="bing">Bing（默认）</option><option value="google">Google</option></select></label>
      <label className="text-sm">译为 <select className={button} value={target} disabled={running} onChange={e => setTarget(e.target.value as typeof target)}>
        {Object.entries({ 'zh-CN': '简体中文', 'zh-TW': '繁体中文', en: '英语', ja: '日语', ko: '韩语', fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', it: '意大利语', pt: '葡萄牙语', ar: '阿拉伯语' }).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
      </select></label>
      <button className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-40" disabled={!file || running} onClick={start}>{running ? '正在生成…' : '生成保留版式 PDF'}</button>
      {job?.state === 'running' && <button className={button} onClick={cancel}>取消任务</button>}
    </div>
    {(error || job?.error) && <p role="alert" className="p-3 text-sm text-red-500 whitespace-pre-wrap">{error || job?.error}</p>}
    {job?.state === 'running' && <div className="p-4" role="status">
      <p className="text-sm mb-2">{stageLabels[job.stage] || job.stage} · {Math.round(job.progress)}%{job.total != null && job.total > 0 ? ` · ${job.current ?? 0} / ${job.total}` : ''}{job.startedAt ? ` · 已用时 ${Math.floor((Date.now() - job.startedAt) / 60000)} 分 ${Math.floor((Date.now() - job.startedAt) / 1000) % 60} 秒` : ''}</p>
      <progress className="w-full" max={100} value={job.progress} />
      <p className="mt-2 text-xs text-muted-foreground">长文档按段落依次翻译，可能需要数分钟。可以返回阅读，任务会在后台继续。网络或限流错误会停止任务并显示原因。</p>
    </div>}
    {job?.state === 'done' ? <>
      <div className="flex flex-wrap gap-3 p-3 border-b border-border">
        <button aria-pressed={view === 'dual'} className={button} onClick={() => setView('dual')}>双语对照</button>
        <button aria-pressed={view === 'mono'} className={button} onClick={() => setView('mono')}>仅看译文</button>
        <a className={button} href={`/api/layout/jobs/${job.id}/mono.pdf?download=1`}>下载译文 PDF</a>
        <a className={button} href={`/api/layout/jobs/${job.id}/dual.pdf?download=1`}>下载双语 PDF</a>
      </div>
      <PdfPreview key={`${job.id}-${view}`} url={`/api/layout/jobs/${job.id}/${view}.pdf`} />
    </> : <div className="p-8 text-muted-foreground text-sm leading-7">
      <p>适合有文字层的论文、报告和技术文档。复杂表格与文字较密的页面，生成后请检查排版。</p>
      <p>首次使用会准备依赖、版面模型、字体与本地 OCR，之后复用缓存，不会每次重新安装。也可提前运行“准备版式资源.cmd”。关闭此面板后任务仍会继续；关闭本地服务会中断任务。</p>
      <p>本模块使用 Bing / Google 翻译正文，无需 Gemini 密钥。无文字层的扫描页会自动进行本地 OCR（主要支持中英文印刷体）；已有 OCR 层自动启用扫描页兼容处理。请检查识别及排版结果。</p>
      {job?.state === 'cancelled' && <p>任务已取消，可以重新生成。</p>}
    </div>}
  </div>;
}
