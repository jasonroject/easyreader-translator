// Google web translation is an unofficial, keyless channel, not Cloud Translation.
export async function translateGoogle(segments: { id: string; text: string }[], source = 'auto', target = 'zh-CN', request: typeof fetch = fetch) {
  const translations: { id: string; translated: string }[] = [];
  let detectedSourceLang = source;
  for (const segment of segments) {
    let translated = '';
    // Bound URL length and preserve Unicode code points when splitting long paragraphs.
    const chars = Array.from(segment.text);
    for (let offset = 0; offset < chars.length; offset += 1200) {
      const url = new URL('https://translate.googleapis.com/translate_a/single');
      url.search = new URLSearchParams({ client: 'gtx', sl: source, tl: target, dt: 't', q: chars.slice(offset, offset + 1200).join('') }).toString();
      const response = await request(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Google 翻译请求失败（HTTP ${response.status}），请稍后重试。`);
      const data = await response.json();
      if (!Array.isArray(data?.[0]) || !data[0].length || data[0].some((part: any) => typeof part?.[0] !== 'string')) {
        throw new Error('Google 翻译返回内容异常，请稍后重试。');
      }
      translated += data[0].map((part: any) => part[0]).join('');
      if (typeof data[2] === 'string') detectedSourceLang = data[2];
    }
    translations.push({ id: segment.id, translated });
  }
  return { success: true, translations, detectedSourceLang, glossary: [], provider: 'google', modelUsed: 'google-web' };
}
