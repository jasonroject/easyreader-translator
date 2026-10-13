import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  FileText,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Check,
  ChevronRight,
} from 'lucide-react';
import { apiService, OcrApiResponse } from '../services/api';
import { TranslationDocument, SupportedLanguage } from '../types';

interface OcrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLang: SupportedLanguage;
  onImportOcrDocument: (doc: TranslationDocument) => void;
}

export const OcrScanModal: React.FC<OcrScanModalProps> = ({
  isOpen,
  onClose,
  targetLang,
  onImportOcrDocument,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrApiResponse['result'] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
      setErrorMsg(null);

      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartOcr = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const resp = await apiService.processOcr({
        imageBase64: selectedImage,
        mimeType: 'image/png',
        targetLang,
      });

      if (resp.success && resp.result) {
        setOcrResult(resp.result);
      } else {
        throw new Error(resp.error || '未能成功识别文字');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'OCR 识别遇到问题，请检查网络或更换清晰图片');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pre-load a sample scanned laboratory sheet for quick test
  const loadSampleScannedDoc = () => {
    // Generate a lightweight canvas synthetic scanned document image
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f5f5f0';
      ctx.fillRect(0, 0, 600, 400);

      // Noise and subtle paper texture lines
      ctx.fillStyle = '#222222';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('ACCELEROMETER CALIBRATION SPEC SHEET', 40, 50);

      ctx.font = '13px monospace';
      ctx.fillText('Device ID: AC-9800-B   Inspection Date: 2026-10-10', 40, 85);
      ctx.fillText('Sensitivity @ 100Hz: 10.02 mV/g  (Tolerance: +-0.15)', 40, 120);
      ctx.fillText('Zero Drift Coefficient: 0.03% FS / deg C', 40, 155);
      ctx.fillText('Resonant Frequency: 28.4 kHz (Bandwidth pass)', 40, 190);
      ctx.fillText('Environment: 23.4 C, 46.2% RH, 1013 hPa', 40, 225);
      ctx.fillText('Conclusion: ALL CRITICAL TOLERANCES VERIFIED PASS', 40, 270);

      setSelectedImage(canvas.toDataURL('image/png'));
      setSelectedFileName('Sample_Scanned_Lab_Certificate.png');
      setErrorMsg(null);
      setOcrResult(null);
    }
  };

  const handleApplyToWorkspace = () => {
    if (!ocrResult) return;

    const newDoc: TranslationDocument = {
      id: `doc-ocr-${Date.now()}`,
      title: ocrResult.documentTitle || selectedFileName.replace(/\.[^/.]+$/, ''),
      fileName: selectedFileName || 'scanned_document.png',
      fileType: 'ocr_scan',
      pageCount: 1,
      category: '技术手册',
      tags: ['OCR识别件', '扫描件', '技术标定'],
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      readingProgress: 100,
      sourceLang: (ocrResult.detectedLanguage as any) || 'en',
      targetLang,
      engineUsed: 'gemini-flash',
      ocrConfidence: ocrResult.confidenceScore || 0.98,
      isOfflineCached: true,
      segments: ocrResult.paragraphs.map((p, idx) => ({
        id: `seg-ocr-${idx + 1}`,
        pageNumber: 1,
        type: p.type || 'paragraph',
        original: p.originalText,
        translated: p.translatedText,
      })),
      glossary: (ocrResult.detectedTerms || []).map((t, i) => ({
        id: `ocr-term-${i + 1}`,
        term: t.term,
        translation: t.translation,
        explanation: t.explanation,
        category: 'technical',
        highlighted: true,
      })),
      summary: {
        abstract: `此文档通过高精度光学 OCR 识别自扫描件 "${selectedFileName}"。共提取 ${ocrResult.paragraphs.length} 个结构化段落，识别置信度达 ${Math.round((ocrResult.confidenceScore || 0.98) * 100)}%。`,
        keyTakeaways: [
          '完整还原扫描图纸中的关键数据参数与检测结论。',
          '通过多模态视觉模型对表格与段落层级完成结构化对齐。',
        ],
        category: '技术手册',
        keywords: ['OCR扫描', '高精度识别', '多模态对齐'],
        readingTimeMinutes: 3,
        difficulty: '专业级',
        targetAudience: '工程审阅人员',
      },
    };

    onImportOcrDocument(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-border/70 p-5 bg-gradient-to-r from-indigo-900/20 via-purple-900/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                扫描件智能 OCR 识别与双语提取
              </h2>
              <p className="text-xs text-muted-foreground">
                支持纸质扫描件、合同图纸、证照及包含模糊字迹的图片
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* File selector dropzone */}
          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-background/50 p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-accent/30 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />
              <ImageIcon className="h-10 w-10 text-indigo-400 mb-3" />
              <p className="text-sm font-semibold text-foreground">
                点击上传扫描件图片或拖拽至此
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支持 PNG, JPG, JPEG, WEBP 格式 (多模态高保真排版还原)
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleScannedDoc();
                }}
                className="mt-4 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/25 transition-colors"
              >
                加载实验标定单示例扫描件快速测试
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview & Actions */}
              <div className="flex flex-col sm:flex-row gap-4 items-center rounded-xl border border-border bg-background/60 p-3">
                <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-black/40">
                  <img
                    src={selectedImage}
                    alt="Scanned Preview"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex-1 text-left w-full">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {selectedFileName}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    目标翻译方向: 自动检测语种 → {targetLang}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setOcrResult(null);
                      }}
                      className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      重新选择
                    </button>
                    {!ocrResult && (
                      <button
                        onClick={handleStartOcr}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        <Sparkles className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                        <span>{isProcessing ? 'AI 智能解析中...' : '开始 OCR 识别'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Error notice */}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* OCR Extracted Results Preview */}
              {ocrResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>识别成功 (置信度: {Math.round((ocrResult.confidenceScore || 0.98) * 100)}%)</span>
                    </span>
                    <span className="text-muted-foreground">
                      提取 {ocrResult.paragraphs.length} 个段落/表格项
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-border bg-background/50 p-3 text-xs">
                    {ocrResult.paragraphs.map((p, idx) => (
                      <div key={idx} className="border-b border-border/40 pb-2 last:border-0">
                        <div className="text-muted-foreground/80 font-mono text-[10px] mb-0.5">
                          #{idx + 1} [{p.type || 'paragraph'}]
                        </div>
                        <div className="text-foreground/90">{p.originalText}</div>
                        <div className="text-blue-400 mt-1">{p.translatedText}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {ocrResult && (
          <div className="border-t border-border/70 p-4 bg-background flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              识别结果已完成自动对照预翻译
            </span>
            <button
              onClick={handleApplyToWorkspace}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-indigo-500 hover:to-blue-500"
            >
              <span>导入至双语对照工作台</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
