export function validateTranslations(input: { id: string }[], output: unknown): asserts output is { id: string; translated: string }[] {
  if (!Array.isArray(output) || output.length !== input.length) throw new Error('AI 返回的译文段落不完整，请重试。');
  const ids = new Set(input.map(item => item.id));
  for (const item of output) {
    if (!item || !ids.delete(item.id) || typeof item.translated !== 'string' || !item.translated.trim()) throw new Error('AI 返回的段落编号或译文内容异常，请重试。');
  }
}

export function numericWarnings(input: { id: string; text: string }[], output: { id: string; translated: string }[]) {
  const numbers = (text: string) => (text.replace(/−/g, '-').replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, '').match(/[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || []).map(value => String(Number(value))).sort().join('|');
  const source = new Map(input.map(item => [item.id, item.text]));
  return output.filter(item => source.has(item.id) && numbers(source.get(item.id)!) !== numbers(item.translated)).map(item => ({ id: item.id, message: '原文与译文的数值或编号不一致，请人工核对公式、单位和引用。' }));
}
