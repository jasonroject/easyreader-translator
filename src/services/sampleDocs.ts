import { TranslationDocument } from '../types';
export const SAMPLE_DOCUMENTS: TranslationDocument[] = [{
  id: 'sample-doc-welcome', title: 'Welcome to EasyReader · 使用指南', fileName: 'welcome.txt',
  fileType: 'txt', pageCount: 1, category: '通用资讯', tags: ['使用指南'], starred: false,
  createdAt: '2026-10-13T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z', readingProgress: 0,
  sourceLang: 'en', targetLang: 'zh-CN', engineUsed: 'bing', glossary: [],
  segments: [
    { id: 'welcome-1', pageNumber: 1, type: 'heading', original: 'Welcome to EasyReader', translated: '欢迎使用 EasyReader' },
    { id: 'welcome-2', pageNumber: 1, type: 'paragraph', original: 'Import a PDF, then click Start translation in the lower right corner. Bing is selected by default. Translation requires an internet connection.', translated: '导入 PDF 后，点击右下角的开始翻译。默认使用 Bing。翻译需要联网。' },
    { id: 'welcome-3', pageNumber: 1, type: 'paragraph', original: 'Use the layout module to generate translated and bilingual PDF files. Its first run prepares local models and fonts. Scanned pages use local OCR; recognition quality depends on the scan.', translated: '保留版式模块可以生成译文和双语 PDF。首次运行会准备本地模型与字体。扫描页使用本地 OCR，识别质量取决于扫描清晰度。' },
  ],
}];
