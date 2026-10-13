import { TranslationDocument } from '../types';

export const exportService = {
  // Export as formatted Standalone Bilingual HTML
  exportBilingualHtml(doc: TranslationDocument) {
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(doc.title)} - 双语对照文档</title>
  <style>
    :root {
      --bg: #0e0f12;
      --card-bg: #17181c;
      --border: #2c2e36;
      --text: #e3e3e3;
      --text-muted: #9ca3af;
      --primary: #3b82f6;
      --highlight: #2563eb33;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --border: #e2e8f0;
        --text: #1e293b;
        --text-muted: #64748b;
        --primary: #2563eb;
        --highlight: #dbeafe;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 10px 0;
    }
    .meta {
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .summary-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 32px;
    }
    .summary-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--primary);
    }
    .bilingual-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .bilingual-row {
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }
    .bilingual-row:hover {
      background: rgba(59, 130, 246, 0.05);
    }
    .col-source, .col-target {
      width: 50%;
      padding: 16px;
      vertical-align: top;
    }
    .col-source {
      border-right: 1px solid var(--border);
      color: var(--text-muted);
    }
    .col-target {
      color: var(--text);
      font-weight: 500;
    }
    .type-heading {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary);
    }
    .type-title {
      font-size: 22px;
      font-weight: 800;
    }
    .term-pill {
      background: var(--highlight);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .glossary-section {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid var(--border);
    }
    .glossary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .glossary-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }
    .term-header {
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 4px;
    }
    @media print {
      body { background: white !important; color: black !important; padding: 0 !important; }
      .col-source { color: #4b5563 !important; }
      .col-target { color: #000000 !important; }
      .bilingual-row:hover { background: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${escapeHtml(doc.title)}</h1>
      <div class="meta">
        <span>原文件名: ${escapeHtml(doc.fileName)}</span>
        <span>语种方向: ${escapeHtml(doc.sourceLang)} → ${escapeHtml(doc.targetLang)}</span>
        <span>导出日期: ${new Date().toLocaleDateString('zh-CN')}</span>
        <span>分类: ${escapeHtml(doc.category)}</span>
      </div>
    </div>

    ${doc.summary ? `
    <div class="summary-box">
      <div class="summary-title">📄 AI 智能摘要速览</div>
      ${doc.summary.oneSentenceVerdict ? `<div style="font-weight: 600; color: var(--primary); margin-bottom: 8px;">【核心论点】${escapeHtml(doc.summary.oneSentenceVerdict)}</div>` : ''}
      <p style="margin: 0 0 10px 0; font-size: 14px;">${escapeHtml(doc.summary.abstract)}</p>
      ${doc.summary.keyTakeaways?.length ? `
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-muted);">
        ${doc.summary.keyTakeaways.map(k => `<li>${escapeHtml(k)}</li>`).join('')}
      </ul>` : ''}
    </div>` : ''}

    <table class="bilingual-table">
      <thead>
        <tr style="background: rgba(120, 120, 120, 0.08); font-size: 13px; text-transform: uppercase;">
          <th style="padding: 12px 16px; text-align: left; width: 50%; border-right: 1px solid var(--border);">原文 (${escapeHtml(doc.sourceLang)})</th>
          <th style="padding: 12px 16px; text-align: left; width: 50%;">译文 (${escapeHtml(doc.targetLang)})</th>
        </tr>
      </thead>
      <tbody>
        ${doc.segments.map((seg) => `
        <tr class="bilingual-row">
          <td class="col-source ${seg.type === 'heading' ? 'type-heading' : ''} ${seg.type === 'title' ? 'type-title' : ''}">
            ${escapeHtml(seg.original)}
          </td>
          <td class="col-target ${seg.type === 'heading' ? 'type-heading' : ''} ${seg.type === 'title' ? 'type-title' : ''}">
            ${escapeHtml(seg.translated || '【未翻译】')}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    ${doc.glossary && doc.glossary.length > 0 ? `
    <div class="glossary-section">
      <h3 style="margin: 0 0 8px 0;">📚 重点术语与词汇表 (${doc.glossary.length})</h3>
      <div class="glossary-grid">
        ${doc.glossary.map(g => `
        <div class="glossary-card">
          <div class="term-header">${escapeHtml(g.term)} → ${escapeHtml(g.translation)}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(g.explanation)}</div>
        </div>
        `).join('')}
      </div>
    </div>` : ''}
  </div>
</body>
</html>`;

    downloadFile(htmlContent, `${doc.title}_双语对照.html`, 'text/html;charset=utf-8');
  },

  // Export as Word-compatible document (.doc)
  exportBilingualWord(doc: TranslationDocument) {
    const wordXml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${escapeHtml(doc.title)}</title>
  <style>
    body { font-family: Calibri, 'Microsoft YaHei', sans-serif; font-size: 11pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background-color: #f2f2f2; border: 1px solid #cccccc; padding: 8px; text-align: left; }
    td { border: 1px solid #cccccc; padding: 10px; vertical-align: top; width: 50%; }
    .heading { font-weight: bold; font-size: 14pt; color: #1e3a8a; }
    .title { font-weight: bold; font-size: 18pt; text-align: center; }
    .muted { color: #555555; }
    .summary-box { background-color: #f4f6f8; border: 1px solid #d1d5db; padding: 12px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="title">${escapeHtml(doc.title)}</div>
  <p style="text-align: center; color: #777; font-size: 10pt;">
    原文件: ${escapeHtml(doc.fileName)} | 语种: ${escapeHtml(doc.sourceLang)} - ${escapeHtml(doc.targetLang)} | 导出日期: ${new Date().toLocaleDateString('zh-CN')}
  </p>

  ${doc.summary ? `
  <div class="summary-box">
    <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 5px;">📄 AI 智能文档核心摘要:</div>
    ${doc.summary.oneSentenceVerdict ? `<p style="font-weight: bold; margin: 0 0 5px 0;">【核心论点】${escapeHtml(doc.summary.oneSentenceVerdict)}</p>` : ''}
    <p style="margin: 0 0 5px 0;">${escapeHtml(doc.summary.abstract)}</p>
    ${doc.summary.keyTakeaways?.length ? `
    <ul>
      ${doc.summary.keyTakeaways.map(k => `<li>${escapeHtml(k)}</li>`).join('')}
    </ul>` : ''}
  </div>` : ''}

  <hr/>
  <table>
    <tr>
      <th style="width: 50%;">原文 (${escapeHtml(doc.sourceLang)})</th>
      <th style="width: 50%;">译文 (${escapeHtml(doc.targetLang)})</th>
    </tr>
    ${doc.segments.map(seg => `
    <tr>
      <td class="${seg.type === 'heading' || seg.type === 'title' ? 'heading' : 'muted'}">${escapeHtml(seg.original)}</td>
      <td class="${seg.type === 'heading' || seg.type === 'title' ? 'heading' : ''}">${escapeHtml(seg.translated)}</td>
    </tr>
    `).join('')}
  </table>
</body>
</html>`;

    downloadFile(wordXml, `${doc.title}_双语对照.doc`, 'application/msword;charset=utf-8');
  },

  // Export as Markdown (.md)
  exportBilingualMarkdown(doc: TranslationDocument) {
    let md = `# ${doc.title} (双语对照版)\n\n`;
    md += `> 原文件名: ${doc.fileName} | 语种: ${doc.sourceLang} → ${doc.targetLang} | 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

    if (doc.summary) {
      md += `## 📄 AI 智能核心摘要\n\n`;
      if (doc.summary.oneSentenceVerdict) {
        md += `> **核心论点**: ${doc.summary.oneSentenceVerdict}\n\n`;
      }
      md += `${doc.summary.abstract}\n\n`;
      if (doc.summary.keyTakeaways?.length) {
        md += `### 核心要点\n`;
        doc.summary.keyTakeaways.forEach(k => {
          md += `- ${k}\n`;
        });
        md += `\n`;
      }
    }

    md += `## 📑 正文双语对照\n\n`;
    md += `| 原文 (${doc.sourceLang}) | 译文 (${doc.targetLang}) |\n`;
    md += `| :--- | :--- |\n`;

    doc.segments.forEach(seg => {
      const orig = seg.original.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
      const trans = (seg.translated || '').replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
      md += `| ${orig} | ${trans} |\n`;
    });

    if (doc.glossary && doc.glossary.length > 0) {
      md += `\n## 📚 重点术语表\n\n`;
      md += `| 术语 (Term) | 译文 (Translation) | 说明与语境 (Explanation) |\n`;
      md += `| :--- | :--- | :--- |\n`;
      doc.glossary.forEach(g => {
        md += `| **${g.term}** | ${g.translation} | ${g.explanation} |\n`;
      });
    }

    downloadFile(md, `${doc.title}_双语对照.md`, 'text/markdown;charset=utf-8');
  },

  // Export glossary as CSV / JSON
  exportGlossaryCsv(doc: TranslationDocument) {
    let csv = '\uFEFF术语 (Source Term),译文 (Translation),释义与语境 (Explanation),分类 (Category)\n';
    doc.glossary.forEach(g => {
      const escapeCsv = (str: string = '') => `"${str.replace(/"/g, '""')}"`;
      csv += `${escapeCsv(g.term)},${escapeCsv(g.translation)},${escapeCsv(g.explanation)},${escapeCsv(g.category || 'general')}\n`;
    });

    downloadFile(csv, `${doc.title}_术语表.csv`, 'text/csv;charset=utf-8');
  },
};

function escapeHtml(text: string = ''): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
