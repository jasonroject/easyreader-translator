import React, { useState, useRef } from 'react';
import {
  Moon,
  Sun,
  FileDown,
  FileUp,
  Layers,
  FileText,
  Sliders,
  History,
  Camera,
  FolderSync,
  Wifi,
  WifiOff,
  Globe2,
  ChevronDown,
  BookOpen,
  ArrowRight,
  FileSpreadsheet,
  Check,
  Search,
  Sparkles,
  Cloud,
  CloudCheck,
} from 'lucide-react';
import {
  TranslationDocument,
  SupportedLanguage,
  ViewerLayoutMode,
  TranslationEngineConfig,
  PresentationStyle,
} from '../types';
import { exportService } from '../services/exportService';
import { PasteTranslator } from './PasteTranslator';
import { GeminiBrandBadge, ColoredFeatureIcon, GeminiStarIcon } from './GeminiIcon';

interface HeaderProps {
  currentDoc: TranslationDocument;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'unsaved';
  onSyncCloud: () => void;
  onOpenSyncModal: () => void;
  onOpenSummaryModal: () => void;
  onOpenOcrModal: () => void;
  onOpenGlossaryDrawer: () => void;
  onOpenHistoryDrawer: () => void;
  onOpenBatchModal: () => void;
  onOpenEngineModal: () => void;
  viewerMode: ViewerLayoutMode;
  onChangeViewerMode: (mode: ViewerLayoutMode) => void;
  presentationStyle?: PresentationStyle;
  onChangePresentationStyle?: (style: PresentationStyle) => void;
  syncScroll: boolean;
  onToggleSyncScroll: () => void;
  isTranslating: boolean;
  onStartTranslateAll: () => void;
  onUpdateLanguage: (source: SupportedLanguage, target: SupportedLanguage) => void;
  activeEngine: TranslationEngineConfig;
  isSearchOpen?: boolean;
  onToggleSearch?: () => void;
  onUploadFile?: (file: File) => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string; short: string }[] = [
  { code: 'auto', label: '自动识别', short: '自动' },
  { code: 'zh-CN', label: '简体中文', short: '中文' },
  { code: 'zh-TW', label: '繁体中文', short: '繁中' },
  { code: 'en', label: 'English (英语)', short: '英语' },
  { code: 'ja', label: '日本語 (日语)', short: '日语' },
  { code: 'ko', label: '한국어 (韩语)', short: '韩语' },
  { code: 'de', label: 'Deutsch (德语)', short: '德语' },
  { code: 'fr', label: 'Français (法语)', short: '法语' },
  { code: 'es', label: 'Español (西语)', short: '西语' },
  { code: 'ru', label: 'Русский (俄语)', short: '俄语' },
];

