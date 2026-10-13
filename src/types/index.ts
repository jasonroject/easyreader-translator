export type SupportedLanguage = 
  | 'auto'
  | 'zh-CN' // 简体中文
  | 'zh-TW' // 繁体中文
  | 'en'    // 英语
  | 'ja'    // 日语
  | 'ko'    // 韩语
  | 'de'    // 德语
  | 'fr'    // 法语
  | 'es'    // 西班牙语
  | 'ru'    // 俄语
  | 'it'    // 意大利语
  | 'pt'    // 葡萄牙语
  | 'ar';   // 阿拉伯语

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export type DocumentCategory = 
  | '学术科研'
  | '商务法务'
  | '技术手册'
  | '金融研报'
  | '通用资讯'
  | '产品规范';

export interface GlossaryTerm {
  id: string;
  term: string;
  translation: string;
  explanation: string;
  category?: 'technical' | 'academic' | 'business' | 'general';
  highlighted?: boolean;
  userNotes?: string;
}

export interface Segment {
  id: string;
  pageNumber: number;
  type: 'title' | 'heading' | 'paragraph' | 'bullet' | 'table_row' | 'code';
  original: string;
  translated: string;
  isTranslating?: boolean;
  userEdited?: boolean;
  notes?: string;
}

export interface DocumentSummary {
  oneSentenceVerdict?: string;
  abstract: string;
  sourceAbstract?: string;
  keyTakeaways: string[];
  actionItems?: string[];
  category: string;
  keywords: string[];
  readingTimeMinutes: number;
  difficulty: '入门' | '中等' | '专业级' | '高精尖';
  targetAudience: string;
}

export interface TranslationDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize?: number;
  fileType: 'pdf' | 'ocr_scan' | 'txt' | 'md';
  pageCount: number;
  category: DocumentCategory;
  tags: string[];
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  readingProgress: number; // 0 - 100
  sourceLang: SupportedLanguage;
  targetLang: SupportedLanguage;
  engineUsed: 'gemini-flash' | 'academic' | 'business' | 'literary' | 'bing' | 'google' | 'custom-ai';
  segments: Segment[];
  glossary: GlossaryTerm[];
  summary?: DocumentSummary;
  ocrConfidence?: number;
  isOfflineCached?: boolean;
  pdfBlobUrl?: string;
  pdfPageImages?: string[];
}

export interface CustomAiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
}

export interface TranslationEngineConfig {
  id: 'gemini-flash' | 'academic' | 'business' | 'literary' | 'bing' | 'google' | 'custom-ai';
  name: string;
  subName: string;
  description: string;
  badge: string;
  temperature: number;
  terminologyStrictness: 'standard' | 'high' | 'maximum';
  recommendedFor: string;
  provider?: 'gemini' | 'bing' | 'google' | 'custom-ai';
}

export type ViewerLayoutMode = 'side_by_side' | 'interlinear' | 'target_only' | 'source_only' | 'pdf_visual_mirror';

export type PresentationStyle = 'article' | 'cards';

export interface BatchUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'parsing' | 'translating' | 'done' | 'error';
  progress: number;
  error?: string;
  category?: DocumentCategory;
  resultDocId?: string;
}

export interface CloudSyncInfo {
  syncCode: string;
  lastSyncTime: string | null;
  isSyncing: boolean;
  status: 'synced' | 'unsaved' | 'offline' | 'error';
  deviceLabel: string;
}
