import { TranslationDocument, DocumentCategory, CustomAiConfig } from '../types';
import { SAMPLE_DOCUMENTS } from './sampleDocs';
import { apiService } from './api';

const STORAGE_KEY_DOCS = 'easyreader_translator_docs_v1';
const STORAGE_KEY_ACTIVE = 'easyreader_translator_active_id';
const STORAGE_KEY_SYNC_CODE = 'easyreader_translator_sync_code';
const STORAGE_KEY_THEME = 'easyreader_translator_theme';
const STORAGE_KEY_OFFLINE_MODE = 'easyreader_translator_force_offline';
const STORAGE_KEY_CUSTOM_AI = 'easyreader_translator_custom_ai_v1';

export const DEFAULT_CUSTOM_AI_CONFIG: CustomAiConfig = {
  endpoint: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  systemPrompt: '你是一名专业级多语言文献翻译专家。请严谨、准确、忠实于原文语义与排版，输出流畅的高质量译文，并提取关键专业术语。',
  temperature: 0.3,
};

export const storageService = {
  // Load all documents from local persistence or seed with samples
  getDocuments(): TranslationDocument[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DOCS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse documents from localStorage:', e);
    }
    // Seed with high quality sample documents
    this.saveDocuments(SAMPLE_DOCUMENTS);
    return SAMPLE_DOCUMENTS;
  },

  // Save documents to local storage
  saveDocuments(docs: TranslationDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
    } catch (e) {
      console.warn('LocalStorage save failed, possibly quota exceeded:', e);
    }
  },

  // Get active document ID
  getActiveDocId(): string {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE);
    return active || 'sample-doc-welcome';
  },

  // Set active document ID
  setActiveDocId(id: string): void {
    localStorage.setItem(STORAGE_KEY_ACTIVE, id);
  },

  // Presentation style: 'article' (连贯文章流) | 'cards' (结构化分段卡片)
  getPresentationStyle(): 'article' | 'cards' {
    return (localStorage.getItem('gemini_doc_presentation_style') as any) || 'article';
  },

  setPresentationStyle(style: 'article' | 'cards'): void {
    localStorage.setItem('gemini_doc_presentation_style', style);
  },

  // Save or update single document
  updateDocument(doc: TranslationDocument): TranslationDocument[] {
    const docs = this.getDocuments();
    const index = docs.findIndex((d) => d.id === doc.id);
    const updatedDoc = {
      ...doc,
      updatedAt: new Date().toISOString(),
      isOfflineCached: true,
    };

    let newDocs: TranslationDocument[];
    if (index >= 0) {
      newDocs = [...docs];
      newDocs[index] = updatedDoc;
    } else {
      newDocs = [updatedDoc, ...docs];
    }

    this.saveDocuments(newDocs);
    return newDocs;
  },

  // Delete document
  deleteDocument(id: string): TranslationDocument[] {
    const docs = this.getDocuments();
    const newDocs = docs.filter((d) => d.id !== id);
    this.saveDocuments(newDocs);
    return newDocs;
  },

  // Get or generate cloud sync passkey
  getOrCreateSyncCode(): string {
    let code = localStorage.getItem(STORAGE_KEY_SYNC_CODE);
    if (!code) {
      const randomSegment = Math.random().toString(36).substring(2, 6).toUpperCase();
      const numSegment = Math.floor(1000 + Math.random() * 9000);
      code = `GEMINI-${randomSegment}-${numSegment}`;
      localStorage.setItem(STORAGE_KEY_SYNC_CODE, code);
    }
    return code;
  },

  setSyncCode(code: string): void {
    localStorage.setItem(STORAGE_KEY_SYNC_CODE, code.trim().toUpperCase());
  },

  // Push local state to cloud
  async syncToCloud(): Promise<{ success: boolean; syncCode: string; updatedAt: string }> {
    const syncCode = this.getOrCreateSyncCode();
    const docs = this.getDocuments();
    const activeId = this.getActiveDocId();

    const result = await apiService.saveCloudSync(syncCode, {
      documents: docs,
      activeId,
      version: 1,
    });

    // Mark current docs as synced
    const now = new Date().toISOString();
    const syncedDocs = docs.map((d) => ({
      ...d,
      lastSyncAt: now,
    }));
    this.saveDocuments(syncedDocs);

    return result;
  },

  // Pull remote state from cloud using sync code
  async restoreFromCloud(syncCode: string): Promise<{ success: boolean; documents: TranslationDocument[] }> {
    const result = await apiService.loadCloudSync(syncCode);
    if (result.workspaceData && Array.isArray(result.workspaceData.documents)) {
      this.saveDocuments(result.workspaceData.documents);
      if (result.workspaceData.activeId) {
        this.setActiveDocId(result.workspaceData.activeId);
      }
      this.setSyncCode(syncCode);
      return {
        success: true,
        documents: result.workspaceData.documents,
      };
    }
    throw new Error('云端数据格式不兼容');
  },

  // Filter & Search documents
  filterDocuments(
    docs: TranslationDocument[],
    query: string,
    category?: DocumentCategory | 'all',
    onlyStarred?: boolean
  ): TranslationDocument[] {
    const q = query.toLowerCase().trim();
    return docs.filter((doc) => {
      if (onlyStarred && !doc.starred) return false;
      if (category && category !== 'all' && doc.category !== category) return false;
      if (!q) return true;

      // Search in title, tags, and segments content
      const matchTitle = doc.title.toLowerCase().includes(q) || doc.fileName.toLowerCase().includes(q);
      const matchTags = doc.tags.some((t) => t.toLowerCase().includes(q));
      const matchSummary = doc.summary?.abstract?.toLowerCase().includes(q);
      const matchSegments = doc.segments.some(
        (s) => s.original.toLowerCase().includes(q) || (s.translated && s.translated.toLowerCase().includes(q))
      );

      return matchTitle || matchTags || matchSummary || matchSegments;
    });
  },

  // Theme preferences
  getTheme(): 'dark' | 'light' {
    const t = localStorage.getItem(STORAGE_KEY_THEME);
    return (t as 'dark' | 'light') || 'dark';
  },

  setTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Offline force mode simulation
  isForceOffline(): boolean {
    return localStorage.getItem(STORAGE_KEY_OFFLINE_MODE) === 'true';
  },

  setForceOffline(offline: boolean): void {
    localStorage.setItem(STORAGE_KEY_OFFLINE_MODE, offline ? 'true' : 'false');
  },

  // Custom AI API Configuration
  getCustomAiConfig(): CustomAiConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_AI);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CUSTOM_AI_CONFIG,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Failed to parse custom AI config from localStorage:', e);
    }
    return { ...DEFAULT_CUSTOM_AI_CONFIG };
  },

  saveCustomAiConfig(config: CustomAiConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_AI, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save custom AI config to localStorage:', e);
    }
  },
};
