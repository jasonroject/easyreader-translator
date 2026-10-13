import React from 'react';
import { engineeringDomains } from '../services/engineeringDomains';
export function EngineeringOptions({ domain, onDomain, glossary, onGlossary, disabled = false }: { domain: string; onDomain: (v: string) => void; glossary: string; onGlossary: (v: string) => void; disabled?: boolean }) {
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    <label>领域 <select aria-label="翻译领域" disabled={disabled} value={domain} onChange={e => onDomain(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2">{Object.entries(engineeringDomains).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</select></label>
    <details className="relative"><summary className="cursor-pointer text-blue-500">术语设置</summary><div className="absolute left-0 top-8 z-30 w-80 rounded-xl border border-border bg-card p-3 shadow-xl"><p className="mb-2 text-xs text-muted-foreground">英→简中术语，每行“原词=译词”。领域词库可用自定义词覆盖；其他语种请用 AI 上下文判断。</p><textarea aria-label="自定义工程术语" disabled={disabled} maxLength={2000} value={glossary} onChange={e => onGlossary(e.target.value)} placeholder={'stress=应力\nstrain=应变'} className="h-28 w-full rounded border border-border bg-background p-2" /></div></details>
  </div>;
}
