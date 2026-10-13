import { loadAnnotations } from './annotations';
export async function exportAnnotatedPdf(url: string, total: number, keyForPage: (page: number) => string) {
  const pages = [];
  for (let page = 1; page <= total; page++) {
    const data = await loadAnnotations(keyForPage(page));
    const notes = data.notes.filter(note => note.kind === 'text' && note.text.trim());
    if (notes.length) pages.push({ page, notes });
  }
  if (!pages.length) throw new Error('请先使用“插入文字”在页面上添加内容；普通备注和画笔暂不写入 PDF。');
  const original = await fetch(url);
  if (!original.ok) throw new Error('无法读取原始 PDF');
  const blob = await original.blob();
  if (blob.size > 30 * 1024 * 1024) throw new Error('插字导出暂支持 30 MB 以内的 PDF。');
  const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
  const response = await fetch('/api/layout/annotated-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdf: base64, pages }) });
  if (!response.ok) { const result = await response.json(); throw new Error(result.error || '插字 PDF 导出失败'); }
  const output = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = output; link.download = 'easyreader-annotated.pdf'; link.click();
  setTimeout(() => URL.revokeObjectURL(output), 60000);
}
