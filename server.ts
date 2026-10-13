import { validateTranslations, numericWarnings } from './translationValidation';
import { protectEngineeringTerms, engineeringInstruction } from './src/services/engineeringDomains';
import './config';
import { layoutRoutes } from './layoutRoutes';
import './network';
import { translateGoogle } from './googleTranslate';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// The service is intended for local use, including its translation proxy.
app.use((req, res, next) => {
  const hosts = new Set(['127.0.0.1', 'localhost']);
  if (!hosts.has(req.hostname)) return res.status(403).json({ error: 'Local access only' });
  const origin = req.get('Origin');
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'http:' || !hosts.has(parsed.hostname) || (parsed.port || '80') !== String(PORT)) return res.status(403).json({ error: 'Origin not allowed' });
    } catch { return res.status(403).json({ error: 'Origin not allowed' }); }
  }
  next();
});

// Middleware for parsing json and urlencoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || '';
let ai: GoogleGenAI | null = null;

if (apiKey && geminiModel) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('GEMINI_API_KEY not found in environment. Bing and Google translation are available; Gemini AI features require a key.');
}

// In-memory cloud sync storage for cross-platform session sharing
const cloudStorage = new Map<string, {
  updatedAt: string;
  data: any;
}>();

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appId: 'easyreader-local',
    hasApiKey: !!ai,
    model: geminiModel,
    supportedEngines: ['google', 'gemini-flash', 'academic', 'business', 'literary', 'bing', 'custom-ai'],
  });
});

// Helper for Bing language code mapping
function mapToBingLang(lang: string): string {
  switch (lang) {
    case 'zh-CN': return 'zh-Hans';
    case 'zh-TW': return 'zh-Hant';
    case 'en': return 'en';
    case 'ja': return 'ja';
    case 'ko': return 'ko';
    case 'fr': return 'fr';
    case 'de': return 'de';
    case 'es': return 'es';
    case 'ru': return 'ru';
    case 'it': return 'it';
    case 'pt': return 'pt';
    case 'ar': return 'ar';
    default: return lang === 'auto' ? '' : lang;
  }
}

// Custom AI API connectivity test endpoint
app.post('/api/custom-ai/test', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { endpoint, apiKey, model } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, error: '接口地址 (Endpoint) 不能为空' });
    }

    let rawEndpoint = endpoint.trim().replace(/\/+$/, '');
    if (!rawEndpoint.endsWith('/chat/completions')) {
      if (!rawEndpoint.endsWith('/v1')) {
        rawEndpoint = `${rawEndpoint}/v1`;
      }
      rawEndpoint = `${rawEndpoint}/chat/completions`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const targetModel = model && model.trim() ? model.trim() : 'deepseek-chat';

    const testRes = await fetch(rawEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: 'You are a translation assistant.' },
          { role: 'user', content: 'Hello! Respond with: "API Connected Successfully".' },
        ],
        max_tokens: 30,
        temperature: 0.2,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (!testRes.ok) {
      const errText = await testRes.text().catch(() => '');
      return res.json({
        success: false,
        latencyMs,
        error: `HTTP ${testRes.status}: ${errText.slice(0, 200)}`,
      });
    }

    const resJson: any = await testRes.json();
    const reply = resJson?.choices?.[0]?.message?.content || 'OK';

    res.json({
      success: true,
      latencyMs,
      reply: reply.trim(),
      model: targetModel,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    res.json({
      success: false,
      latencyMs,
      error: error.message || '网络连接超时或无法解析该地址',
    });
  }
});