export const Header: React.FC<HeaderProps> = ({
  currentDoc,
  theme,
  onToggleTheme,
  isOffline,
  onToggleOffline,
  syncStatus,
  onSyncCloud,
  onOpenSyncModal,
  onOpenSummaryModal,
  onOpenOcrModal,
  onOpenGlossaryDrawer,
  onOpenHistoryDrawer,
  onOpenBatchModal,
  onOpenEngineModal,
  viewerMode,
  onChangeViewerMode,
  presentationStyle = 'article',
  onChangePresentationStyle,
  syncScroll,
  onToggleSyncScroll,
  isTranslating,
  onStartTranslateAll,
  onUpdateLanguage,
  activeEngine,
  isSearchOpen = false,
  onToggleSearch,
  onUploadFile,
}: HeaderProps) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [pasteTranslatorOpen, setPasteTranslatorOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const translatedSegmentsCount = currentDoc.segments.filter((s) => s.translated && s.translated.trim()).length;
  const totalSegmentsCount = currentDoc.segments.length;
  const translationPercentage = totalSegmentsCount > 0 ? Math.round((translatedSegmentsCount / totalSegmentsCount) * 100) : 0;

  const currentSourceLang = LANGUAGES.find((l) => l.code === currentDoc.sourceLang);
  const currentTargetLang = LANGUAGES.find((l) => l.code === currentDoc.targetLang);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/95 backdrop-blur-md transition-colors shadow-2xs">
      {/* Primary Top Bar */}
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6 gap-2">
        {/* Left Section: Gemini Brand & Document Selector & Direct PDF Import */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 max-w-[60%] sm:max-w-none">
          {/* Official Gemini App Icon with Colored Gradient Background */}
          <div className="flex items-center gap-2 shrink-0">
            <GeminiBrandBadge size="md" glow={true} />
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-sm bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] bg-clip-text text-transparent">
                EasyReader
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-border/80 hidden sm:block shrink-0" />

          {/* Current Document Selector Capsule - Responsive & Truncating Gracefully */}
          <button
            onClick={onOpenHistoryDrawer}
            className="group flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 hover:bg-background hover:border-blue-500/40 px-2.5 py-1 text-left transition-all min-w-0 max-w-[150px] sm:max-w-xs md:max-w-sm"
            title={`当前文档: ${currentDoc.title}\n点击切换历史文档或分类`}
          >
            <ColoredFeatureIcon color="blue" size="sm">
              <FileText className="h-3 w-3" />
            </ColoredFeatureIcon>

            <span className="text-xs font-medium text-foreground truncate min-w-0 flex-1">
              {currentDoc.title}
            </span>

            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0 hidden md:inline leading-none font-normal">
              {currentDoc.category}
            </span>

            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 group-hover:text-foreground transition-transform" />
          </button>

          {/* Primary High-Visibility "导入本地 PDF" Action Button */}
          {onUploadFile && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 px-2.5 sm:px-3.5 py-1 text-xs font-semibold text-cyan-300 hover:text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0 active:scale-98 cursor-pointer"
                title="直接从本地电脑选择 PDF 文件进行双语翻译（原生解析排版，免复杂 OCR）"
              >
                <FileUp className="h-3.5 w-3.5 text-cyan-400" />
                <span>📥 导入本地 PDF</span>
                <span className="hidden md:inline text-[10px] text-cyan-400/80 font-normal">
                  (免OCR)
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onUploadFile(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Center Section: Language & Engine Selector (Desktop & Tablet) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {/* Language Direction Capsule */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-xs font-medium text-foreground hover:border-blue-500/40 hover:bg-background transition-all shadow-2xs"
            >
              <ColoredFeatureIcon color="blue" size="sm">
                <Globe2 className="h-2.5 w-2.5" />
              </ColoredFeatureIcon>
              <span className="text-muted-foreground">
                {currentSourceLang?.short || currentDoc.sourceLang}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-blue-400 font-semibold">
                {currentTargetLang?.short || currentDoc.targetLang}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showLangMenu && (
              <div className="absolute left-0 mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  选择目标语言
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onUpdateLanguage(currentDoc.sourceLang, lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                        currentDoc.targetLang === lang.code
                          ? 'bg-blue-500/15 text-blue-400 font-semibold'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <span>{lang.label}</span>
                      {currentDoc.targetLang === lang.code && <Check className="h-3.5 w-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Engine Selector Capsule */}
          <button
            onClick={onOpenEngineModal}
            className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-purple-400/40 transition-colors"
            title="切换自定义翻译引擎与参数"
          >
            <ColoredFeatureIcon color="purple" size="sm">
              <Sliders className="h-2.5 w-2.5" />
            </ColoredFeatureIcon>
            <span>{activeEngine.name.split(' ')[0]}</span>
            <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400 font-medium leading-none">
              {activeEngine.badge}
            </span>
          </button>
        </div>

        {/* Compact engine selector remains available on smaller windows. */}
        <button onClick={onOpenEngineModal} title="切换翻译引擎" className="xl:hidden rounded-lg border border-border px-2 py-1 text-xs text-foreground shrink-0">{activeEngine.name.split(' ')[0]}</button>
        {/* Right Section: Core Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Search Button */}
          {onToggleSearch && (
            <button
              onClick={onToggleSearch}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-all ${
                isSearchOpen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                  : 'bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground border border-border/60'
              }`}
              title="在文档中搜索段落与关键词 (Ctrl+F / ⌘F)"
            >
              <ColoredFeatureIcon color="amber" size="sm">
                <Search className="h-3 w-3" />
              </ColoredFeatureIcon>
              <span className="hidden xl:inline text-xs">搜索</span>
            </button>
          )}

          {/* One-Click Bilingual Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-accent/60 hover:bg-accent px-2.5 py-1.5 text-xs font-medium text-foreground hover:text-blue-400 transition-colors"
              title="一键导出双语对照文档"
            >
              <ColoredFeatureIcon color="indigo" size="sm">
                <FileDown className="h-3 w-3" />
              </ColoredFeatureIcon>
              <span className="hidden sm:inline">导出</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  一键导出双语格式
                </div>
                <button
                  onClick={() => {
                    exportService.exportBilingualHtml(currentDoc);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors text-foreground"
                >
                  <ColoredFeatureIcon color="blue" size="md">
                    <FileText className="h-3.5 w-3.5" />
                  </ColoredFeatureIcon>
                  <div>
                    <div className="font-medium">双语网页 (.html)</div>
                    <div className="text-[10px] text-muted-foreground">独立单文件、离线阅读</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportService.exportBilingualWord(currentDoc);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors text-foreground"
                >
                  <ColoredFeatureIcon color="indigo" size="md">
                    <Layers className="h-3.5 w-3.5" />
                  </ColoredFeatureIcon>
                  <div>
                    <div className="font-medium">Word 文档 (.doc)</div>
                    <div className="text-[10px] text-muted-foreground">标准双栏对齐表格排版</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    exportService.exportBilingualMarkdown(currentDoc);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors text-foreground"
                >
                  <ColoredFeatureIcon color="emerald" size="md">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </ColoredFeatureIcon>
                  <div>
                    <div className="font-medium">Markdown (.md)</div>
                    <div className="text-[10px] text-muted-foreground">对照表格与摘要结构化输出</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    window.print();
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors text-foreground"
                >
                  <ColoredFeatureIcon color="amber" size="md">
                    <FileDown className="h-3.5 w-3.5" />
                  </ColoredFeatureIcon>
                  <div>
                    <div className="font-medium">双语打印 / 存为 PDF</div>
                    <div className="text-[10px] text-muted-foreground">双栏无损打印排版</div>
                  </div>
                </button>
                {currentDoc.glossary && currentDoc.glossary.length > 0 && (
                  <button
                    onClick={() => {
                      exportService.exportGlossaryCsv(currentDoc);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-accent transition-colors text-foreground border-t border-border mt-1"
                  >
                    <ColoredFeatureIcon color="purple" size="md">
                      <BookOpen className="h-3.5 w-3.5" />
                    </ColoredFeatureIcon>
                    <div>
                      <div className="font-medium">导出重点词汇表 (.csv)</div>
                      <div className="text-[10px] text-muted-foreground">供 Anki/CAT 辅助翻译导入</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Primary CTA: Translate Button with signature Gemini gradient */}
          <button
            onClick={onStartTranslateAll}
            disabled={isTranslating}
            className="flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:opacity-95 disabled:opacity-60 transition-all shrink-0 active:scale-98 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #1A73E8 0%, #4F46E5 35%, #9333EA 70%, #EC4899 100%)',
            }}
            title="一键翻译全文：无需一段段点，自动翻译整篇文档的所有内容"
          >
            <GeminiStarIcon size={14} fill="#FFFFFF" className={isTranslating ? 'animate-spin' : ''} />
            <span>
              {isTranslating
                ? `正在翻译全文 ${translationPercentage}%`
                : translationPercentage >= 100
                ? '重新翻译全文'
                : '⚡ 一键翻译全文'}
            </span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Gemini-Style Colored Feature Chips & Layout Switches */}
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between border-t border-border/60 px-3 sm:px-6 text-xs text-muted-foreground bg-background/40 overflow-x-auto no-scrollbar gap-2">
        {/* Left: View Mode & Presentation Style Segmented Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dual/Interlinear/Single Layout Mode */}
          <div className="flex items-center rounded-lg border border-border/70 bg-card/60 p-0.5">
            <button
              onClick={() => onChangeViewerMode('side_by_side')}
              className={`rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewerMode === 'side_by_side'
                  ? 'bg-blue-500/20 text-blue-400 font-semibold shadow-2xs'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              左右对照
            </button>
            <button
              onClick={() => onChangeViewerMode('interlinear')}
              className={`rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewerMode === 'interlinear'
                  ? 'bg-blue-500/20 text-blue-400 font-semibold shadow-2xs'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              段落交替
            </button>
            <button
              onClick={() => onChangeViewerMode('target_only')}
              className={`rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-medium transition-colors hidden md:inline ${
                viewerMode === 'target_only'
                  ? 'bg-blue-500/20 text-blue-400 font-semibold shadow-2xs'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              仅译文
            </button>
            <button
              onClick={() => onChangeViewerMode('source_only')}
              className={`rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-medium transition-colors hidden md:inline ${
                viewerMode === 'source_only'
                  ? 'bg-blue-500/20 text-blue-400 font-semibold shadow-2xs'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              仅原文
            </button>
          </div>

          {/* Presentation Style: Continuous Article Flow vs Fragmented Cards */}
          {onChangePresentationStyle && (
            <div className="flex items-center rounded-lg border border-purple-500/30 bg-card/70 p-0.5" title="排版展示模式">
              <button
                onClick={() => onChangePresentationStyle('article')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  presentationStyle === 'article'
                    ? 'bg-purple-500/20 text-purple-300 font-semibold shadow-2xs'
                    : 'hover:bg-accent text-muted-foreground'
                }`}
                title="连贯文章流：自然段落排版，无割裂卡片框，像阅读真实文献一样连贯通读"
              >
                <BookOpen className="h-3 w-3" />
                <span>连贯文章</span>
              </button>
              <button
                onClick={() => onChangePresentationStyle('cards')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  presentationStyle === 'cards'
                    ? 'bg-purple-500/20 text-purple-300 font-semibold shadow-2xs'
                    : 'hover:bg-accent text-muted-foreground'
                }`}
                title="逐段卡片：带段落编号与细粒度校对卡片模式"
              >
                <Layers className="h-3 w-3" />
                <span>逐段卡片</span>
              </button>
            </div>
          )}

          {/* Sync Scroll Toggle */}
          {viewerMode === 'side_by_side' && (
            <button
              onClick={onToggleSyncScroll}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] border transition-colors ${
                syncScroll
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-medium'
                  : 'border-transparent text-muted-foreground hover:bg-accent'
              }`}
              title="原文与译文窗口同步联动滚动"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${syncScroll ? 'bg-indigo-400' : 'bg-muted-foreground'}`} />
              <span className="hidden sm:inline">联动</span>
            </button>
          )}
        </div>

        {/* Right: Gemini Colored Tool Chips (有底色的专业功能图标芯片) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Plain text translation, replacing the duplicate PDF import chip. */}
          {(
            <button
              onClick={() => setPasteTranslatorOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 transition-all shrink-0 active:scale-98 cursor-pointer shadow-2xs"
              title="输入或粘贴文字进行双栏翻译"
            >
              <ColoredFeatureIcon color="blue" size="sm">
                <FileText className="h-3 w-3 text-cyan-400" />
              </ColoredFeatureIcon>
              <span>粘贴翻译</span>
            </button>
          )}

          {/* AI Smart Executive Summary Chip */}
          <button
            onClick={onOpenSummaryModal}
            className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1 text-[11px] font-medium hover:bg-accent/80 transition-colors text-foreground"
            title="查看或提炼 AI 智能文档核心摘要"
          >
            <ColoredFeatureIcon color="gemini" size="sm">
              <Sparkles className="h-3 w-3" />
            </ColoredFeatureIcon>
            <span className="hidden md:inline">智能摘要</span>
          </button>

          {/* Scanned OCR Chip */}
          <button
            onClick={onOpenOcrModal}
            className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1 text-[11px] font-medium hover:bg-accent/80 transition-colors text-foreground"
            title="针对拍照纸质文档或纯图片提取文字 (OCR)"
          >
            <ColoredFeatureIcon color="indigo" size="sm">
              <Camera className="h-3 w-3" />
            </ColoredFeatureIcon>
            <span className="hidden lg:inline">截图/拍照识别</span>
          </button>

          {/* Glossary Chip */}
          <button
            onClick={onOpenGlossaryDrawer}
            className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1 text-[11px] font-medium hover:bg-accent/80 transition-colors text-foreground"
            title="重点专业术语库与词汇高亮管理"
          >
            <ColoredFeatureIcon color="emerald" size="sm">
              <BookOpen className="h-3 w-3" />
            </ColoredFeatureIcon>
            <span className="hidden lg:inline">术语库</span>
            {currentDoc.glossary && currentDoc.glossary.length > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 leading-none">
                {currentDoc.glossary.length}
              </span>
            )}
          </button>

          {/* Batch Upload Chip */}
          <button
            onClick={onOpenBatchModal}
            className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1 text-[11px] font-medium hover:bg-accent/80 transition-colors text-foreground"
            title="批量导入多个 PDF/文档文件"
          >
            <ColoredFeatureIcon color="purple" size="sm">
              <FolderSync className="h-3 w-3" />
            </ColoredFeatureIcon>
            <span className="hidden xl:inline">批量导入</span>
          </button>

          {/* History Library Chip */}
          <button
            onClick={onOpenHistoryDrawer}
            className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1 text-[11px] font-medium hover:bg-accent/80 transition-colors text-foreground"
            title="历史文档检索与分类管理"
          >
            <ColoredFeatureIcon color="sky" size="sm">
              <History className="h-3 w-3" />
            </ColoredFeatureIcon>
            <span className="hidden xl:inline">历史库</span>
          </button>

          {/* Cloud Sync Status Chip */}
          <button
            onClick={onOpenSyncModal}
            className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1 text-[11px] font-medium hover:bg-accent/80 transition-colors text-foreground"
            title="跨平台云端同步与多设备凭证"
          >
            <ColoredFeatureIcon color={syncStatus === 'synced' ? 'emerald' : 'blue'} size="sm">
              {syncStatus === 'synced' ? (
                <CloudCheck className="h-3 w-3" />
              ) : (
                <Cloud className="h-3 w-3" />
              )}
            </ColoredFeatureIcon>
            <span className="hidden 2xl:inline">
              {syncStatus === 'synced' ? '已同步' : '云端同步'}
            </span>
          </button>

          {/* Offline Protection Chip */}
          <button
            onClick={onToggleOffline}
            className={`flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-1 text-[11px] transition-colors ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-muted-foreground hover:bg-accent'
            }`}
            title={isOffline ? '当前为离线模式 (弱网保护已开启)' : '点击切换弱网/离线阅读模式'}
          >
            <ColoredFeatureIcon color={isOffline ? 'amber' : 'blue'} size="sm">
              {isOffline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
            </ColoredFeatureIcon>
            <span className="hidden 2xl:inline">{isOffline ? '离线' : '在线'}</span>
          </button>

          {/* Translation Progress Indicator */}
          <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-border/60 shrink-0">
            <div className="w-12 sm:w-16 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#4285F4] to-[#9B72CB] h-1.5 transition-all duration-300"
                style={{ width: `${translationPercentage}%` }}
              />
            </div>
            <span className="font-semibold text-foreground text-[10px] tabular-nums">{translationPercentage}%</span>
          </div>
        </div>
      </div>
      <PasteTranslator open={pasteTranslatorOpen} onClose={() => setPasteTranslatorOpen(false)} />
    </header>
  );
};
