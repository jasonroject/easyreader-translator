import { exportAnnotatedPdf } from '../services/exportAnnotatedPdf';
import { Pencil, Type, MessageSquare, Eraser, MousePointer2, Link, Unlink } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { LayoutPageAnnotations, LayoutAnnotationOptions, AnnotationTool } from './LayoutPageAnnotations';

function PdfPage({ pdf, number, root, initialRatio, url, annotations, side }: { pdf: PDFDocumentProxy; number: number; root: HTMLDivElement; initialRatio: number; url: string; annotations: LayoutAnnotationOptions; side?: 'source' | 'target' }) {
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
      <LayoutPageAnnotations
        storageKey={side ? `layout:${url}:${side}:page:${number}` : `layout:${url}:page:${number}`}
        page={number}
        ratio={ratio}
        ready={nearby && ready}
        options={annotations}
      >
      {nearby && <canvas ref={canvas} aria-label={side === 'source' ? `原文 PDF 第 ${number} 页` : side === 'target' ? `译文 PDF 第 ${number} 页` : `保留版式 PDF 第 ${number} 页`} className="block h-full w-full" />}
      {nearby && !ready && !error && <p className="absolute left-4 top-4 text-sm text-gray-600">正在加载第 {number} 页…</p>}
      {error && <p role="alert" className="absolute left-4 top-4 text-sm text-red-600">第 {number} 页预览失败：{error}。可以下载 PDF 查看。</p>}
      </LayoutPageAnnotations>
    </div>
  </section>;
}

