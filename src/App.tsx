import { LayoutPreserveModal } from './components/LayoutPreserveModal';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  TranslationDocument,
  ViewerLayoutMode,
  SupportedLanguage,
  GlossaryTerm,
  Segment,
  TranslationEngineConfig,
  CustomAiConfig,
  PresentationStyle,
} from './types';
import { storageService } from './services/storageService';
import { apiService } from './services/api';
import { savePdf, loadPdf } from './services/pdfFiles';
import { pdfExtractor } from './services/pdfExtractor';
import { exportService } from './services/exportService';

import { Header } from './components/Header';
import { DualPaneViewer } from './components/DualPaneViewer';
import { TermGlossaryDrawer } from './components/TermGlossaryDrawer';
import { DocumentSummaryModal } from './components/DocumentSummaryModal';
import { OcrScanModal } from './components/OcrScanModal';
import { EngineSettingsModal, ENGINE_PRESETS } from './components/EngineSettingsModal';
import { BatchUploadModal } from './components/BatchUploadModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { CloudSyncModal } from './components/CloudSyncModal';

export default function App() {
  // Documents and active workspace
  const [documents, setDocuments] = useState<TranslationDocument[]>(() =>
    storageService.getDocuments().map(doc => ({ ...doc, pdfBlobUrl: undefined }))
  );
  const [activeDocId, setActiveDocId] = useState<string>(() =>
    storageService.getActiveDocId()
  );

  // Active document object
  const activeDoc =
    documents.find((d) => d.id === activeDocId) || documents[0] || null;

  // Restore original PDF bytes after a page reload; blob URLs cannot be persisted.
  useEffect(() => {
    let disposed = false;
    let restoredUrl: string | undefined;
    if (activeDoc?.fileType === 'pdf') {
      loadPdf(activeDoc.id).then(file => {
        if (!file || disposed) return;
        restoredUrl = URL.createObjectURL(file);
        setDocuments(docs => docs.map(doc => doc.id === activeDoc.id ? { ...doc, pdfBlobUrl: restoredUrl } : doc));
      }).catch(console.warn);
    }
    return () => { disposed = true; if (restoredUrl) URL.revokeObjectURL(restoredUrl); };
  }, [activeDocId]);

  // Active highlighted segment
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // Layout mode: side_by_side (左右对照) | interlinear (段落交替) | target_only | source_only
  const [viewerMode, setViewerMode] = useState<ViewerLayoutMode>('side_by_side');
  const [syncScroll, setSyncScroll] = useState<boolean>(true);

  // Presentation style: 'article' (连贯文章流) | 'cards' (结构化分段卡片)
  const [presentationStyle, setPresentationStyle] = useState<PresentationStyle>(() =>
    storageService.getPresentationStyle()
  );

  const handleSetPresentationStyle = (style: PresentationStyle) => {
    setPresentationStyle(style);
    storageService.setPresentationStyle(style);
  };

  // Translation Engine
  const [activeEngine, setActiveEngine] = useState<TranslationEngineConfig>(
    ENGINE_PRESETS.find(engine => engine.id === 'bing')!
  );
  const [customContext, setCustomContext] = useState<string>('');
  const [customAiConfig, setCustomAiConfig] = useState<CustomAiConfig>(() =>
    storageService.getCustomAiConfig()
  );

  const handleUpdateCustomAiConfig = (config: CustomAiConfig) => {
    setCustomAiConfig(config);
    storageService.saveCustomAiConfig(config);
  };

  const [isImporting, setIsImporting] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');

  // Translation state
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  // Theme & Offline
  const [theme, setTheme] = useState<'dark' | 'light'>(() => storageService.getTheme());
  const [isOffline, setIsOffline] = useState<boolean>(() => storageService.isForceOffline());

  // Fullscreen Reading Mode (全屏阅读模式)
  const [isFullscreenReading, setIsFullscreenReading] = useState<boolean>(false);

  // Cloud sync state
  const [syncCode, setSyncCode] = useState<string>(() => storageService.getOrCreateSyncCode());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'unsaved'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    activeDoc?.lastSyncAt || null
  );

  const [isLayoutOpen, setIsLayoutOpen] = useState(false);

  // Modals & Drawers
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isGlossaryDrawerOpen, setIsGlossaryDrawerOpen] = useState(false);
  const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState<GlossaryTerm | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Sync theme to DOM
  useEffect(() => {
    storageService.setTheme(theme);
  }, [theme]);

  // Fullscreen Reading Mode Keyboard Shortcut (F11 或 Ctrl+Shift+F)
  useEffect(() => {
    const handleFullscreenShortcut = (e: KeyboardEvent) => {
      if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F')) {
        e.preventDefault();
        setIsFullscreenReading(prev => !prev);
      }
      // ESC 退出全屏
      if (e.key === 'Escape' && isFullscreenReading) {
        setIsFullscreenReading(false);
      }
    };

    window.addEventListener('keydown', handleFullscreenShortcut);
    return () => window.removeEventListener('keydown', handleFullscreenShortcut);
  }, [isFullscreenReading]);

  // Window online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      if (!storageService.isForceOffline()) {
        setIsOffline(false);
        setSyncStatus('synced');
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Autosave documents whenever updated
  const saveAndSetDocuments = useCallback((newDocs: TranslationDocument[]) => {
    setDocuments(newDocs);
    storageService.saveDocuments(newDocs);
  }, []);

  const updateCurrentDocument = useCallback(
    (updater: (doc: TranslationDocument) => TranslationDocument) => {
      if (!activeDoc) return;
      const updated = updater(activeDoc);
      const newDocs = storageService.updateDocument(updated);
      setDocuments(newDocs);
    },
    [activeDoc]
  );

  // Toggle Theme
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  // Toggle Offline mode
  const handleToggleOffline = () => {
    const next = !isOffline;
    setIsOffline(next);
    storageService.setForceOffline(next);
    setSyncStatus(next ? 'offline' : 'synced');
    showToast(next ? '已开启离线弱网阅读保护模式' : '已恢复在线联网模式');
  };

  // Translate all untranslated segments in batches
  const handleStartTranslateAll = async () => {
    if (!activeDoc || isTranslating) return;

    if (isOffline) {
      showToast('当前处于离线模式，如需翻译 请先切换为在线状态');
      return;
    }

    if (!activeDoc.segments.length) {
      showToast('此 PDF 没有可提取的文字，请先使用截图/拍照识别（OCR），再开始翻译。');
      return;
    }
    if (activeDoc.segments.some(s => s.original.includes('This document was uploaded into EasyReader Translator.'))) {
      showToast('这是旧版导入失败留下的占位内容，请重新导入原 PDF。');
      return;
    }
    setTranslationProgress('准备中');
    setIsTranslating(true);
    setSyncStatus('syncing');

    try {
      // Find segments needing translation
      const segmentsToTranslate = activeDoc.segments.filter(
        (s) => !s.translated || !s.translated.trim() || s.translated.startsWith('[离线')
      );

      // If all already translated, re-translate all
      const targetSegments = segmentsToTranslate.length > 0 ? segmentsToTranslate : activeDoc.segments;

      // Batch process: Bing handles larger chunks of 15; LLM engines use 5 for prompt balance
      const chunkSize = activeEngine.id === 'bing' ? 15 : 5;
      let updatedSegments = [...activeDoc.segments];
      let collectedGlossary = [...(activeDoc.glossary || [])];

      for (let i = 0; i < targetSegments.length; i += chunkSize) {
        setTranslationProgress(`${i} / ${targetSegments.length} 段`);
        const chunk = targetSegments.slice(i, i + chunkSize);
        const payload = chunk.map((s) => ({ id: s.id, text: s.original }));

        const response = await apiService.translateSegments({
          segments: payload,
          sourceLang: activeDoc.sourceLang,
          targetLang: activeDoc.targetLang,
          engineStyle: activeEngine.id,
          extractGlossary: !['bing', 'google'].includes(activeEngine.id),
          customContext,
          customAiConfig,
        });

        if (!response.success) throw new Error(response.error || '翻译失败，请重试');
        if (response.success && response.translations) {
          // Merge translations
          const transMap = new Map(response.translations.map((t) => [t.id, t.translated]));
          updatedSegments = updatedSegments.map((s) => {
            if (transMap.has(s.id)) {
              return { ...s, translated: transMap.get(s.id)! };
            }
            return s;
          });

          // Merge newly detected glossary terms
          if (response.glossary && response.glossary.length > 0) {
            response.glossary.forEach((term) => {
              if (!collectedGlossary.some((g) => g.term.toLowerCase() === term.term.toLowerCase())) {
                collectedGlossary.push({
                  ...term,
                  id: `term-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  highlighted: true,
                });
              }
            });
          }

          // Live update progress
          updateCurrentDocument((prev) => ({
            ...prev,
            segments: updatedSegments,
            glossary: collectedGlossary,
          }));
        }
      }

      showToast(`已完成全篇 ${targetSegments.length} 段的高效双语对照翻译！`);
      setSyncStatus('synced');

      // Automatically generate AI executive summary for each translated document
      if (!activeDoc.summary && activeEngine.provider === 'gemini') {
        setIsGeneratingSummary(true);
        const fullContent = updatedSegments.map((s) => s.translated || s.original).join('\n\n');
        apiService
          .generateSummary({
            text: fullContent,
            targetLang: activeDoc.targetLang,
            title: activeDoc.title,
          })
          .then((resp) => {
            if (resp.success && resp.summary) {
              updateCurrentDocument((prev) => ({
                ...prev,
                summary: resp.summary,
              }));
              showToast('已由 AI 自动提炼生成文档核心摘要！');
            }
          })
          .catch((err) => console.warn('Auto summary error:', err))
          .finally(() => setIsGeneratingSummary(false));
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      showToast(`翻译出错: ${err.message || '网络异常'}`);
      setSyncStatus('unsaved');
    } finally {
      setIsTranslating(false);
    }
  };

  // Translate a single segment
  const handleTranslateSingleSegment = async (segment: Segment) => {
    if (!activeDoc) return;
    setIsTranslating(true);

    try {
      const resp = await apiService.translateSegments({
        segments: [{ id: segment.id, text: segment.original }],
        sourceLang: activeDoc.sourceLang,
        targetLang: activeDoc.targetLang,
        engineStyle: activeEngine.id,
        extractGlossary: !['bing', 'google'].includes(activeEngine.id),
        customContext,
        customAiConfig,
      });

      if (!resp.success) throw new Error(resp.error || '翻译失败');
      if (resp.translations && resp.translations[0]) {
        const newTrans = resp.translations[0].translated;
        updateCurrentDocument((prev) => ({
          ...prev,
          segments: prev.segments.map((s) =>
            s.id === segment.id ? { ...s, translated: newTrans } : s
          ),
        }));
        showToast('已更新该段双语翻译');
      }
    } catch (err: any) {
      showToast(`翻译失败: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Inline edit update
  const handleUpdateSegment = (segmentId: string, newTranslation: string) => {
    updateCurrentDocument((prev) => ({
      ...prev,
      segments: prev.segments.map((s) =>
        s.id === segmentId ? { ...s, translated: newTranslation, userEdited: true } : s
      ),
    }));
    showToast('校对修改已保存');
  };

  // Upload new file directly
  const handleUploadFile = async (file: File) => {
    if (isImporting || isTranslating) { showToast('请等待当前导入或翻译完成'); return; }
    setIsImporting(true);
    let importedUrl: string | undefined;
    try {
      showToast(`正在解析文件 "${file.name}"...`);
      let title = file.name.replace(/\.[^/.]+$/, '');
      let segments: Segment[] = [];
      let pageCount = 1;
      let isScanned = false;
      let firstPageImage: string | undefined = undefined;
      let pdfBlobUrl: string | undefined = undefined;

      if (file.name.toLowerCase().endsWith('.pdf')) {
        const parsed = await pdfExtractor.parsePdfFile(file);
        title = parsed.title;
        segments = parsed.segments;
        pageCount = parsed.pageCount;
        isScanned = !!parsed.isScannedImageDoc;
        firstPageImage = parsed.firstPageImageBase64;
        pdfBlobUrl = importedUrl = URL.createObjectURL(file);
      } else {
        const parsed = await pdfExtractor.parseTextFile(file);
        title = parsed.title;
        segments = parsed.segments;
      }

      const newDoc: TranslationDocument = {
        id: `doc-${Date.now()}`,
        title,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
        pageCount,
        category: '通用资讯',
        tags: ['新导入', file.name.split('.').pop()?.toUpperCase() || 'DOC'],
        starred: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
        readingProgress: 0,
        sourceLang: 'auto',
        targetLang: activeDoc?.targetLang || 'zh-CN',
        engineUsed: activeEngine.id,
        isOfflineCached: true,
        pdfBlobUrl,
        pdfPageImages: firstPageImage ? [firstPageImage] : undefined,
        segments,
        glossary: [],
      };

      if (newDoc.fileType === 'pdf') {
        await savePdf(newDoc.id, file);
        setViewerMode('pdf_visual_mirror');
      } else setViewerMode('side_by_side');
      const updatedDocs = storageService.updateDocument(newDoc);
      saveAndSetDocuments(updatedDocs);
      setActiveDocId(newDoc.id);
      storageService.setActiveDocId(newDoc.id);

      if (isScanned) {
        showToast(`已成功导入 PDF《${title}》，未检测到文字层，已显示原始页面；请先使用截图识别（OCR）`);
      } else {
        showToast(`✅ 已直接导入 PDF《${title}》（共 ${segments.length} 段），点击右下角【开始翻译】即可立即完成双语对照！`);
      }
    } catch (err: any) {
      if (importedUrl) URL.revokeObjectURL(importedUrl);
      showToast(`文件解析失败: ${err.message}`);
    } finally { setIsImporting(false); }
  };

  // Change language direction
  const handleUpdateLanguage = (source: SupportedLanguage, target: SupportedLanguage) => {
    updateCurrentDocument((prev) => ({
      ...prev,
      sourceLang: source,
      targetLang: target,
    }));
    showToast(`翻译语言已切换为 ${target}`);
  };

  // Cloud Sync Actions
  const handleSyncCloud = async () => {
    try {
      setSyncStatus('syncing');
      const result = await storageService.syncToCloud();
      setLastSyncTime(result.updatedAt);
      setSyncStatus('synced');
      showToast(`云端同步成功！凭证: ${result.syncCode}`);
    } catch (err: any) {
      setSyncStatus('unsaved');
      showToast(`同步失败: ${err.message}`);
    }
  };

  const handleRestoreSync = async (code: string) => {
    const result = await storageService.restoreFromCloud(code);
    if (result.success && result.documents.length > 0) {
      setDocuments(result.documents);
      setSyncCode(code);
      const active = storageService.getActiveDocId();
      setActiveDocId(active);
      setSyncStatus('synced');
      setLastSyncTime(new Date().toISOString());
      showToast(`已成功载入云端 ${result.documents.length} 篇文档！`);
    }
  };

  // Regenerate Executive Summary
  const handleRegenerateSummary = async () => {
    if (!activeDoc) return;
    setIsGeneratingSummary(true);

    // 智能显示提示信息
    const aiProvider = activeEngine.id === 'custom-ai' ? '自定义 AI' : 'AI';
    showToast(`正在由 ${aiProvider} 深度提炼文档核心摘要...`);

    try {
      const fullText = activeDoc.segments
        .map((s) => (s.translated ? `${s.original}\n${s.translated}` : s.original))
        .join('\n\n');

      // 传递自定义 AI 配置
      const resp = await apiService.generateSummary({
        text: fullText,
        targetLang: activeDoc.targetLang,
        title: activeDoc.title,
        customAiConfig: activeEngine.id === 'custom-ai' ? customAiConfig : undefined,
      });

      if (!resp.success) throw new Error(resp.error || '摘要生成失败');
      if (resp.summary) {
        updateCurrentDocument((prev) => ({
          ...prev,
          summary: resp.summary,
        }));
        showToast(`已更新 AI 智能文档核心摘要！${resp.provider ? ` (由 ${resp.provider} 生成)` : ''}`);
      }
    } catch (err: any) {
      showToast(`生成摘要失败: ${err.message}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Glossary Term manipulation
  const handleAddTerm = (newTerm: Omit<GlossaryTerm, 'id'>) => {
    const termObj: GlossaryTerm = {
      ...newTerm,
      id: `term-${Date.now()}`,
    };
    updateCurrentDocument((prev) => ({
      ...prev,
      glossary: [...(prev.glossary || []), termObj],
    }));
    showToast(`已添加重点术语: ${termObj.term}`);
  };

  const handleDeleteTerm = (id: string) => {
    updateCurrentDocument((prev) => ({
      ...prev,
      glossary: (prev.glossary || []).filter((g) => g.id !== id),
    }));
  };

  const handleUpdateTerm = (updatedTerm: GlossaryTerm) => {
    updateCurrentDocument((prev) => ({
      ...prev,
      glossary: (prev.glossary || []).map((g) => (g.id === updatedTerm.id ? updatedTerm : g)),
    }));
  };

  // Document management
  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    storageService.setActiveDocId(id);
    setActiveSegmentId(null);
  };

  const handleToggleStar = (id: string) => {
    const updated = documents.map((d) => (d.id === id ? { ...d, starred: !d.starred } : d));
    saveAndSetDocuments(updated);
  };

  const handleDeleteDoc = (id: string) => {
    const updated = storageService.deleteDocument(id);
    saveAndSetDocuments(updated);
    if (activeDocId === id && updated.length > 0) {
      setActiveDocId(updated[0].id);
      storageService.setActiveDocId(updated[0].id);
    }
    showToast('已删除该文档记录');
  };

  const handleRenameDoc = (id: string, newTitle: string) => {
    const updated = documents.map((d) => (d.id === id ? { ...d, title: newTitle } : d));
    saveAndSetDocuments(updated);
    showToast('重命名成功');
  };

  const handleBatchComplete = (newDocs: TranslationDocument[]) => {
    const merged = [...newDocs, ...documents];
    saveAndSetDocuments(merged);
    if (newDocs.length > 0) {
      setActiveDocId(newDocs[0].id);
      storageService.setActiveDocId(newDocs[0].id);
    }
    showToast(`批量归档成功，共新增 ${newDocs.length} 篇文档！`);
  };

  const handleImportOcrDocument = (doc: TranslationDocument) => {
    const merged = [doc, ...documents];
    saveAndSetDocuments(merged);
    setActiveDocId(doc.id);
    storageService.setActiveDocId(doc.id);
    showToast('OCR 识别件已成功导入工作台！');
  };

  if (!activeDoc) {
    return <div className="p-8 text-center text-foreground">正在加载文档工作台...</div>;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground transition-colors selection:bg-blue-500/30 selection:text-blue-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-card/95 px-4 py-2.5 text-xs font-medium text-foreground shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Bar - 全屏模式下隐藏 */}
      {!isFullscreenReading && (
        <Header
          currentDoc={activeDoc}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          isOffline={isOffline}
          onToggleOffline={handleToggleOffline}
          syncStatus={syncStatus}
          onSyncCloud={handleSyncCloud}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
          onOpenOcrModal={() => setIsOcrModalOpen(true)}
          onOpenGlossaryDrawer={() => setIsGlossaryDrawerOpen(true)}
          onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
          onOpenEngineModal={() => setIsEngineModalOpen(true)}
          viewerMode={viewerMode}
          onChangeViewerMode={setViewerMode}
          presentationStyle={presentationStyle}
          onChangePresentationStyle={handleSetPresentationStyle}
          syncScroll={syncScroll}
          onToggleSyncScroll={() => setSyncScroll(!syncScroll)}
          isTranslating={isTranslating}
          onStartTranslateAll={handleStartTranslateAll}
          onUpdateLanguage={handleUpdateLanguage}
          activeEngine={activeEngine}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          onUploadFile={handleUploadFile}
          onToggleFullscreen={() => setIsFullscreenReading(!isFullscreenReading)}
        />
      )}

      {/* 全屏阅读模式退出按钮 */}
      {isFullscreenReading && (
        <button
          onClick={() => setIsFullscreenReading(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-card/95 backdrop-blur-md border border-border px-4 py-2 text-sm font-medium text-foreground shadow-xl hover:bg-accent transition-all"
          title="退出全屏阅读 (ESC 或 F11)"
        >
          <X className="h-4 w-4" />
          <span>退出全屏</span>
        </button>
      )}

      {!isFullscreenReading && (
        <div className="flex items-center gap-3 border-b border-border px-4 py-2">
          <button onClick={() => setIsLayoutOpen(true)} className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-foreground hover:bg-blue-500/20">保留版式 · BabelDOC</button>
          <span className="text-xs text-muted-foreground">生成原版布局的译文 / 双语 PDF</span>
        </div>
      )}
      <LayoutPreserveModal isOpen={isLayoutOpen} onClose={() => setIsLayoutOpen(false)} document={activeDoc} />
      {/* Main Dual Pane Viewer */}
      <main className="flex-1 overflow-hidden">
        <DualPaneViewer
          document={activeDoc}
          viewerMode={viewerMode}
          onChangeViewerMode={setViewerMode}
          presentationStyle={presentationStyle}
          onChangePresentationStyle={handleSetPresentationStyle}
          syncScroll={syncScroll}
          activeSegmentId={activeSegmentId}
          onSelectSegment={(id) => setActiveSegmentId(id)}
          onUpdateSegment={handleUpdateSegment}
          onSelectGlossaryTerm={(term) => {
            setSelectedGlossaryTerm(term);
            setIsGlossaryDrawerOpen(true);
          }}
          onTranslateSingleSegment={handleTranslateSingleSegment}
          onUploadFile={handleUploadFile}
          onStartTranslateAll={handleStartTranslateAll}
          isTranslating={isTranslating}
          onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
          onRegenerateSummary={handleRegenerateSummary}
          isGeneratingSummary={isGeneratingSummary}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          isFullscreenReading={isFullscreenReading}
        />
      </main>

      <button
        onClick={handleStartTranslateAll}
        disabled={isTranslating || isImporting}
        className="fixed bottom-6 right-6 z-40 rounded-2xl bg-blue-600 px-7 py-4 text-base font-bold text-white shadow-xl hover:bg-blue-700 disabled:opacity-60"
      >
        {isImporting ? '正在读取 PDF…' : isTranslating ? '正在翻译 ' + translationProgress : '开始翻译'}
      </button>
      {/* Terminology Glossary Drawer */}
      <TermGlossaryDrawer
        isOpen={isGlossaryDrawerOpen}
        onClose={() => setIsGlossaryDrawerOpen(false)}
        glossary={activeDoc.glossary || []}
        selectedTerm={selectedGlossaryTerm}
        onAddTerm={handleAddTerm}
        onDeleteTerm={handleDeleteTerm}
        onUpdateTerm={handleUpdateTerm}
        onExportCsv={() => exportService.exportGlossaryCsv(activeDoc)}
      />

      {/* AI Smart Executive Summary Modal */}
      <DocumentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        document={activeDoc}
        onRegenerateSummary={handleRegenerateSummary}
      />

      {/* OCR Scanned Document Modal */}
      <OcrScanModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        targetLang={activeDoc.targetLang}
        onImportOcrDocument={handleImportOcrDocument}
      />

      {/* Custom Engine & Hyperparameters Modal */}
      <EngineSettingsModal
        isOpen={isEngineModalOpen}
        onClose={() => setIsEngineModalOpen(false)}
        activeEngine={activeEngine}
        onSelectEngine={(engine) => {
          setActiveEngine(engine);
          showToast(`已切换翻译引擎: ${engine.name}`);
        }}
        customContext={customContext}
        onChangeCustomContext={setCustomContext}
        customAiConfig={customAiConfig}
        onUpdateCustomAiConfig={handleUpdateCustomAiConfig}
      />

      {/* Batch Upload & Automated Archiving Modal */}
      <BatchUploadModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onBatchComplete={handleBatchComplete}
      />

      {/* History Retrieval & Categorical Archive Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onToggleStar={handleToggleStar}
        onDeleteDoc={handleDeleteDoc}
        onRenameDoc={handleRenameDoc}
        onUploadFile={handleUploadFile}
      />

      {/* Cloud Sync & Cross-Platform Passkey Modal */}
      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncCode={syncCode}
        isSyncing={syncStatus === 'syncing'}
        lastSyncTime={lastSyncTime}
        onTriggerSync={handleSyncCloud}
        onRestoreSync={handleRestoreSync}
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        documentCount={documents.length}
      />
    </div>
  );
}