// Translation endpoint
app.post('/api/translate', async (req: Request, res: Response) => {
  try {
    const {
      segments, // array of { id: string, text: string }
      sourceLang = 'auto',
      targetLang = 'zh-CN',
      engineStyle = 'bing', // 'gemini-flash' | 'academic' | 'business' | 'literary' | 'bing' | 'custom-ai'
      extractGlossary = true,
      customContext = '',
      customAiConfig,
      engineeringDomain = 'general', engineeringGlossary = '',
    } = req.body;

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'Segments array is required' });
    }

    if (segments.length > 100 || segments.some((s: any) => typeof s?.id !== 'string' || typeof s?.text !== 'string' || s.text.length > 100000)) {
      return res.status(400).json({ error: '段落格式错误或单次请求过大' });
    }
    if (typeof engineeringDomain !== 'string' || typeof engineeringGlossary !== 'string' || engineeringGlossary.length > 2000) return res.status(400).json({ error: '工程术语配置格式错误' });
    const engineering = protectEngineeringTerms(segments, sourceLang, targetLang, engineeringDomain, engineeringGlossary);
    const domainInstruction = engineeringInstruction(engineeringDomain, engineeringGlossary);
    if (engineStyle === 'google') {
      try { const result = await translateGoogle(engineering.segments, sourceLang, targetLang); result.translations = result.translations.map(item => ({ ...item, translated: engineering.restore(item.id, item.translated) })); return res.json({ ...result, qualityWarnings: engineeringDomain === 'general' ? [] : numericWarnings(segments, result.translations) }); }
      catch (error: any) { return res.status(502).json({ error: error.name === 'TimeoutError' || error.message === 'fetch failed' ? '无法连接 Google 翻译，请检查本机访问 Google 的网络或代理设置。' : error.message }); }
    }
    // Branch 1: Bing 微软官方免费翻译引擎
    if (engineStyle === 'bing') {
      try {
        const fromParam = sourceLang && sourceLang !== 'auto' ? mapToBingLang(sourceLang) : '';
        const toParam = mapToBingLang(targetLang) || 'zh-Hans';
        const url = `https://edge.microsoft.com/translate/translatetext?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&isEnterpriseClient=false`;

        const textArray = engineering.segments.map((s) => s.text);
        const bingRes = await fetch(url, {
          signal: AbortSignal.timeout(20000),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
          },
          body: JSON.stringify(textArray),
        });

        if (!bingRes.ok) {
          const errText = await bingRes.text().catch(() => '');
          throw new Error(`Bing 免费翻译请求失败 (${bingRes.status}): ${errText.slice(0, 100)}`);
        }

        const bingData: any = await bingRes.json();
        if (!Array.isArray(bingData) || bingData.length !== segments.length || bingData.some((item: any) => typeof item?.translations?.[0]?.text !== 'string')) throw new Error('Bing 翻译返回内容不完整，请重试');
        const detectedLang = bingData[0]?.detectedLanguage?.language || (sourceLang === 'auto' ? 'en' : sourceLang);
        const translations = segments.map((s, idx) => ({
          id: s.id,
          translated: engineering.restore(s.id, bingData[idx]?.translations?.[0]?.text || s.text),
        }));

        return res.json({
          success: true,
          detectedSourceLang: detectedLang,
          translations,
          glossary: [],
          provider: 'bing',
          qualityWarnings: engineeringDomain === 'general' ? [] : numericWarnings(segments, translations),
        });
      } catch (bingError: any) {
        console.error('Bing translation error:', bingError);
        return res.status(500).json({
          error: bingError.message?.includes('术语标记') ? bingError.message : 'Bing 免费翻译调用失败',
          details: bingError.message || String(bingError),
        });
      }
    }

    // Branch 2: 自定义 AI 翻译模型 (兼容 OpenAI 接口规范，如 DeepSeek、Ollama、Qwen、Kimi、Claude 代理等)
    if (engineStyle === 'custom-ai') {
      try {
        if (!customAiConfig || !customAiConfig.endpoint) {
          return res.status(400).json({
            error: '请在引擎设置中填写自定义 AI 模型的 API 接口地址 (Base URL)',
          });
        }

        let rawEndpoint = customAiConfig.endpoint.trim().replace(/\/+$/, '');
        if (!rawEndpoint.endsWith('/chat/completions')) {
          if (!rawEndpoint.endsWith('/v1')) {
            rawEndpoint = `${rawEndpoint}/v1`;
          }
          rawEndpoint = `${rawEndpoint}/chat/completions`;
        }

        const apiKey = customAiConfig.apiKey ? customAiConfig.apiKey.trim() : '';
        const model = customAiConfig.model && customAiConfig.model.trim() ? customAiConfig.model.trim() : 'deepseek-chat';
        const temperature = typeof customAiConfig.temperature === 'number' ? customAiConfig.temperature : 0.3;

        const systemPrompt = customAiConfig.systemPrompt ||
          '你是一名专业级多语言文献翻译专家。请准确、忠实地将提供的文本段落翻译为目标语言，保持学术与专业用词的规范性，并提取核心领域术语。必须严格返回格式合规的纯 JSON。';

        const userPrompt = `Translate the following segments from ${sourceLang === 'auto' ? 'the detected source language' : sourceLang} to ${targetLang}.
Context: ${customContext || 'General professional document'}.

Input Segments:
${JSON.stringify(segments)}

Return strict JSON only (no markdown code blocks, raw JSON):
{
  "detectedSourceLang": "string",
  "translations": [
    {
      "id": "segment id matching input",
      "translated": "translated text"
    }
  ],
  "glossary": [
    {
      "term": "source term",
      "translation": "target translation",
      "explanation": "concise explanation",
      "category": "technical | academic | business | general"
    }
  ]
}`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const customAiRes = await fetch(rawEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt + domainInstruction },
              { role: 'user', content: userPrompt },
            ],
            temperature,
          }),
        });

        if (!customAiRes.ok) {
          const errBody = await customAiRes.text().catch(() => '');
          throw new Error(`自定义 AI 接口返回错误 (${customAiRes.status}): ${errBody.slice(0, 200)}`);
        }

        const aiData: any = await customAiRes.json();
        const content = aiData?.choices?.[0]?.message?.content || '{}';

        // Parse JSON from content (strip markdown if present)
        let parsedData: any;
        try {
          const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleaned);
        } catch {
          throw new Error('AI 返回的内容不是有效 JSON，请重试或检查模型。');
        }
        validateTranslations(segments, parsedData.translations);

        return res.json({
          success: true,
          detectedSourceLang: parsedData.detectedSourceLang || sourceLang,
          translations: parsedData.translations || [],
          glossary: parsedData.glossary || [],
          provider: 'custom-ai',
          qualityWarnings: engineeringDomain === 'general' ? [] : numericWarnings(segments, parsedData.translations),
          modelUsed: model,
        });
      } catch (customErr: any) {
        console.error('Custom AI translation error:', customErr);
        return res.status(500).json({
          error: '自定义 AI 模型翻译失败',
          details: customErr.message || String(customErr),
        });
      }
    }

    // Branch 3: Gemini 官方大模型引擎
    if (!ai) return res.status(400).json({ error: '尚未配置 Gemini 密钥，请选择 Bing 或 Google 翻译。' });

    // Prepare system instruction based on selected engine style
    let styleInstruction = 'You are a world-class professional document translation engine.';
    if (engineStyle === 'academic') {
      styleInstruction += ' Tone: Rigorous academic and scientific research style. Maintain standard domain nomenclature, technical definitions, and precise terminological consistency.';
    } else if (engineStyle === 'business') {
      styleInstruction += ' Tone: Professional, polished corporate and executive style, suitable for contracts, business reports, and formal documentation.';
    } else if (engineStyle === 'literary') {
      styleInstruction += ' Tone: Fluid, natural, idiomatic, and culturally adapted translation that reads like a native author.';
    } else {
      styleInstruction += ' Tone: Clear, accurate, fluent, and faithful to original layout and semantic meaning.';
    }

    const promptText = `
Translate the following segments from ${sourceLang === 'auto' ? 'the detected source language' : sourceLang} to ${targetLang}.
Context information: ${customContext || 'General professional document'}.

Segments to translate (JSON array):
${JSON.stringify(segments)}

Return strict JSON format with this exact structure:
{
  "detectedSourceLang": "string (e.g. en, zh, ja)",
  "translations": [
    {
      "id": "segment id matching input",
      "translated": "translated text corresponding accurately to input segment"
    }
  ],
  "glossary": [
    {
      "term": "key domain term or jargon in source language",
      "translation": "accurate target translation",
      "explanation": "brief concise explanation or domain context in target language",
      "category": "technical | academic | business | general"
    }
  ]
}
Extract 3 to 8 high-value core domain terms in "glossary" if extractGlossary is requested.
Do not output markdown code blocks (e.g. \`\`\`json). Output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: promptText,
      config: {
        systemInstruction: styleInstruction + domainInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Clean possible wrapper markdown if any
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    validateTranslations(segments, parsedData.translations);
    res.json({
      success: true,
      detectedSourceLang: parsedData.detectedSourceLang || 'en',
      qualityWarnings: engineeringDomain === 'general' ? [] : numericWarnings(segments, parsedData.translations),
      translations: parsedData.translations || [],
      glossary: parsedData.glossary || [],
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: 'Translation failed',
      details: error.message || String(error),
    });
  }
});

// OCR endpoint for scanned documents and images
app.post('/api/ocr', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/png', targetLang = 'zh-CN' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured on server' });
    }

    // Strip data:image/...;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const ocrPrompt = `
