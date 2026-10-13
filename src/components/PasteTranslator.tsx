import { EngineeringOptions } from './EngineeringOptions';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, ClipboardPaste, Copy, X, Languages } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { translatePlainText } from '../services/plainTranslation';

const languages: { code: SupportedLanguage; name: string }[] = [
  { code: 'auto', name: '自动识别' }, { code: 'en', name: '英语' }, { code: 'zh-CN', name: '中文（简体）' }, { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'ja', name: '日语' }, { code: 'ko', name: '韩语' }, { code: 'fr', name: '法语' }, { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' }, { code: 'ru', name: '俄语' }, { code: 'it', name: '意大利语' }, { code: 'pt', name: '葡萄牙语' }, { code: 'ar', name: '阿拉伯语' },
];
const button = 'studio-button';

export function PasteTranslator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState(''), [result, setResult] = useState('');
  const [source, setSource] = useState<SupportedLanguage>('auto'), [target, setTarget] = useState<SupportedLanguage>('zh-CN');
  const [engine, setEngine] = useState<'bing' | 'google' | 'gemini-flash'>('bing');
  const [domain, setDomain] = useState('general'), [glossary, setGlossary] = useState('');
  const [detected, setDetected] = useState(''), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const input = useRef<HTMLTextAreaElement>(null), output = useRef<HTMLTextAreaElement>(null), dialog = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);
  const version = useRef(0);
  const cancel = () => { version.current++; pending.current?.abort(); pending.current = null; setBusy(false); };
  const invalidate = () => { cancel(); setResult(''); setDetected(''); setError(''); setNotice(''); };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => { version.current++; pending.current?.abort(); pending.current = null; previous?.focus(); };
  }, [open]);
  useEffect(() => { if (open) setBusy(false); }, [open]);
  const translate = async () => {
    if (busy || !text.trim() || text.length > 5000) return;
    cancel(); const attempt = version.current;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setResult(''); setError(''); setNotice('');
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const translated = await translatePlainText(text, source, target, engine, controller.signal, undefined, { engineeringDomain: domain, engineeringGlossary: glossary });
      if (attempt !== version.current) return;
      setResult(translated.text); if (translated.warning) setNotice(translated.warning); setDetected(translated.detectedLanguage || '');
    } catch (e: any) {
      if (attempt === version.current) setError(e.name === 'AbortError' ? '翻译超时，请重试或更换引擎。' : e.message || '翻译失败，请重试。');
    } finally {
      clearTimeout(timeout);
      if (attempt === version.current) { pending.current = null; setBusy(false); }
    }
  };
  const reverseSource = source === 'auto' ? languages.find(language => language.code === detected && language.code !== 'auto')?.code : source;
  if (!open) return null;
  return createPortal(<div className="studio studio-backdrop fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="粘贴翻译器" className="studio-paste layer-enter flex max-h-full w-full max-w-6xl flex-col overflow-hidden text-foreground" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); cancel(); onClose(); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void translate(); }
      if (event.key === 'Tab') {
        const fields = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary') || []);
        const first = fields[0], last = fields[fields.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="studio-paste-header flex flex-wrap items-center gap-3">
        <span className="studio-mark"><Languages size={22} strokeWidth={1.5} /></span><div className="mr-auto"><p className="studio-eyebrow">QUICK TRANSLATE</p><h2 className="text-xl font-semibold tracking-tight">粘贴翻译</h2></div>
        <label className="flex items-center gap-2 text-sm">引擎 <select aria-label="粘贴翻译引擎" className={button} value={engine} onChange={e => { invalidate(); setEngine(e.target.value as typeof engine); }}><option value="bing">Bing（默认）</option><option value="google">Google</option><option value="gemini-flash">Gemini（需配置）</option></select></label>
        <button className={button} aria-label="关闭粘贴翻译" onClick={() => { cancel(); onClose(); }}><X className="h-4 w-4" /></button>
      </header>
      <div className="studio-paste-options"><EngineeringOptions domain={domain} onDomain={value => { invalidate(); setDomain(value); }} glossary={glossary} onGlossary={value => { invalidate(); setGlossary(value); }} /></div>
      <div className="overflow-auto px-4 pb-5 sm:px-7 sm:pb-6">
        <div className="studio-language-row grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-4">
          <select aria-label="原文语言" className={`${button} min-w-0 w-full`} value={source} onChange={e => { invalidate(); setSource(e.target.value as SupportedLanguage); }}>{languages.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}</select>
          <button aria-label="交换语言与文本" title="交换语言；已有译文时将译文放入输入框" className="studio-button studio-swap" onClick={() => {
            const nextTarget = reverseSource || (target.startsWith('zh') ? 'en' : 'zh-CN');
            const nextText = result || text;
            invalidate(); setText(nextText); setSource(target); setTarget(nextTarget);
            if (!reverseSource) setNotice(`原文尚未识别，交换后译为${languages.find(language => language.code === nextTarget)?.name}，可在右侧修改。`);
          }}><ArrowLeftRight className="h-4 w-4" /></button>
          <select aria-label="译文语言" className={`${button} min-w-0 w-full`} value={target} onChange={e => { invalidate(); setTarget(e.target.value as SupportedLanguage); }}>{languages.filter(language => language.code !== 'auto').map(language => <option key={language.code} value={language.code}>{language.name}</option>)}</select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <section className="studio-writing-panel flex flex-col">
            <label htmlFor="paste-source" className="mb-4 text-xs font-medium tracking-wider text-muted-foreground">输入文本</label>
            <textarea id="paste-source" ref={input} dir="auto" aria-label="输入待翻译文本" value={text} onChange={e => { invalidate(); setText(e.target.value); }} placeholder="在这里输入或粘贴文字…" className="min-h-40 flex-1 resize-none bg-transparent text-lg leading-8 text-foreground outline-none md:min-h-56" />
            <div className="mt-3 flex items-center gap-2">
              <button className={button} onClick={async () => {
                try { const pasted = await navigator.clipboard.readText(); invalidate(); setText(pasted); input.current?.focus(); }
                catch { setNotice('浏览器不允许读取剪贴板，请点击输入框后按 Ctrl+V（Mac：⌘V）。'); input.current?.focus(); }
              }}><ClipboardPaste className="h-4 w-4" />粘贴</button>
              <button className={button} disabled={!text && !result} onClick={() => { invalidate(); setText(''); input.current?.focus(); }}>清空</button>
              <span className={`ml-auto text-xs ${text.length > 5000 ? 'text-red-500' : 'text-muted-foreground'}`}>{text.length} / 5000</span>
            </div>
          </section>
          <section className="studio-writing-panel studio-writing-output flex flex-col">
            <label htmlFor="paste-result" className="mb-4 text-xs font-medium tracking-wider text-muted-foreground">翻译</label>
            <textarea id="paste-result" ref={output} dir="auto" readOnly aria-label="翻译结果" value={result} placeholder={busy ? '正在翻译…' : '译文将显示在这里'} className="min-h-40 flex-1 resize-none bg-transparent text-lg leading-8 text-foreground outline-none md:min-h-56" />
            <div className="mt-3 flex items-center gap-2">
              <button className={button} disabled={!result} onClick={async () => {
                try { await navigator.clipboard.writeText(result); setNotice('译文已复制。'); }
                catch { output.current?.focus(); output.current?.select(); setNotice('已选中译文，请按 Ctrl+C（Mac：⌘C）复制。'); }
              }}><Copy className="h-4 w-4" />复制译文</button>
              {source === 'auto' && detected && <span className="ml-auto text-xs text-muted-foreground">识别为：{languages.find(language => language.code === detected)?.name || detected}</span>}
            </div>
          </section>
        </div>
        {(error || text.length > 5000) && <p role="alert" className="mt-3 text-sm text-red-500">{text.length > 5000 ? '每次最多翻译 5000 个字符，请分段翻译。' : error}</p>}
        {notice && <p role="status" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Ctrl / ⌘ + Enter 翻译 · 文字仅在点击翻译时发送到所选服务</span>
          <div className="flex gap-2">{busy && <button className={button} onClick={cancel}>取消</button>}<button disabled={busy || !text.trim() || text.length > 5000} className="studio-primary" onClick={() => void translate()}>{busy ? '正在翻译…' : '翻译文本'}</button></div>
        </footer>
      </div>
    </div>
  </div>, document.body);
}
