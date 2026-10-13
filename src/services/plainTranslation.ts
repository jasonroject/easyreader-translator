import { SupportedLanguage } from '../types';

export async function translatePlainText(text: string, sourceLang: SupportedLanguage, targetLang: SupportedLanguage, engineStyle: 'bing' | 'google' | 'gemini-flash', signal?: AbortSignal, request: typeof fetch = fetch, options: { engineeringDomain?: string; engineeringGlossary?: string } = {}) {
  if (!text.trim()) throw new Error('请先输入需要翻译的文字。');
  if (text.length > 5000) throw new Error('每次最多翻译 5000 个字符，请分段翻译。');
  const response = await request('/api/translate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ segments: [{ id: 'plain-text', text }], sourceLang, targetLang, engineStyle, extractGlossary: false, ...options }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || '翻译失败，请检查网络或更换引擎后重试。');
  const result = data.translations?.find((item: { id: string }) => item.id === 'plain-text')?.translated;
  if (typeof result !== 'string' || !result.trim()) throw new Error('翻译服务没有返回有效译文，请重试。');
  return { text: result, ...(data.qualityWarnings?.length ? { warning: data.qualityWarnings[0].message as string } : {}), detectedLanguage: data.detectedSourceLang === 'zh-Hans' ? 'zh-CN' : data.detectedSourceLang === 'zh-Hant' ? 'zh-TW' : data.detectedSourceLang };
}