export function ContinuousPdfPreview({ sourceUrl, targetUrl, fullscreen = false, showControls = true }: { sourceUrl: string; targetUrl?: string; fullscreen?: boolean; showControls?: boolean }) {
  const [sourcePdf, setSourcePdf] = useState<PDFDocumentProxy | null>(null);
  const [targetPdf, setTargetPdf] = useState<PDFDocumentProxy | null>(null);
  const [sourceRoot, setSourceRoot] = useState<HTMLDivElement | null>(null);
  const [targetRoot, setTargetRoot] = useState<HTMLDivElement | null>(null);

  // Keep the same page and position when the surrounding chrome changes size.
  const readingAnchors = useRef<{ source?: { page: string; fraction: number }; target?: { page: string; fraction: number } }>({});
  useEffect(() => {
    const cleanups = ([['source', sourceRoot], ['target', targetRoot]] as const).map(([side, root]) => {
      if (!root) return () => {};
      const remember = () => {
        const top = root.getBoundingClientRect().top;
        const page = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page]')).find(node => node.getBoundingClientRect().bottom > top);
        if (page) { const box = page.getBoundingClientRect(); readingAnchors.current[side] = { page: page.dataset.pdfPage!, fraction: Math.max(0, (top - box.top) / Math.max(1, box.height)) }; }
      };
      root.addEventListener('scroll', remember, { passive: true });
      return () => root.removeEventListener('scroll', remember);
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [sourceRoot, targetRoot]);
  useLayoutEffect(() => {
    for (const [side, root] of [['source', sourceRoot], ['target', targetRoot]] as const) {
      const anchor = readingAnchors.current[side];
      const page = root?.querySelector<HTMLElement>(`[data-pdf-page="${anchor?.page}"]`);
      if (root && page && anchor) { const box = page.getBoundingClientRect(); root.scrollTop += box.top - root.getBoundingClientRect().top + anchor.fraction * box.height; }
    }
  }, [fullscreen, showControls, sourceRoot, targetRoot]);
  const [sourceZoom, setSourceZoom] = useState(100);
  const [targetZoom, setTargetZoom] = useState(100);
  const [syncScroll, setSyncScroll] = useState(true);
  const [syncZoom, setSyncZoom] = useState(true);

  const [jump, setJump] = useState('1');
  const [ratio, setRatio] = useState(0.707), [error, setError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [editing, setEditing] = useState(false), [tool, setTool] = useState<AnnotationTool>('read');
  const [color, setColor] = useState('#ef4444'), [width, setWidth] = useState(3);
  const annotations: LayoutAnnotationOptions = { editing, tool, color, width, onRead: () => setTool('read'), onEdit: () => { setEditing(true); setTool('read'); } };

  useEffect(() => { if (!showControls) { setEditing(false); setTool('read'); } }, [showControls]);
  const changeZoom = (delta: number) => {
    setSourceZoom(value => Math.max(50, Math.min(300, value + delta)));
    if (syncZoom) setTargetZoom(value => Math.max(50, Math.min(300, value + delta)));
  };
  const zoomControls = <span className="reader-zoom-controls"><button aria-label="缩小 PDF" disabled={sourceZoom <= 50} onClick={() => changeZoom(-10)}>−</button><button aria-label="恢复适宽" onClick={() => { setSourceZoom(100); setTargetZoom(100); }}>适宽 {sourceZoom}%</button><button aria-label="放大 PDF" disabled={sourceZoom >= 300} onClick={() => changeZoom(10)}>＋</button></span>;
  const isScrollingSyncRef = useRef(false);

  // 加载原文 PDF
  useEffect(() => {
    let stopped = false;
    const task = window.pdfjsLib.getDocument({ url: sourceUrl });
    setSourcePdf(null); setError(''); setJump('1');
    void (async () => {
      try {
        const document = await task.promise;
        const first = await document.getPage(1);
        if (stopped) return;
        const view = first.getViewport({ scale: 1 });
        setRatio(view.width / view.height); setSourcePdf(document);
      } catch (e: any) { if (!stopped) setError(e.message || 'PDF 加载失败'); }
    })();
    return () => { stopped = true; void task.destroy(); };
  }, [sourceUrl]);

  // 加载译文 PDF
  useEffect(() => {
    if (!targetUrl) return;
    let stopped = false;
    const task = window.pdfjsLib.getDocument({ url: targetUrl });
    setTargetPdf(null);
    void (async () => {
      try {
        const document = await task.promise;
        if (stopped) return;
        setTargetPdf(document);
      } catch (e: any) {
        if (!stopped) console.warn('译文 PDF 加载失败:', e.message);
      }
    })();
    return () => { stopped = true; void task.destroy(); };
  }, [targetUrl]);
  // 滚动同步处理
  const handleScroll = useCallback((source: 'source' | 'target') => {
    if (!syncScroll || !sourceRoot || !targetRoot) return;
    if (isScrollingSyncRef.current) return;

    const sourceEl = source === 'source' ? sourceRoot : targetRoot;
    const targetEl = source === 'source' ? targetRoot : sourceRoot;

    const scrollRatio = sourceEl.scrollTop / Math.max(1, sourceEl.scrollHeight - sourceEl.clientHeight);

    isScrollingSyncRef.current = true;
    targetEl.scrollTop = scrollRatio * (targetEl.scrollHeight - targetEl.clientHeight);

    setTimeout(() => { isScrollingSyncRef.current = false; }, 50);
  }, [syncScroll, sourceRoot, targetRoot]);

  useEffect(() => {
    if (!sourceRoot || !targetUrl) return;
    const handler = () => handleScroll('source');
    sourceRoot.addEventListener('scroll', handler, { passive: true });
    return () => sourceRoot.removeEventListener('scroll', handler);
  }, [sourceRoot, targetUrl, handleScroll]);

  useEffect(() => {
    if (!targetRoot || !targetUrl) return;
    const handler = () => handleScroll('target');
    targetRoot.addEventListener('scroll', handler, { passive: true });
    return () => targetRoot.removeEventListener('scroll', handler);
  }, [targetRoot, targetUrl, handleScroll]);

  // Ctrl+滚轮缩放处理
  const handleWheel = useCallback((e: WheelEvent, side: 'source' | 'target') => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? -10 : 10;

    if (side === 'source') {
      setSourceZoom(prev => Math.max(50, Math.min(300, prev + delta)));
      if (syncZoom) setTargetZoom(prev => Math.max(50, Math.min(300, prev + delta)));
    } else {
      setTargetZoom(prev => Math.max(50, Math.min(300, prev + delta)));
      if (syncZoom) setSourceZoom(prev => Math.max(50, Math.min(300, prev + delta)));
    }
  }, [syncZoom]);

  useEffect(() => {
    if (!sourceRoot) return;
    const handler = (e: WheelEvent) => handleWheel(e, 'source');
    sourceRoot.addEventListener('wheel', handler, { passive: false });
    return () => sourceRoot.removeEventListener('wheel', handler);
  }, [sourceRoot, handleWheel]);

  useEffect(() => {
    if (!targetRoot) return;
    const handler = (e: WheelEvent) => handleWheel(e, 'target');
    targetRoot.addEventListener('wheel', handler, { passive: false });
    return () => targetRoot.removeEventListener('wheel', handler);
  }, [targetRoot, handleWheel]);

  const go = (side: 'source' | 'target') => {
    const pdf = side === 'source' ? sourcePdf : targetPdf;
    const root = side === 'source' ? sourceRoot : targetRoot;
    if (!pdf || !root) return;
    const page = Math.max(1, Math.min(pdf.numPages, Number.parseInt(jump, 10) || 1));
    setJump(String(page));
    root.querySelector(`[data-pdf-page="${page}"]`)?.scrollIntoView({ block: 'start' });
  };
  // 双栏模式
  if (targetUrl && targetPdf) {
    return <div className={`studio-preview layer-enter flex min-h-0 flex-1 flex-col ${fullscreen ? 'reader-immersive' : ''}`} data-controls={showControls}>
      <div className="studio-preview-toolbar">
        <span>双栏对照{sourcePdf ? ` · 共 ${sourcePdf.numPages} 页` : ''}</span>
        <label>跳至 <input aria-label="跳转页码" type="number" min={1} max={sourcePdf?.numPages || 1} value={jump} onChange={e => setJump(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { go('source'); go('target'); } }} className="w-16 rounded border border-border bg-card px-2 py-1" /> 页</label>
        <button disabled={!sourcePdf} onClick={() => { go('source'); go('target'); }} className="disabled:opacity-40">跳转</button>
        <label><input type="checkbox" checked={syncScroll} onChange={e => setSyncScroll(e.target.checked)} /> 同步滚动</label>
        <label><input type="checkbox" checked={syncZoom} onChange={e => setSyncZoom(e.target.checked)} /> 同步缩放</label>
        {zoomControls}
        <button aria-pressed={editing} disabled={!sourcePdf} className="studio-button" onClick={() => { setEditing(!editing); setTool('read'); }}>{editing ? '收起批注工具' : '备注 / 画笔'}</button>
      </div>
      {editing && <div className="studio-annotation-toolbar layer-enter">
        {([['read', '阅读'], ['note', '添加备注'], ['text', '插入文字'], ['pen', '画笔'], ['erase', '橡皮擦']] as const).map(([value, label]) => <button key={value} aria-pressed={tool === value} className="studio-tool" onClick={() => setTool(value)}><span className="inline-flex items-center gap-1">{value === 'pen' ? <Pencil size={14} /> : value === 'text' ? <Type size={14} /> : value === 'note' ? <MessageSquare size={14} /> : value === 'erase' ? <Eraser size={14} /> : <MousePointer2 size={14} />}{label}</span></button>)}
        <label>颜色 <input aria-label="版式画笔颜色" type="color" value={color} onChange={event => setColor(event.target.value)} className="h-7 w-8 align-middle" /></label>
        <label>粗细 <select aria-label="版式画笔粗细" className="rounded border border-border bg-card px-2 py-1" value={width} onChange={event => setWidth(Number(event.target.value))}><option value={2}>细</option><option value={3}>中</option><option value={6}>粗</option></select></label>
        <button className="studio-button ml-auto" disabled={!sourcePdf || exportStatus === '导出中…'} onClick={async () => { if (!sourcePdf) return; setExportStatus('导出中…'); try { await exportAnnotatedPdf(sourceUrl, sourcePdf.numPages, page => `layout:${sourceUrl}:source:page:${page}`); setExportStatus('已导出原文批注 PDF。'); } catch (e: any) { setExportStatus(e.message); } }}>导出原文批注</button>
        <button className="studio-button" disabled={!targetPdf || exportStatus === '导出中…'} onClick={async () => { if (!targetPdf) return; setExportStatus('导出中…'); try { await exportAnnotatedPdf(targetUrl, targetPdf.numPages, page => `layout:${targetUrl}:target:page:${page}`); setExportStatus('已导出译文批注 PDF。'); } catch (e: any) { setExportStatus(e.message); } }}>导出译文批注</button>
        <span className="studio-tool-hint">点击添加备注或文字 · 拖动画线与擦除 · 自动保存到本机</span>{exportStatus && <span role="status" className="studio-tool-hint">{exportStatus}</span>}
      </div>}

      <div className="reader-panes flex min-h-0 flex-1 gap-2">
        <div ref={setSourceRoot} role="region" aria-label="原文 PDF 阅读区" tabIndex={0} className="reader-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-muted p-4">
          {!sourcePdf && !error && <p role="status">正在加载原文 PDF…</p>}
          {error && <p role="alert">原文预览失败：{error}。可以下载 PDF 查看。</p>}
          <div style={{ width: `${sourceZoom}%` }} className="mx-auto">
            {sourcePdf && sourceRoot && Array.from({ length: sourcePdf.numPages }, (_, index) => <PdfPage key={`source-${index}`} pdf={sourcePdf} number={index + 1} root={sourceRoot} initialRatio={ratio} url={sourceUrl} annotations={annotations} side="source" />)}
          </div>
        </div>

        <div ref={setTargetRoot} role="region" aria-label="译文 PDF 阅读区" tabIndex={0} className="reader-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-muted p-4">
          {!targetPdf && <p role="status">正在加载译文 PDF…</p>}
          <div style={{ width: `${targetZoom}%` }} className="mx-auto">
            {targetPdf && targetRoot && Array.from({ length: targetPdf.numPages }, (_, index) => <PdfPage key={`target-${index}`} pdf={targetPdf} number={index + 1} root={targetRoot} initialRatio={ratio} url={targetUrl} annotations={annotations} side="target" />)}
          </div>
        </div>
      </div>
    </div>;
  }

  // 单栏模式
  return <div className={`studio-preview layer-enter flex min-h-0 flex-1 flex-col ${fullscreen ? 'reader-immersive' : ''}`} data-controls={showControls}>
    <div className="studio-preview-toolbar">
      <span>连续滚动{sourcePdf ? ` · 共 ${sourcePdf.numPages} 页` : ''}</span>
      <label>跳至 <input aria-label="跳转页码" type="number" min={1} max={sourcePdf?.numPages || 1} value={jump} onChange={e => setJump(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go('source'); }} className="w-16 rounded border border-border bg-card px-2 py-1" /> 页</label>
      <button disabled={!sourcePdf} onClick={() => go('source')} className="disabled:opacity-40">跳转</button>
      {zoomControls}
      <button aria-pressed={editing} disabled={!sourcePdf} className="studio-button" onClick={() => { setEditing(!editing); setTool('read'); }}>{editing ? '收起批注工具' : '备注 / 画笔'}</button>
    </div>
    {editing && <div className="studio-annotation-toolbar layer-enter">
      {([['read', '阅读'], ['note', '添加备注'], ['text', '插入文字'], ['pen', '画笔'], ['erase', '橡皮擦']] as const).map(([value, label]) => <button key={value} aria-pressed={tool === value} className="studio-tool" onClick={() => setTool(value)}><span className="inline-flex items-center gap-1">{value === 'pen' ? <Pencil size={14} /> : value === 'text' ? <Type size={14} /> : value === 'note' ? <MessageSquare size={14} /> : value === 'erase' ? <Eraser size={14} /> : <MousePointer2 size={14} />}{label}</span></button>)}
      <label>颜色 <input aria-label="版式画笔颜色" type="color" value={color} onChange={event => setColor(event.target.value)} className="h-7 w-8 align-middle" /></label>
      <label>粗细 <select aria-label="版式画笔粗细" className="rounded border border-border bg-card px-2 py-1" value={width} onChange={event => setWidth(Number(event.target.value))}><option value={2}>细</option><option value={3}>中</option><option value={6}>粗</option></select></label>
      <button className="studio-button ml-auto" disabled={!sourcePdf || exportStatus === '导出中…'} onClick={async () => { if (!sourcePdf) return; setExportStatus('导出中…'); try { await exportAnnotatedPdf(sourceUrl, sourcePdf.numPages, page => `layout:${sourceUrl}:page:${page}`); setExportStatus('已导出，文字写入了新的 PDF 副本。'); } catch (e: any) { setExportStatus(e.message); } }}>导出插字 PDF</button>
      <span className="studio-tool-hint">点击添加备注或文字 · 拖动画线与擦除 · 自动保存到本机 · 导出仅包含插入文字</span>{exportStatus && <span role="status" className="studio-tool-hint">{exportStatus}</span>}
    </div>}

    <div ref={setSourceRoot} role="region" aria-label="连续 PDF 阅读区" tabIndex={0} className="reader-scroll min-h-0 min-w-0 flex-1 overflow-auto bg-muted p-4">
      {!sourcePdf && !error && <p role="status">正在加载 PDF…</p>}
      {error && <p role="alert">预览失败：{error}。可以下载 PDF 查看。</p>}
      <div style={{ width: `${sourceZoom}%`, maxWidth: fullscreen ? `${960 * sourceZoom / 100}px` : undefined }} className="mx-auto">
        {sourcePdf && sourceRoot && Array.from({ length: sourcePdf.numPages }, (_, index) => <PdfPage key={`${sourceUrl}-${index}`} pdf={sourcePdf} number={index + 1} root={sourceRoot} initialRatio={ratio} url={sourceUrl} annotations={annotations} />)}
      </div>
    </div>
  </div>;
}
