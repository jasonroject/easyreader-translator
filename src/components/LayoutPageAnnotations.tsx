import { InlineTextMarker } from './InlineTextMarker';
import { useStrokeEraser } from './useStrokeEraser';
import React, { useEffect, useRef, useState } from 'react';
import { annotationPoint, emptyAnnotations, loadAnnotations, saveAnnotations, strokePath, PageAnnotations, Stroke } from '../services/annotations';

export type AnnotationTool = 'read' | 'note' | 'text' | 'pen' | 'erase';
export type LayoutAnnotationOptions = { editing: boolean; tool: AnnotationTool; color: string; width: number; onRead: () => void; onEdit: () => void };
const button = 'rounded border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-40';

export function LayoutPageAnnotations({ storageKey, page, ratio, ready, options, children }: {
  storageKey: string; page: number; ratio: number; ready: boolean; options: LayoutAnnotationOptions; children: React.ReactNode;
}) {
  const { editing, tool, color, width } = options;
  const [data, setData] = useState<PageAnnotations>(emptyAnnotations), [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('正在读取批注…'), [active, setActive] = useState('');
  const current = useRef(data), alive = useRef(true), revision = useRef(0);
  const history = useRef<PageAnnotations[]>([]), future = useRef<PageAnnotations[]>([]);
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const drawing = useRef<Stroke | null>(null), pointer = useRef<number | null>(null);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const usable = ready && loaded;
  const mode = editing ? tool : 'read';
  useEffect(() => {
    let stopped = false; alive.current = true;
    void loadAnnotations(storageKey).then(value => {
      if (stopped) return;
      current.current = value; setData(value); setLoaded(true); setStatus('批注保存在本机');
    }).catch(() => { if (!stopped) setStatus('无法读取批注，请检查浏览器存储权限后重新打开。'); });
    return () => { stopped = true; alive.current = false; };
  }, [storageKey]);
  useEffect(() => { if (editing) fields.current.get(active)?.focus(); }, [active, editing]);
  useEffect(() => { drawing.current = null; pointer.current = null; setDraft(null); }, [mode, ready]);
  const persist = (value: PageAnnotations) => {
    current.current = value; setData(value); setStatus('正在保存…');
    const version = ++revision.current;
    void saveAnnotations(storageKey, value).then(() => {
      if (alive.current && version === revision.current) setStatus('已保存到本机');
    }).catch(() => { if (alive.current && version === revision.current) setStatus('保存失败，请重试保存。'); });
  };
  const change = (value: PageAnnotations) => { history.current = [...history.current.slice(-49), current.current]; future.current = []; persist(value); };
  const eraser = useStrokeEraser(current, change, persist);
  const point = (event: React.PointerEvent<SVGSVGElement>) => annotationPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
  const finish = (event: React.PointerEvent<SVGSVGElement>, cancelled = false) => {
    eraser.finish(event); if (event.pointerId !== pointer.current) return;
    const stroke = drawing.current; drawing.current = null; pointer.current = null; setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (stroke && !cancelled) change({ ...current.current, strokes: [...current.current.strokes, stroke] });
  };
  return <>
    <div style={{ aspectRatio: ratio, containerType: 'inline-size' }} className="relative bg-white shadow-lg">
      {children}
      <svg aria-label={`第 ${page} 页批注画布`} viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ pointerEvents: usable && mode !== 'read' ? 'auto' : 'none', touchAction: mode === 'read' ? 'auto' : 'none', cursor: mode === 'pen' ? 'crosshair' : mode === 'note' ? 'copy' : 'default' }}
        onPointerDown={event => {
          if (!usable || event.button !== 0 || pointer.current !== null || mode === 'read') return;
          event.preventDefault(); event.stopPropagation();
          if (mode === 'note' || mode === 'text') {
            const note = { id: crypto.randomUUID(), point: point(event), text: '', kind: mode === 'text' ? 'text' as const : 'note' as const, color, fontSize: 18 };
            change({ ...current.current, notes: [...current.current.notes, note] }); setActive(note.id); options.onRead();
          } else if (mode === 'erase') { eraser.start(event);
          } else if (mode === 'pen') {
            const stroke = { id: crypto.randomUUID(), points: [point(event)], color, width };
            drawing.current = stroke; pointer.current = event.pointerId; setDraft(stroke); event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={event => {
          if (mode === 'erase') { eraser.move(event); return; }
          if (event.pointerId !== pointer.current || !drawing.current) return;
          const stroke = { ...drawing.current, points: [...drawing.current.points, point(event)] };
          drawing.current = stroke; setDraft(stroke);
        }}
        onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}>
        {[...data.strokes, ...(draft ? [draft] : [])].map(stroke => <path key={stroke.id} d={strokePath(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />)}
      </svg>
      {data.notes.map((note, index) => note.kind === 'text' ? <InlineTextMarker key={note.id} note={note} label={`第 ${page} 页插入文字 ${index + 1}`} onClick={() => { setActive(note.id); options.onEdit(); if (editing) fields.current.get(note.id)?.focus(); }} /> : <button key={note.id} aria-label={`第 ${page} 页备注 ${index + 1}`} title={note.text || '点击编辑备注'} onClick={() => { setActive(note.id); options.onEdit(); if (editing) fields.current.get(note.id)?.focus(); }} className="absolute z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-xs font-bold text-black shadow" style={{ left: `${note.point.x / 10}%`, top: `${note.point.y / 10}%`, transform: 'translate(-50%, -50%)' }}>{index + 1}</button>)}
    </div>
    {editing && <aside aria-label={`第 ${page} 页备注区`} className="mt-2 rounded border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm">第 {page} 页 · {data.notes.length} 条备注</strong>
        <button className={button} disabled={!loaded || !history.current.length} onClick={() => { const value = history.current.pop(); if (value) { future.current.push(current.current); persist(value); } }}>撤销</button>
        <button className={button} disabled={!loaded || !future.current.length} onClick={() => { const value = future.current.pop(); if (value) { history.current.push(current.current); persist(value); } }}>重做</button>
        <button className={button} disabled={!loaded || !data.strokes.length} onClick={() => change({ ...current.current, strokes: [] })}>清除本页画笔</button>
        <span role="status" className="text-xs text-muted-foreground">{status}</span>
        {status.startsWith('保存失败') && <button className={button} onClick={() => persist(current.current)}>重试保存</button>}
      </div>
      {data.notes.map((note, index) => <div key={note.id} className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs"><label htmlFor={note.id}>备注 {index + 1}</label><button className={button} onClick={() => change({ ...current.current, notes: current.current.notes.filter(item => item.id !== note.id) })}>删除备注 {index + 1}</button></div>
        <textarea id={note.id} aria-label={`第 ${page} 页备注 ${index + 1} 内容`} ref={element => { if (element) fields.current.set(note.id, element); else fields.current.delete(note.id); }} value={note.text} maxLength={10000} placeholder="输入备注…" className={`min-h-20 w-full rounded border bg-background p-2 text-sm text-foreground ${active === note.id ? 'border-blue-500' : 'border-border'}`} onFocus={() => setActive(note.id)} onChange={event => change({ ...current.current, notes: current.current.notes.map(item => item.id === note.id ? { ...item, text: event.target.value } : item) })} />
      </div>)}
    </aside>}
  </>;
}
