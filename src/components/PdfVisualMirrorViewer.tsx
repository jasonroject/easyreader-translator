import React, { useEffect, useRef, useState } from 'react';
import { TranslationDocument } from '../types';

interface Props {
  document: TranslationDocument;
  onUploadFile?: (file: File) => void;
  onStartTranslateAll?: () => void;
  isTranslating?: boolean;
  onUpdateSegment?: (segmentId: string, newTranslation: string) => void;
  onSwitchToParagraphMode?: () => void;
}

export const PdfVisualMirrorViewer: React.FC<Props> = ({ document: doc, onUploadFile, onStartTranslateAll, isTranslating, onSwitchToParagraphMode }) => {
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const totalPages = Math.max(1, doc.pageCount);
  const currentPage = Math.min(pageNumber, totalPages);
  const segments = doc.segments.filter(segment => segment.pageNumber === currentPage);
  useEffect(() => { setPageNumber(1); }, [doc.id]);

  useEffect(() => {
    if (!doc.pdfBlobUrl || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: any;
    const loadingTask = window.pdfjsLib.getDocument({ url: doc.pdfBlobUrl });
    setError('');
    setRendering(true);
    (async () => {
      try {
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(currentPage);
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        renderTask = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
        await renderTask.promise;
      } catch (err: any) {
        if (!cancelled) setError(`无法显示 PDF 页面：${err.message}。请重新导入原文件。`);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; renderTask?.cancel(); void loadingTask.destroy(); };
  }, [doc.pdfBlobUrl, currentPage]);

  const button = 'rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-40';
  return (
    <div className="flex h-full flex-col bg-background">
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={event => {
        const file = event.target.files?.[0]; if (file) onUploadFile?.(file); event.target.value = '';
      }} />
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <span className="mr-auto text-sm font-semibold truncate max-w-80">{doc.fileName}</span>
        <button className={button} disabled={currentPage <= 1} onClick={() => setPageNumber(currentPage - 1)}>上一页</button>
        <span className="text-xs">第 {currentPage} / {totalPages} 页</span>
        <button className={button} disabled={currentPage >= totalPages} onClick={() => setPageNumber(currentPage + 1)}>下一页</button>
        <button className={button} disabled={zoom <= 50} onClick={() => setZoom(zoom - 25)}>缩小</button>
        <span className="text-xs">{zoom}%</span>
        <button className={button} disabled={zoom >= 200} onClick={() => setZoom(zoom + 25)}>放大</button>
        <button className={button} onClick={() => inputRef.current?.click()}>更换源 PDF</button>
        <button className={button} onClick={onSwitchToParagraphMode}>段落流模式</button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <section className="overflow-auto border-r border-border bg-muted p-4 pb-28" aria-label="原始 PDF 页面">
          <h2 className="mb-3 text-sm font-semibold">原始 PDF · 第 {currentPage} 页</h2>
          {!doc.pdfBlobUrl ? <p className="text-sm">未保存原始 PDF 文件，请重新导入以查看原版页面。</p> : <>
            {rendering && <p role="status" className="text-sm">正在渲染 PDF…</p>}
            {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}
            <canvas ref={canvasRef} aria-label={`PDF 第 ${currentPage} 页`} style={{ width: `${zoom}%`, maxWidth: 'none', height: 'auto' }} className="bg-white shadow-md" />
          </>}
        </section>
        <section className="overflow-auto bg-card p-5 pb-28" aria-label="当前页译文">
          <h2 className="mb-4 text-sm font-semibold">译文 · 第 {currentPage} 页</h2>
          {segments.length === 0 ? <div className="rounded-xl border border-border p-4 text-sm leading-7">
            此页未提取到文字，可能是扫描页或空白页。原始 PDF 可在左侧查看；扫描页需要先进行 OCR，Bing / Google 无法直接翻译图片。
          </div> : segments.map(segment => <article key={segment.id} className="mb-5 rounded-xl border border-border p-4 hover:bg-accent">
            <p className="whitespace-pre-wrap leading-7 text-foreground">{segment.translated || '等待翻译：点击右下角“开始翻译”。'}</p>
            <details className="mt-3 text-xs text-muted-foreground" open={!segment.translated}>
              <summary className="cursor-pointer">查看提取的原文</summary>
              <p className="mt-2 whitespace-pre-wrap leading-6">{segment.original}</p>
            </details>
          </article>)}
          {!!segments.length && <button className={button} disabled={isTranslating} onClick={onStartTranslateAll}>{isTranslating ? '正在翻译…' : '翻译全文'}</button>}
        </section>
      </div>
    </div>
  );
};
