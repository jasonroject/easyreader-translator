import React from 'react';
import { Activity, ScanLine, Languages, Layers, Check } from 'lucide-react';
export function TranslationProgress({ stage, progress, current, total, startedAt }: { stage: string; progress: number; current?: number; total?: number; startedAt?: number }) {
  const percent = Math.max(0, Math.min(100, progress));
  const step = percent >= 90 ? 3 : percent >= 40 ? 2 : percent > 0 ? 1 : 0;
  return <div className="mx-4 my-3 rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-cyan-500/10 p-4 shadow-sm" role="status">
    <div className="mb-3 flex items-center gap-3"><div className="feature-orb"><Activity size={20} /></div><div className="flex-1"><p className="text-sm font-semibold">{stage}</p><p className="mt-1 text-xs text-muted-foreground">{total ? `${current ?? 0} / ${total} · ` : ''}{startedAt ? `已用时 ${Math.floor((Date.now() - startedAt) / 60000)} 分 ${Math.floor((Date.now() - startedAt) / 1000) % 60} 秒` : '正在准备'}</p></div><strong className="text-2xl tabular-nums text-blue-500">{Math.round(percent)}<span className="text-xs">%</span></strong></div>
    <div role="progressbar" aria-label="版式翻译进度" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted"><div className="progress-energy h-full rounded-full transition-[width] duration-700" style={{ width: `${percent}%` }} /></div>
    <div className="mt-3 grid grid-cols-4 gap-2">{[['准备 / OCR', ScanLine], ['版面解析', Layers], ['工程翻译', Languages], ['排版输出', Check]].map(([label, Icon], i) => { const Glyph = Icon as typeof Check; return <div key={String(label)} className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs ${i === step ? 'bg-blue-500/15 text-blue-500' : 'text-muted-foreground'}`}><Glyph size={14} />{String(label)}</div>; })}</div>
    <p className="mt-2 text-xs text-muted-foreground">进度来自实际处理事件；长文档可返回阅读，任务在后台继续。</p>
  </div>;
}
