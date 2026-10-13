import React, { useEffect, useState } from 'react';
import { ScanLine, Languages, Layers, Check, LoaderCircle, Clock } from 'lucide-react';
export function TranslationProgress({ stage, progress, current, total, startedAt }: { stage: string; progress: number; current?: number; total?: number; startedAt?: number }) {
  const percent = Math.max(0, Math.min(100, progress));
  const step = percent >= 90 ? 3 : percent >= 40 ? 2 : percent > 0 ? 1 : 0;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const elapsedMinutes = Math.floor(elapsed / 60000);
  const elapsedSeconds = Math.floor((elapsed / 1000) % 60);

  const estimatedTotal = percent > 5 ? (elapsed / percent) * 100 : 0;
  const remainingMs = Math.max(0, estimatedTotal - elapsed);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs / 1000) % 60);

  return <div className="studio-progress" role="status">
    <div className="flex items-center gap-4"><span className="studio-progress-icon"><LoaderCircle size={21} strokeWidth={1.5} /></span><div className="flex-1"><p className="text-sm font-medium">{stage}</p><div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
      {total && <span className="font-medium">{current ?? 0} / {total}</span>}
      {startedAt && <span>已用时 {elapsedMinutes} 分 {elapsedSeconds} 秒</span>}
      {percent > 5 && remainingMs > 1000 && <span className="flex items-center gap-1"><Clock size={12} />预计剩余 {remainingMinutes > 0 ? `${remainingMinutes} 分 ` : ''}{remainingSeconds} 秒</span>}
    </div></div><strong className="studio-progress-number">{Math.round(percent)}<span>%</span></strong></div>
    <div role="progressbar" aria-label="版式翻译进度" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className="studio-progress-track"><div style={{ width: `${percent}%` }} /></div>
    <div className="studio-progress-steps">{[['准备 / OCR', ScanLine], ['版面解析', Layers], ['工程翻译', Languages], ['排版输出', Check]].map(([label, Icon], i) => { const Glyph = i < step ? Check : Icon as typeof Check; return <div key={String(label)} data-state={i === step ? 'active' : i < step ? 'complete' : 'pending'}><span><Glyph size={14} strokeWidth={1.6} /></span>{String(label)}</div>; })}</div>
    <p className="mt-5 text-xs text-muted-foreground">可以返回阅读，我们会在后台继续处理。</p>
  </div>;
}
