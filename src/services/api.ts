import { Segment, GlossaryTerm, DocumentSummary, DocumentCategory, SupportedLanguage, CustomAiConfig } from '../types';

export interface TranslateApiResponse {
  success: boolean;
  detectedSourceLang?: string;
  translations: { id: string; translated: string }[];
  glossary?: GlossaryTerm[];
  error?: string;
  provider?: string;
  modelUsed?: string;
}

export interface OcrApiResponse {
  success: boolean;
  result?: {
    documentTitle: string;
    detectedLanguage: string;
    confidenceScore: number;
    paragraphs: {
      id: string;
      type: 'heading' | 'paragraph' | 'table_row' | 'bullet';
      originalText: string;
      translatedText: string;
    }[];
    detectedTerms?: {
      term: string;
      translation: string;
      explanation: string;
    }[];
  };
  error?: string;
}

export const apiService = {
  // Check backend server health
  async checkHealth(): Promise<{ status: string; hasApiKey: boolean; model: string }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check non-200');
      return await res.json();
    } catch {
      return { status: 'offline', hasApiKey: false, model: 'local' };
    }
  },

  // Translate document segments
  async translateSegments(params: {
    segments: { id: string; text: string }[];
    sourceLang?: SupportedLanguage;
    targetLang?: SupportedLanguage;
    engineStyle?: string;
    extractGlossary?: boolean;
    customContext?: string;
    customAiConfig?: CustomAiConfig;
  }): Promise<TranslateApiResponse> {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.warn('Translate API call failed, falling back:', err);
      // Fallback response for offline or error conditions
      const fallbackTranslations = params.segments.map((seg) => ({
        id: seg.id,
        translated: `[离线翻译对照] ${seg.text}`,
      }));
      return {
        success: false,
        error: err.message || '网络连接中断或服务异常',
        translations: fallbackTranslations,
        glossary: [],
      };
    }
  },

  // Test custom AI model connectivity
  async testCustomAi(params: {
    endpoint: string;
    apiKey?: string;
    model?: string;
  }): Promise<{ success: boolean; latencyMs?: number; reply?: string; error?: string }> {
    try {
      const response = await fetch('/api/custom-ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '网络请求无法发出',
      };
    }
  },

  // Process OCR for scanned image or PDF screenshot
  async processOcr(params: {
    imageBase64: string;
    mimeType?: string;
    targetLang?: SupportedLanguage;
  }): Promise<OcrApiResponse> {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `OCR error ${response.status}`);
    }

    return await response.json();
  },

  // Generate document executive summary
  async generateSummary(params: {
    text: string;
    targetLang?: SupportedLanguage;
    title?: string;
    customAiConfig?: any;
  }): Promise<{ success: boolean; summary?: DocumentSummary; error?: string; provider?: string }> {
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `摘要请求失败 (${response.status})`);
      }

      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        error: err.message,

      };
    }
  },

  // Auto classify & categorize documents in batch
  async autoArchive(documents: { id: string; title: string; previewText: string }[]): Promise<{
    success: boolean;
    categorized: { id: string; category: DocumentCategory; tags: string[]; suggestedFolder?: string }[];
  }> {
    try {
      const response = await fetch('/api/auto-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      });

      if (!response.ok) throw new Error('Auto archive failed');
      return await response.json();
    } catch {
      return {
        success: false,
        categorized: documents.map((d) => ({
          id: d.id,
          category: '通用资讯',
          tags: ['文档', '待分类'],
        })),
      };
    }
  },

  // Cloud sync save
  async saveCloudSync(syncCode: string, workspaceData: any): Promise<{ success: boolean; syncCode: string; updatedAt: string }> {
    const response = await fetch('/api/sync/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncCode, workspaceData }),
    });

    if (!response.ok) {
      throw new Error(`Cloud sync save failed: ${response.status}`);
    }

    return await response.json();
  },

  // Cloud sync load
  async loadCloudSync(syncCode: string): Promise<{ success: boolean; syncCode: string; updatedAt: string; workspaceData: any }> {
    const response = await fetch(`/api/sync/load/${encodeURIComponent(syncCode)}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || '未找到该云端同步凭证');
    }

    return await response.json();
  },
};
