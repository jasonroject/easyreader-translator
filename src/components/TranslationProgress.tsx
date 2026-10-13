import React from 'react';
import { ScanLine, Languages, Layers, Check, LoaderCircle } from 'lucide-react';
export function TranslationProgress({ stage, progress, current, total, startedAt }: { stage: string; progress: number; current?: number; total?: number; startedAt?: number }) {
  const percent = Math.max(0, Math.min(100, progress));
  const step = percent >= 90 ? 3 : percent >= 40 ? 2 : percent > 0 ? 1 : 0;
  return <div className="studio-progress" role="status">
    <div className="flex items-center gap-4"><span className="studio-progress-icon"><LoaderCircle size={21} strokeWidth={1.5} /></span><div className="flex-1"><p className="text-sm font-medium">{stage}</p><p className="mt-1 text-xs text-muted-foreground">{total ? `${current ?? 0} / ${total} · ` : ''}{startedAt ? `已用时 ${Math.floor((Date.now() - startedAt) / 60000)} 分 ${Math.floor((Date.now() - startedAt) / 1000) % 60} 秒` : '正在准备'}</p></div><strong className="studio-progress-number">{Math.round(percent)}<span>%</span></strong></div>
    <div role="progressbar" aria-label="版式翻译进度" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className="studio-progress-track"><div style={{ width: `${percent}%` }} /></div>
    <div className="studio-progress-steps">{[['准备 / OCR', ScanLine], ['版面解析', Layers], ['工程翻译', Languages], ['排版输出', Check]].map(([label, Icon], i) => { const Glyph = i < step ? Check : Icon as typeof Check; return <div key={String(label)} data-state={i === step ? 'active' : i < step ? 'complete' : 'pending'}><span><Glyph size={14} strokeWidth={1.6} /></span>{String(label)}</div>; })}</div>
    <p className="mt-5 text-xs text-muted-foreground">可以返回阅读，我们会在后台继续处理。</p>
  </div>;
}
