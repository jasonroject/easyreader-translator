import React, { useState } from 'react';
import { DocumentSummary, TranslationDocument } from '../types';
import {
  X,
  Sparkles,
  BookOpen,
  Clock,
  Gauge,
  Users,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  FileCheck,
} from 'lucide-react';
import { GeminiBrandBadge, ColoredFeatureIcon } from './GeminiIcon';

interface DocumentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: TranslationDocument;
  onRegenerateSummary: () => Promise<void>;
}

export const DocumentSummaryModal: React.FC<DocumentSummaryModalProps> = ({
  isOpen,
  onClose,
  document,
  onRegenerateSummary,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const summary = document.summary;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRegenerateSummary();
    } finally {
      setIsRefreshing(false);
    }
  };

  const copySummaryText = () => {
    if (!summary) return;
    const text = `【文档核心摘要: ${document.title}】\n\n主旨概括:\n${summary.abstract}\n\n核心要点:\n${summary.keyTakeaways?.map((k, i) => `${i + 1}. ${k}`).join('\n')}\n\n核心结论/建议:\n${summary.actionItems?.join('\n') || '无'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Gemini styling */}
        <div className="relative border-b border-border/70 p-4 sm:p-5 bg-gradient-to-r from-blue-900/20 via-indigo-900/10 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <GeminiBrandBadge size="lg" glow={true} />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-foreground">
                  AI 智能文档摘要速览
                </h2>
                <p className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-md">
                  {document.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                title="重新由 AI 提炼摘要"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? '提炼中...' : '重新生成'}</span>
              </button>

              <button
                onClick={copySummaryText}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="复制摘要全文"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? '已复制' : '复制摘要'}</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {summary ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>预估阅读</span>
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    ~{summary.readingTimeMinutes || 5} 分钟
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Gauge className="h-3.5 w-3.5 text-indigo-400" />
                    <span>专业难度</span>
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    {summary.difficulty || '专业级'}
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                    <span>所属领域</span>
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground truncate">
                    {summary.category || document.category}
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    <span>目标读者</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-foreground truncate">
                    {summary.targetAudience || '专业研究者'}
                  </div>
                </div>
              </div>

              {/* One Sentence Punchy TLDR */}
              {summary.oneSentenceVerdict && (
                <div className="rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-blue-500/10 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span>一句话核心结论 (One-Sentence TL;DR)</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground leading-relaxed">
                    {summary.oneSentenceVerdict}
                  </div>
                </div>
              )}

              {/* Core Abstract & Bilingual Comparison */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    <span>核心主旨与要义摘要</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">精准浓缩核心信息</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {summary.abstract}
                </p>
                {summary.sourceAbstract && (
                  <div className="border-t border-border/50 pt-2 text-xs text-muted-foreground/90 italic leading-relaxed">
                    <span className="not-italic font-semibold text-muted-foreground mr-1">Source Excerpt:</span>
                    {summary.sourceAbstract}
                  </div>
                )}
              </div>

              {/* Key Takeaways */}
              {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    核心观点与关键论证
                  </h3>
                  <div className="space-y-2.5">
                    {summary.keyTakeaways.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 text-xs leading-relaxed text-foreground"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-bold text-blue-400">
                          {idx + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items or Conclusions */}
              {summary.actionItems && summary.actionItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    结论与后续建议
                  </h3>
                  <div className="rounded-xl border border-border bg-accent/20 p-4 space-y-2">
                    {summary.actionItems.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                        <FileCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keyword Pills */}
              {summary.keywords && summary.keywords.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    领域核心关键词
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-10 w-10 text-blue-400 animate-pulse mb-3" />
              <h3 className="text-sm font-semibold text-foreground">尚未生成该文档的智能摘要</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                点击下方按钮，由 Gemini 智能深度分析文档并提取关键发现与要点。
              </p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-500"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isRefreshing ? 'AI 深度提炼中...' : '立即提炼智能摘要'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
