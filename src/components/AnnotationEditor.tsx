import { InlineTextMarker } from './InlineTextMarker';
import { exportAnnotatedPdf } from '../services/exportAnnotatedPdf';
import { useStrokeEraser } from './useStrokeEraser';
import React, { useEffect, useRef, useState } from 'react';
import { TranslationDocument } from '../types';
import { loadPdf } from '../services/pdfFiles';
import { annotationPoint, emptyAnnotations, loadAnnotations, saveAnnotations, strokePath, PageAnnotations, Stroke } from '../services/annotations';

const button = 'studio-button';

function AnnotationPage({ doc, page, pdfUrl }: { doc: TranslationDocument; page: number; pdfUrl?: string }) {
  const key = `${doc.id}:${doc.fileType === 'pdf' ? 'pdf' : 'text'}:${page}`;
  const [data, setData] = useState<PageAnnotations>(emptyAnnotations);
  const current = useRef(data);
  const [loaded, setLoaded] = useState(false), [pageReady, setPageReady] = useState(doc.fileType !== 'pdf');
  const [status, setStatus] = useState('正在读取批注…'), [error, setError] = useState('');
  const [tool, setTool] = useState<'read' | 'pen' | 'note' | 'text' | 'erase'>('read');
  const [color, setColor] = useState('#ef4444'), [width, setWidth] = useState(3);
  const [activeNote, setActiveNote] = useState('');
  const noteFields = useRef(new Map<string, HTMLTextAreaElement>());
  useEffect(() => { noteFields.current.get(activeNote)?.focus({ preventScroll: true }); }, [activeNote]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const drawing = useRef<Stroke | null>(null), pointer = useRef<number | null>(null);
  const history = useRef<PageAnnotations[]>([]), future = useRef<PageAnnotations[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const alive = useRef(true), revision = useRef(0);
  const [pageHeight, setPageHeight] = useState(1200);

  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    void loadAnnotations(key).then(value => {
      if (cancelled) return;
      current.current = value; setData(value); setLoaded(true); setStatus('批注自动保存在本机');
    }).catch(() => { if (!cancelled) setStatus('无法读取批注，请检查浏览器存储权限后重新打开。'); });
    return () => { cancelled = true; alive.current = false; };
  }, [key]);

  useEffect(() => {
    if (doc.fileType !== 'pdf' || !pdfUrl) return;
    let cancelled = false, render: any;
    const task = window.pdfjsLib.getDocument({ url: pdfUrl });
    setPageReady(false); setError('');
    void (async () => {
      try {
        const pdf = await task.promise;
        const source = await pdf.getPage(page);
        if (cancelled || !canvas.current) return;
        const viewport = source.getViewport({ scale: 1.5 });
        canvas.current.width = viewport.width; canvas.current.height = viewport.height;
        setPageHeight(900 * viewport.height / viewport.width);
        render = source.render({ canvas: canvas.current, canvasContext: canvas.current.getContext('2d'), viewport });
        await render.promise;
        if (!cancelled) setPageReady(true);
      } catch (e: any) { if (!cancelled) setError(`PDF 加载失败：${e.message}`); }
    })();
    return () => { cancelled = true; render?.cancel(); void task.destroy(); };
  }, [pdfUrl, page, doc.fileType]);

  const persist = (next: PageAnnotations) => {
    current.current = next; setData(next); setStatus('正在保存…');
    const version = ++revision.current;
    void saveAnnotations(key, next).then(() => {
      if (alive.current && version === revision.current) setStatus('已保存到本机');
    }).catch(() => { if (alive.current && version === revision.current) setStatus('保存失败：请重试保存，并检查浏览器存储空间。'); });
  };
  const change = (next: PageAnnotations) => {
    history.current = [...history.current.slice(-49), current.current]; future.current = []; persist(next);
  };
  const undo = () => {
    const previous = history.current.pop();
    if (previous) { future.current.push(current.current); persist(previous); }
  };
  const redo = () => {
    const next = future.current.pop();
    if (next) { history.current.push(current.current); persist(next); }
  };
  const eraser = useStrokeEraser(current, change, persist);
  const point = (event: React.PointerEvent<SVGSVGElement>) => annotationPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
  const finish = (event: React.PointerEvent<SVGSVGElement>, cancel = false) => {
    eraser.finish(event); if (event.pointerId !== pointer.current) return;
    const stroke = drawing.current;
    drawing.current = null; pointer.current = null; setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (stroke && !cancel) change({ ...current.current, strokes: [...current.current.strokes, stroke] });
  };
  const usable = loaded && pageReady;
  const isPdf = doc.fileType === 'pdf';
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="studio-annotation-toolbar">
      {([['read', '阅读'], ['note', '添加备注'], ['text', '插入文字'], ['pen', '画笔'], ['erase', '橡皮擦']] as const).map(([value, label]) =>
        <button key={value} disabled={!usable} aria-pressed={tool === value} className="studio-tool" onClick={() => setTool(value)}>{label}</button>)}
      <label className="flex items-center gap-1 text-xs">颜色 <input aria-label="画笔颜色" type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-9" /></label>
      <label className="text-xs">粗细 <select aria-label="画笔粗细" className={button} value={width} onChange={e => setWidth(Number(e.target.value))}><option value={2}>细</option><option value={3}>中</option><option value={6}>粗</option></select></label>
      <button className={button} disabled={!usable || !history.current.length} onClick={undo}>撤销</button>
      <button className={button} disabled={!usable || !future.current.length} onClick={redo}>重做</button>
      <button className={button} disabled={!usable || !data.strokes.length} onClick={() => change({ ...current.current, strokes: [] })}>清除本页画笔</button>
      <span role="status" className="text-xs text-muted-foreground">{status}</span>
      {status.startsWith('保存失败') && <button className={button} onClick={() => persist(current.current)}>重试保存</button>}
    </div>
    <div className="px-3 py-2 text-xs text-muted-foreground">{tool === 'pen' ? '在原文上按住拖动画线；鼠标、触控笔和触摸均可使用。' : tool === 'note' || tool === 'text' ? '点击原文位置添加备注或文字，在备注区输入内容。' : tool === 'erase' ? '按住拖过笔迹即可擦除整条线；删错可以撤销。' : '点击编号可以编辑已有备注；文字文档支持选择文字。'} 批注保存在当前浏览器，不会修改源 PDF。</div>
    <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(160px,0.4fr)] lg:grid-cols-[1fr_280px] lg:grid-rows-1">
      <div className="overflow-auto bg-muted p-4" aria-label="原文批注页面">
        {error && <p role="alert" className="mb-3 text-red-500">{error}</p>}
        {isPdf && !pageReady && !error && <p className="mb-2 text-sm">正在加载原始 PDF…</p>}
        <div className="relative mx-auto bg-white text-black shadow-md" style={{ width: 900, containerType: 'inline-size', minHeight: isPdf ? undefined : 300 }}>
          {isPdf ? <canvas ref={canvas} style={{ display: 'block', width: 900, height: pageHeight }} aria-label={`原文第 ${page} 页`} /> :
            <div className="p-12 text-base leading-8" style={{ fontFamily: 'Arial, sans-serif' }}>{doc.segments.filter(s => (s.pageNumber || 1) === page).map(s => <p key={s.id} className="mb-5 whitespace-pre-wrap" style={{ fontWeight: s.type === 'title' || s.type === 'heading' ? 700 : 400 }}>{s.original}</p>)}</div>}
          <svg aria-label="画笔标注层" viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ pointerEvents: usable && tool !== 'read' ? 'auto' : 'none', touchAction: tool === 'read' ? 'auto' : 'none', cursor: tool === 'pen' ? 'crosshair' : tool === 'note' ? 'copy' : 'default' }}
            onPointerDown={event => {
              if (!usable || event.button !== 0 || pointer.current !== null) return;
              if (tool !== 'read') { event.preventDefault(); event.stopPropagation(); }
              if (tool === 'note' || tool === 'text') {
                const note = { id: crypto.randomUUID(), point: point(event), text: '', kind: tool === 'text' ? 'text' as const : 'note' as const, color, fontSize: 18 };
                change({ ...current.current, notes: [...current.current.notes, note] }); setActiveNote(note.id); setTool('read');
              } else if (tool === 'erase') { eraser.start(event);
              } else if (tool === 'pen') {
                const stroke = { id: crypto.randomUUID(), points: [point(event)], color, width };
                drawing.current = stroke; pointer.current = event.pointerId; setDraft(stroke); event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={event => {
              if (tool === 'erase') { eraser.move(event); return; }
              if (event.pointerId !== pointer.current || !drawing.current) return;
              const stroke = { ...drawing.current, points: [...drawing.current.points, point(event)] };
              drawing.current = stroke; setDraft(stroke);
            }}
            onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}>
            {[...data.strokes, ...(draft ? [draft] : [])].map(stroke => <path key={stroke.id} d={strokePath(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ pointerEvents: 'none' }} />)}
          </svg>
          {usable && data.notes.map((note, index) => note.kind === 'text' ? <InlineTextMarker key={note.id} note={note} label={`插入文字 ${index + 1}`} onClick={() => { setActiveNote(note.id); noteFields.current.get(note.id)?.focus(); }} /> : <button key={note.id} aria-label={`编辑备注 ${index + 1}`} title={note.text || '空备注'} onClick={() => setActiveNote(note.id)} className="absolute z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-xs font-bold text-black shadow" style={{ left: `${note.point.x / 10}%`, top: `${note.point.y / 10}%`, transform: 'translate(-50%, -50%)' }}>{index + 1}</button>)}
        </div>
      </div>
      <aside className="overflow-auto border-l border-border bg-card p-3" aria-label="本页备注">
        <h3 className="mb-3 font-semibold">本页备注 · {data.notes.length}</h3>
        {!data.notes.length && <p className="text-sm text-muted-foreground">选择「添加备注」或「插入文字」，再点击左侧页面的位置。</p>}
        {data.notes.map((note, index) => <div key={note.id} className={`mb-3 rounded-lg border p-2 ${activeNote === note.id ? 'border-blue-500' : 'border-border'}`}>
          <div className="mb-2 flex items-center justify-between text-sm"><button onClick={() => setActiveNote(note.id)}>备注 {index + 1}</button><button className="text-red-500" onClick={() => change({ ...current.current, notes: current.current.notes.filter(n => n.id !== note.id) })}>删除</button></div>
          <textarea ref={element => { if (element) noteFields.current.set(note.id, element); else noteFields.current.delete(note.id); }} aria-label={`备注 ${index + 1} 内容`} placeholder="输入你的备注…" className="min-h-24 w-full rounded border border-border bg-background p-2 text-sm text-foreground" value={note.text} maxLength={10000} onFocus={() => setActiveNote(note.id)} onChange={e => change({ ...current.current, notes: current.current.notes.map(n => n.id === note.id ? { ...n, text: e.target.value } : n) })} />
        </div>)}
      </aside>
    </div>
  </div>;
}

export function AnnotationEditor({ doc, onClose }: { doc: TranslationDocument; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1), [pdfUrl, setPdfUrl] = useState(doc.pdfBlobUrl || '');
  const [error, setError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const total = Math.max(1, doc.pageCount, ...doc.segments.map(s => s.pageNumber || 1));
  useEffect(() => {
    const previous = window.document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (doc.fileType !== 'pdf') return;
    if (doc.pdfBlobUrl) { setPdfUrl(doc.pdfBlobUrl); return; }
    let cancelled = false, url = '';
    void loadPdf(doc.id).then(file => {
      if (cancelled) return;
      if (!file) { setError('未保存原始 PDF，请重新导入原文件后批注。'); return; }
      url = URL.createObjectURL(file); setPdfUrl(url);
    }).catch(() => { if (!cancelled) setError('无法读取原始 PDF，请重新打开或重新导入。'); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [doc.id, doc.fileType, doc.pdfBlobUrl]);
  return <div ref={dialog} tabIndex={-1} className="studio layer-enter fixed inset-0 z-[100] flex flex-col bg-background text-foreground outline-none" role="dialog" aria-modal="true" aria-label="原文批注编辑器" onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') || []).filter(element => element.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (window.document.activeElement === first || window.document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <header className="flex flex-wrap items-center gap-3 border-b border-border p-3">
      <h2 className="mr-auto truncate font-semibold">原文批注 · {doc.fileName}</h2>
      <button className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span className="text-sm">第 {page} / {total} 页</span><button className={button} disabled={page >= total} onClick={() => setPage(page + 1)}>下一页</button>
            {doc.fileType === 'pdf' && <button className={button} disabled={!pdfUrl || exportStatus === '导出中…'} onClick={async () => { setExportStatus('导出中…'); try { await exportAnnotatedPdf(pdfUrl, total, page => `${doc.id}:pdf:${page}`); setExportStatus('已导出插字 PDF'); } catch (e: any) { setExportStatus(e.message); } }}>导出插字 PDF</button>}
      {exportStatus && <span role="status" className="text-xs">{exportStatus}</span>}
      <button className={button} onClick={onClose}>返回阅读</button>
    </header>
    {error ? <p role="alert" className="p-6 text-red-500">{error}</p> : <AnnotationPage key={`${doc.id}:${page}`} doc={doc} page={page} pdfUrl={pdfUrl} />}
  </div>;
}