You are an expert Document OCR & Layout Analysis engine.
Extract ALL printed and handwritten text accurately from this document image.
Preserve the natural paragraph breaks, titles, lists, tables, and document hierarchy.
Also provide a preliminary professional translation into ${targetLang}.

Return pure JSON matching this schema:
{
  "documentTitle": "inferred or detected document title",
  "detectedLanguage": "source language e.g. en, zh, ja, etc.",
  "confidenceScore": 0.98,
  "paragraphs": [
    {
      "id": "p1",
      "type": "heading | paragraph | table_row | bullet",
      "originalText": "exact extracted text",
      "translatedText": "translation in ${targetLang}"
    }
  ],
  "detectedTerms": [
    {
      "term": "technical or domain keyword",
      "translation": "translated term",
      "explanation": "concise meaning"
    }
  ]
}
Output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType as string,
              data: cleanBase64,
            },
          },
          {
            text: ocrPrompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('OCR error:', error);
    res.status(500).json({
      error: 'OCR processing failed',
      details: error.message || String(error),
    });
  }
});

// Smart Document Executive Summary endpoint
app.post('/api/summary', async (req: Request, res: Response) => {
  try {
    const { text, targetLang = 'zh-CN', title = 'Document', customAiConfig } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const summaryPrompt = `
Analyze the following document titled "${title}".
Provide a high-fidelity executive bilingual summary tailored for fast comprehension.
Target language for explanation: ${targetLang}.

Document excerpt / content:
${text.slice(0, 15000)}

Return pure JSON with this structure:
{
  "oneSentenceVerdict": "Single punchy sentence summarizing the core takeaway/thesis of the document (15-30 words)",
  "abstract": "concise 2-3 sentence executive abstract summarizing core message and purpose in ${targetLang}",
  "sourceAbstract": "brief 1-2 sentence executive summary in the document's original source language",
  "keyTakeaways": [
    "3 to 5 clear bullet points highlighting pivotal findings, terms, clauses, or arguments"
  ],
  "actionItems": [
    "1 to 3 key conclusions, practical actions, or implications"
  ],
  "category": "学术科研 | 商务法务 | 技术手册 | 金融研报 | 医药科技 | 通用资讯",
  "keywords": ["5-8 key domain keywords"],
  "readingTimeMinutes": 5,
  "difficulty": "入门 | 中等 | 专业级 | 高精尖",
  "targetAudience": "e.g. 研发工程师, 法律顾问, 企业高管, 科研学者"
}
Output raw JSON only.
`;

    // 优先使用自定义 AI 配置
    if (customAiConfig && customAiConfig.endpoint) {
      try {
        let rawEndpoint = customAiConfig.endpoint.trim().replace(/\/+$/, '');
        if (!rawEndpoint.endsWith('/chat/completions')) {
          if (!rawEndpoint.endsWith('/v1')) {
            rawEndpoint = `${rawEndpoint}/v1`;
          }
          rawEndpoint = `${rawEndpoint}/chat/completions`;
        }

        const apiKey = customAiConfig.apiKey ? customAiConfig.apiKey.trim() : '';
        const model = customAiConfig.model && customAiConfig.model.trim() ? customAiConfig.model.trim() : 'gpt-4';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const customAiRes = await fetch(rawEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: '你是一名专业的文档分析专家,擅长提炼核心摘要与关键信息。' },
              { role: 'user', content: summaryPrompt },
            ],
            temperature: 0.3,
          }),
        });

        if (!customAiRes.ok) {
          const errText = await customAiRes.text().catch(() => '');
          throw new Error(`自定义 AI 摘要请求失败 (${customAiRes.status}): ${errText.slice(0, 200)}`);
        }

        const customAiData: any = await customAiRes.json();
        const content = customAiData?.choices?.[0]?.message?.content;
        if (!content) throw new Error('自定义 AI 未返回有效摘要内容');

        let summary;
        try {
          summary = JSON.parse(content);
        } catch {
          const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
          summary = JSON.parse(cleaned);
        }

        return res.json({ success: true, summary, provider: 'custom-ai' });
      } catch (customError: any) {
        console.error('Custom AI summary error:', customError);
        // 自定义 AI 失败时回退到 Gemini (如果可用)
        if (!ai) {
          return res.status(500).json({
            error: '自定义 AI 摘要失败，且未配置 Gemini 备用密钥',
            details: customError.message || String(customError),
          });
        }
        console.log('Falling back to Gemini...');
      }
    }

    // 回退到 Gemini
    if (!ai) return res.status(400).json({ error: 'AI 摘要需要配置 Gemini 密钥或自定义 AI 接口。' });

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: summaryPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let summary;
    try {
      summary = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      summary = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      summary,
      provider: 'gemini',
    });
  } catch (error: any) {
    console.error('Summary error:', error);
    res.status(500).json({
      error: 'Summary generation failed',
      details: error.message || String(error),
    });
  }
});

