import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FolderSync,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { BatchUploadItem, DocumentCategory, TranslationDocument } from '../types';
import { pdfExtractor } from '../services/pdfExtractor';
import { apiService } from '../services/api';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchComplete: (newDocs: TranslationDocument[]) => void;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({
  isOpen,
  onClose,
  onBatchComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedDocs, setProcessedDocs] = useState<TranslationDocument[]>([]);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: BatchUploadItem[] = Array.from(files).map((f) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      type: f.name.split('.').pop() || 'unknown',
      status: 'pending',
      progress: 0,
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleStartBatchProcessing = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    const generatedDocs: TranslationDocument[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'done') continue;

      // Update item to parsing
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'parsing', progress: 30 } : it))
      );

      try {
        let title = item.name.replace(/\.[^/.]+$/, '');
        let segments = [];
        let pageCount = 1;

        if (item.name.toLowerCase().endsWith('.pdf')) {
          const parsed = await pdfExtractor.parsePdfFile(item.file);
          title = parsed.title;
          segments = parsed.segments;
          pageCount = parsed.pageCount;
        } else {
          const parsed = await pdfExtractor.parseTextFile(item.file);
          title = parsed.title;
          segments = parsed.segments;
        }

        // Auto-archive category prediction based on title & first segment
        const sampleText = segments.slice(0, 3).map((s) => s.original).join(' ');
        let detectedCategory: DocumentCategory = '通用资讯';
        if (
          title.includes('Attention') ||
          title.includes('Paper') ||
          sampleText.includes('algorithm') ||
          sampleText.includes('model')
        ) {
          detectedCategory = '学术科研';
        } else if (
          title.includes('Agreement') ||
          title.includes('Contract') ||
          sampleText.includes('party') ||
          sampleText.includes('liability')
        ) {
          detectedCategory = '商务法务';
        } else if (
          title.includes('Manual') ||
          title.includes('Spec') ||
          title.includes('Calibration')
        ) {
          detectedCategory = '技术手册';
        }

        const newDoc: TranslationDocument = {
          id: `doc-${Date.now()}-${i}`,
          title,
          fileName: item.name,
          fileSize: item.size,
          fileType: item.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
          pageCount,
          category: detectedCategory,
          tags: [detectedCategory, '自动化归档'],
          starred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
          readingProgress: 0,
          sourceLang: 'en',
          targetLang: 'zh-CN',
          engineUsed: 'gemini-flash',
          isOfflineCached: true,
          segments,
          glossary: [],
        };

        generatedDocs.push(newDoc);

        // Mark item as done
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'done', progress: 100, category: detectedCategory, resultDocId: newDoc.id }
              : it
          )
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error', error: err.message || '解析失败' } : it
          )
        );
      }
    }

    setProcessedDocs(generatedDocs);
    setIsProcessing(false);
  };

  const handleFinishAndImport = () => {
    if (processedDocs.length > 0) {
      onBatchComplete(processedDocs);
      onClose();
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-border/70 p-5 bg-gradient-to-r from-blue-900/20 via-indigo-900/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <FolderSync className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                批量文档上传与自动化归档
              </h2>
              <p className="text-xs text-muted-foreground">
                一次性处理多篇 PDF/文献，自动按学术、合同、手册等领域智能归类
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Drop area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-background/50 p-6 text-center cursor-pointer hover:border-blue-500/50 hover:bg-accent/30 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <Upload className="h-8 w-8 text-blue-400 mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              点击选择或拖拽多个文档进行批量上传
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              支持 PDF, TXT, Markdown 格式（批量智能切段与语义识别）
            </p>
          </div>

          {/* Items queue */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>上传队列 ({items.length})</span>
                <button
                  onClick={() => setItems([])}
                  className="text-muted-foreground hover:text-red-400 text-[11px]"
                >
                  清空列表
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-border bg-background/40 p-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{(item.size / 1024).toFixed(1)} KB</span>
                          {item.category && (
                            <span className="rounded bg-blue-500/10 px-1 text-blue-400">
                              归档: {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'done' ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>已就绪</span>
                        </span>
                      ) : item.status === 'parsing' ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400">
                          <Sparkles className="h-3.5 w-3.5 animate-spin" />
                          <span>解析中</span>
                        </span>
                      ) : item.status === 'error' ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-red-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>错误</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">待处理</span>
                      )}

                      {item.status !== 'parsing' && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-muted"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/70 p-4 bg-background flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {processedDocs.length > 0
              ? `已成功生成 ${processedDocs.length} 篇结构化文档`
              : '准备就绪后点击批量处理'}
          </span>

          <div className="flex gap-2">
            {items.some((it) => it.status === 'pending') && (
              <button
                onClick={handleStartBatchProcessing}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? '批量解析与归档中...' : '开始批量解析归档'}</span>
              </button>
            )}

            {processedDocs.length > 0 && (
              <button
                onClick={handleFinishAndImport}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-emerald-500 hover:to-teal-500"
              >
                <span>全部导入工作台</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
