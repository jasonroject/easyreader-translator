import { EngineeringOptions } from './EngineeringOptions';
import { TranslationProgress } from './TranslationProgress';
import { Layers, FileText, Columns2, Download, ArrowUpRight, ChevronDown, Upload, ArrowLeft, FileCheck2, Maximize, Minimize, SlidersHorizontal } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
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
  const [fullscreen, setFullscreen] = useState(false);
  const [readerTools, setReaderTools] = useState(false);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) { setFullscreen(false); setReaderTools(false); return; }
    const handleKey = (event: KeyboardEvent) => {
      const toggle = event.key === 'F11' || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f');
      if ((toggle && job?.state === 'done') || (event.key === 'Escape' && fullscreen)) {
        event.preventDefault(); event.stopImmediatePropagation();
        setFullscreen(value => event.key === 'Escape' ? false : !value);
      }
    };
    // Capture before the main reader's shortcut so the two modes never conflict.
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, fullscreen, job?.state]);
  useEffect(() => {
    setReaderTools(false);
    if (!fullscreen && isOpen) fullscreenButton.current?.focus();
  }, [fullscreen]);
  const reducedMotion = useReducedMotion();
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
        if (result.state === 'running') timer = setTimeout(poll, 800);
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
  const button = 'studio-button';
  return <div className={`studio studio-layout layer-enter fixed inset-0 z-50 flex flex-col text-foreground ${fullscreen ? 'studio-reading-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-label="保留版式">
    <header className="studio-header">
      <div className="flex items-center gap-4"><span className="studio-mark"><Layers size={22} strokeWidth={1.5} /></span><div><p className="studio-eyebrow">DOCUMENT STUDIO</p><h1 className="text-xl font-semibold tracking-tight">保留版式 <span className="studio-byline">BabelDOC</span></h1></div></div>
      <button className={button} onClick={onClose}><ArrowLeft size={15} />返回阅读</button>
    </header>
    <details open={job?.state !== 'done'} className="studio-settings">
    <summary><span className="flex items-center gap-2"><span className="studio-status-dot" />翻译设置</span><span className="flex items-center gap-3 text-xs text-muted-foreground">文件 · 领域 · 识别<ChevronDown size={15} /></span></summary>
    <div className="studio-settings-body">
    <div className="studio-file-row">
      <input ref={input} type="file" accept=".pdf" className="hidden" onChange={e => {
        const selected = e.target.files?.[0];
        if (selected) { setFile(selected); setName(selected.name); setError(''); }
        e.target.value = '';
      }} />
      <button className={button} disabled={running} onClick={() => input.current?.click()}><Upload size={16} />选择 PDF</button>
      <button className={button} disabled={running || doc.fileType !== 'pdf'} onClick={useCurrent}>使用当前 PDF</button>
      <span className="studio-filename">{name || '选择一份 PDF，保留它原本的样子 · 最大 50 MB'}</span>
    </div>
    <div className="studio-config-grid">
      <label className="studio-field">引擎 <select className={button} value={engine} disabled={running} onChange={e => setEngine(e.target.value)}>
        <option value="bing">Bing（默认 · 免 Key）</option>
        <option value="google">Google（免 Key）</option>
        <option value="gemini-flash">Gemini Flash（需配置）</option>
        <option value="openai">OpenAI GPT（需配置）</option>
        <option value="claude">Claude（需配置）</option>
        <option value="deepseek">DeepSeek（需配置）</option>
        <option value="qwen">通义千问（需配置）</option>
      </select></label>
      <label className="studio-field">译为 <select className={button} value={target} disabled={running} onChange={e => setTarget(e.target.value as typeof target)}>
        {Object.entries({ 'zh-CN': '简体中文', 'zh-TW': '繁体中文', en: '英语', ja: '日语', ko: '韩语', fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', it: '意大利语', pt: '葡萄牙语', ar: '阿拉伯语' }).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
      </select></label>
      <EngineeringOptions domain={domain} onDomain={setDomain} glossary={glossary} onGlossary={setGlossary} disabled={running} />
      <label className="studio-field">速度 <select aria-label="翻译速度" disabled={running} value={speed} onChange={e => setSpeed(e.target.value)} className={button}><option value="stable">稳妥 · 串行翻译</option><option value="balanced">均衡 · 3 并发（推荐）</option><option value="fast">极速 · 5 并发</option></select></label>
      <label className="studio-field">OCR <select aria-label="OCR 精度" disabled={running} value={ocr} onChange={e => setOcr(e.target.value)} className={button}><option value="fast">快速 · 清晰扫描件</option><option value="balanced">均衡</option><option value="quality">精细 · 小字扫描件</option></select></label>
    </div>
    <div className="studio-settings-footer"><p>统一专业术语，让公式、图片与阅读节奏留在原位。</p><div className="flex items-center gap-2">{job?.state === 'running' && <button className={button} onClick={cancel}>取消任务</button>}<button className="studio-primary" disabled={!file || running} onClick={start}>{running ? '正在生成…' : '生成保留版式 PDF'}<ArrowUpRight size={16} /></button></div></div>
    </div>
    </details>
    {(error || job?.error) && <p role="alert" className="p-3 text-sm text-red-500 whitespace-pre-wrap">{error || job?.error}</p>}
    {job?.warning && <p role="status" className="px-4 py-2 text-sm text-amber-600 dark:text-amber-400">{job.warning}</p>}
    {job?.state === 'running' && <TranslationProgress {...job} stage={stageLabels[job.stage] || job.stage} />}
    {job?.state === 'done' ? <>
      <div className="studio-result-toolbar">
        <div className="studio-segments" role="group" aria-label="PDF 视图">{([['source', '原始 PDF', Layers], ['dual', '双语对照', Columns2], ['mono', '仅看译文', FileText]] as const).map(([value, label, Icon]) => <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>{view === value && <motion.span className="studio-tab-indicator" layoutId="layout-view-pill" transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }} />}<Icon size={15} /><span>{label}</span></button>)}</div>
        <div className="flex flex-wrap gap-2">
          {fullscreen && <button className={button} aria-pressed={readerTools} onClick={() => setReaderTools(value => !value)}><SlidersHorizontal size={15} />{readerTools ? '收起工具' : '阅读工具'}</button>}
          <button ref={fullscreenButton} className={button} aria-pressed={fullscreen} title="全屏阅读 · Esc 退出 · F11 切换" onClick={() => setFullscreen(value => !value)}>{fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}{fullscreen ? '退出全屏' : '全屏阅读'}{fullscreen && <kbd className="reader-escape-hint">Esc</kbd>}</button>
          <a className={`${button} studio-reader-download`} href={`/api/layout/jobs/${job.id}/mono.pdf?download=1`}><Download size={15} />下载译文 PDF</a>
          <a className={`${button} studio-reader-download`} href={`/api/layout/jobs/${job.id}/dual.pdf?download=1`}><Download size={15} />下载双语 PDF</a>
        </div>
      </div>
      <PdfPreview
        fullscreen={fullscreen}
        showControls={!fullscreen || readerTools}
        key={`${job.id}-${view}`}
        sourceUrl={`/api/layout/jobs/${job.id}/${view === 'dual' ? 'source' : view}.pdf`}
        targetUrl={view === 'dual' ? `/api/layout/jobs/${job.id}/mono.pdf` : undefined}
      />
    </> : <div className="studio-empty">
      <div className="studio-paper-art" aria-hidden="true"><div className="studio-paper-back" /><div className="studio-paper-front"><FileCheck2 size={28} strokeWidth={1.2} /><i /><i /><i /><div className="studio-paper-caption">Aa <span>文</span></div></div></div>
      <p className="studio-eyebrow">SAME LAYOUT. NEW LANGUAGE.</p>
      <h2>{running ? '让语言转换，让版式留下。' : '换一种语言，保留每一处细节。'}</h2>
      <p>图片、公式与段落，在熟悉的位置。<br />生成后，连续阅读、批注，或下载双语 PDF。</p>
      <details className="studio-help"><summary>关于扫描件与首次使用</summary><p>首次使用会准备模型、字体与本地 OCR，后续复用。扫描识别主要支持中英文印刷体；复杂表格和小字请检查结果。Bing / Google 无需密钥，Gemini 需配置。关闭面板后任务继续，关闭本地服务会中断。</p></details>
      {job?.state === 'cancelled' && <p>任务已取消，可以重新生成。</p>}
    </div>}

  </div>;
}