// Auto-archive & Document Classification endpoint
app.post('/api/auto-archive', async (req: Request, res: Response) => {
  try {
    const { documents } = req.body; // array of { id, title, previewText }
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'documents array required' });
    }

    if (!ai) {
      const categorized = documents.map((d) => ({
        id: d.id,
        category: '综合文档',
        tags: ['通用', '待分类'],
      }));
      return res.json({ success: true, categorized });
    }

    const archivePrompt = `
Analyze each document's title and sample text. Assign an automated category and relevant tags for archiving.
Categories must be one of: "学术科研", "商务法务", "技术手册", "金融研报", "通用资讯", "产品规范".

Documents:
${JSON.stringify(documents.slice(0, 20))}

Return JSON:
{
  "categorized": [
    {
      "id": "doc id matching input",
      "category": "one of the standard categories",
      "tags": ["2-3 concise tags"],
      "suggestedFolder": "e.g. 2026_Papers, Contracts, TechSpecs"
    }
  ]
}
Output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: archivePrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      categorized: data.categorized || [],
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Auto archive failed', details: String(error) });
  }
});

// Cloud Sync endpoints for seamless multi-device work
app.post('/api/sync/save', (req: Request, res: Response) => {
  try {
    const { syncCode, workspaceData } = req.body;
    if (!syncCode || !workspaceData) {
      return res.status(400).json({ error: 'syncCode and workspaceData are required' });
    }

    cloudStorage.set(syncCode, {
      updatedAt: new Date().toISOString(),
      data: workspaceData,
    });

    res.json({
      success: true,
      syncCode,
      updatedAt: new Date().toISOString(),
      itemsCount: workspaceData.documents ? workspaceData.documents.length : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Cloud sync save failed', details: err.message });
  }
});

app.get('/api/sync/load/:syncCode', (req: Request, res: Response) => {
  try {
    const syncCode = req.params.syncCode;
    const record = cloudStorage.get(syncCode);

    if (!record) {
      return res.status(404).json({
        error: 'Sync code not found or expired',
      });
    }

    res.json({
      success: true,
      syncCode,
      updatedAt: record.updatedAt,
      workspaceData: record.data,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Cloud sync load failed', details: err.message });
  }
});

app.use('/api/layout', layoutRoutes);

// Mount Vite middleware in development or serve static in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`EasyReader Translator Server running on http://127.0.0.1:${PORT}`);
});
