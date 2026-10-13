import { exportAnnotatedPdf } from '../services/exportAnnotatedPdf';
import { Pencil, Type, MessageSquare, Eraser, MousePointer2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { LayoutPageAnnotations, LayoutAnnotationOptions, AnnotationTool } from './LayoutPageAnnotations';

function PdfPage({ pdf, number, root, initialRatio, url, annotations }: { pdf: PDFDocumentProxy; number: number; root: HTMLDivElement; initialRatio: number; url: string; annotations: LayoutAnnotationOptions }) {
  const frame = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [nearby, setNearby] = useState(false), [ready, setReady] = useState(false);
  const [ratio, setRatio] = useState(initialRatio), [error, setError] = useState('');
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { root, rootMargin: '800px 0px' });
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, [root]);
  useEffect(() => {
    if (!nearby) return;
    let stopped = false;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    setReady(false); setError('');
    void (async () => {
      try {
        const page = await pdf.getPage(number);
        if (stopped || !canvas.current) return;
        const base = page.getViewport({ scale: 1 });
        setRatio(base.width / base.height);
        const view = page.getViewport({ scale: Math.min(1.8, Math.sqrt(8_000_000 / (base.width * base.height))) });
        canvas.current.width = Math.ceil(view.width); canvas.current.height = Math.ceil(view.height);
        render = page.render({ canvas: canvas.current, viewport: view });
        await render.promise;
        if (!stopped) setReady(true);
      } catch (e: any) { if (!stopped) setError(e.message || '页面渲染失败'); }
    })();
    return () => { stopped = true; render?.cancel(); };
  }, [pdf, number, nearby]);
  return <section aria-label={`PDF 第 ${number} 页`} data-pdf-page={number} className="mb-6">
    <p className="mb-2 text-center text-xs text-muted-foreground">第 {number} 页</p>
    <div ref={frame}>
      <LayoutPageAnnotations storageKey={`layout:${url}:page:${number}`} page={number} ratio={ratio} ready={nearby && ready} options={annotations}>
      {nearby && <canvas ref={canvas} aria-label={`保留版式 PDF 第 ${number} 页`} className="block h-full w-full" />}
      {nearby && !ready && !error && <p className="absolute left-4 top-4 text-sm text-gray-600">正在加载第 {number} 页…</p>}
      {error && <p role="alert" className="absolute left-4 top-4 text-sm text-red-600">第 {number} 页预览失败：{error}。可以下载 PDF 查看。</p>}
      </LayoutPageAnnotations>
    </div>
  </section>;
}

export function ContinuousPdfPreview({ url }: { url: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(100), [jump, setJump] = useState('1');
  const [ratio, setRatio] = useState(0.707), [error, setError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [editing, setEditing] = useState(false), [tool, setTool] = useState<AnnotationTool>('read');
  const [color, setColor] = useState('#ef4444'), [width, setWidth] = useState(3);
  const annotations: LayoutAnnotationOptions = { editing, tool, color, width, onRead: () => setTool('read'), onEdit: () => { setEditing(true); setTool('read'); } };
  useEffect(() => {
    let stopped = false;
    const task = window.pdfjsLib.getDocument({ url });
    setPdf(null); setError(''); setJump('1');
    void (async () => {
      try {
        const document = await task.promise;
        const first = await document.getPage(1);
        if (stopped) return;
        const view = first.getViewport({ scale: 1 });
        setRatio(view.width / view.height); setPdf(document);
      } catch (e: any) { if (!stopped) setError(e.message || 'PDF 加载失败'); }
    })();
    return () => { stopped = true; void task.destroy(); };
  }, [url]);
  const go = () => {
    if (!pdf || !root) return;
    const page = Math.max(1, Math.min(pdf.numPages, Number.parseInt(jump, 10) || 1));
    setJump(String(page));
    root.querySelector(`[data-pdf-page="${page}"]`)?.scrollIntoView({ block: 'start' });
  };
  return <div className="layer-enter flex min-h-0 flex-1 flex-col">
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-border p-2 text-sm">
      <span>连续滚动{pdf ? ` · 共 ${pdf.numPages} 页` : ''}</span>
      <label>跳至 <input aria-label="跳转页码" type="number" min={1} max={pdf?.numPages || 1} value={jump} onChange={e => setJump(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go(); }} className="w-16 rounded border border-border bg-card px-2 py-1" /> 页</label>
      <button disabled={!pdf} onClick={go} className="disabled:opacity-40">跳转</button>
      <button disabled={zoom <= 50} onClick={() => setZoom(zoom - 25)} className="disabled:opacity-40">缩小</button>
      <span>{zoom}%</span>
      <button disabled={zoom >= 200} onClick={() => setZoom(zoom + 25)} className="disabled:opacity-40">放大</button>
      <button aria-pressed={editing} disabled={!pdf} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-40" onClick={() => { setEditing(!editing); setTool('read'); }}>{editing ? '收起批注工具' : '备注 / 画笔'}</button>
    </div>
    {editing && <div className="flex flex-wrap items-center gap-2 border-b border-border p-2 text-sm">
      {([['read', '阅读'], ['note', '添加备注'], ['text', '插入文字'], ['pen', '画笔'], ['erase', '橡皮擦']] as const).map(([value, label]) => <button key={value} aria-pressed={tool === value} className={`rounded border border-border px-3 py-1 ${tool === value ? 'bg-blue-600 text-white' : 'bg-card'}`} onClick={() => setTool(value)}><span className="inline-flex items-center gap-1">{value === 'pen' ? <Pencil size={14} /> : value === 'text' ? <Type size={14} /> : value === 'note' ? <MessageSquare size={14} /> : value === 'erase' ? <Eraser size={14} /> : <MousePointer2 size={14} />}{label}</span></button>)}
      <label>颜色 <input aria-label="版式画笔颜色" type="color" value={color} onChange={event => setColor(event.target.value)} className="h-7 w-8 align-middle" /></label>
      <label>粗细 <select aria-label="版式画笔粗细" className="rounded border border-border bg-card px-2 py-1" value={width} onChange={event => setWidth(Number(event.target.value))}><option value={2}>细</option><option value={3}>中</option><option value={6}>粗</option></select></label>
      <span className="text-xs text-muted-foreground">点击页面添加备注，拖动画线；橡皮擦按住拖过笔迹会擦除整条线，可在每页下方撤销。自动保存；“插入文字”可用“导出插字 PDF”写入副本，普通备注和画笔仅在本机显示。</span>
    </div>}
    {editing && <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs"><button className="surface-button rounded-lg bg-blue-600 px-3 py-2 text-white" disabled={!pdf || exportStatus === '导出中…'} onClick={async () => { if (!pdf) return; setExportStatus('导出中…'); try { await exportAnnotatedPdf(url, pdf.numPages, page => `layout:${url}:page:${page}`); setExportStatus('已导出，文字写入了新的 PDF 副本。'); } catch (e: any) { setExportStatus(e.message); } }}>导出插字 PDF</button><span role="status">{exportStatus}</span></div>}
    <div ref={setRoot} role="region" aria-label="连续 PDF 阅读区" tabIndex={0} className="min-h-0 flex-1 overflow-auto bg-muted p-4">
      {!pdf && !error && <p role="status">正在加载 PDF…</p>}
      {error && <p role="alert">预览失败：{error}。可以下载 PDF 查看。</p>}
      <div style={{ width: `${zoom}%` }} className="mx-auto">
        {pdf && root && Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={`${url}-${index}`} pdf={pdf} number={index + 1} root={root} initialRatio={ratio} url={url} annotations={annotations} />)}
      </div>
    </div>
  </div>;
}
