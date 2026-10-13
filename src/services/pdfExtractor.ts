import { Segment } from '../types';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const pdfExtractor = {
  // Parse PDF file into structured segments
  async parsePdfFile(file: File): Promise<{
    title: string;
    pageCount: number;
    segments: Segment[];
    isScannedImageDoc?: boolean;
    firstPageImageBase64?: string;
  }> {
    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name.replace(/\.[^/.]+$/, '');

    // Try pdfjsLib if loaded
    if (window.pdfjsLib) {
      try {
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const pageCount = pdfDoc.numPages;
        const segments: Segment[] = [];
        let totalTextLength = 0;
        let firstPageImageBase64 = '';

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();

          // Render first page as image base64 for thumbnail/OCR preview
          if (i === 1) {
            try {
              const viewport = page.getViewport({ scale: 1.2 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport }).promise;
              firstPageImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
            } catch (err) {
              console.warn('First page canvas render failed:', err);
            }
          }

          // Extract and group text items into cohesive, readable paragraphs
          let currentParagraph = '';
          let lastY: number | null = null;
          let lastHeight = 12;
          const items = textContent.items || [];

          for (const item of items) {
            const str = (item.str || '').trim();
            if (!str) continue;

            const transform = item.transform || [];
            const currentY = typeof transform[5] === 'number' ? transform[5] : null;
            const currentHeight = item.height || 12;

            // Check if vertical Y offset indicates a true paragraph break
            const isSignificantVerticalGap =
              lastY !== null &&
              currentY !== null &&
              Math.abs(currentY - lastY) > Math.max(lastHeight, currentHeight) * 1.8;

            // Break into new paragraph if significant gap or long paragraph ending with period
            const shouldBreakParagraph =
              currentParagraph.length > 100 &&
              (isSignificantVerticalGap ||
                (currentParagraph.endsWith('.') &&
                  str.match(/^[A-Z0-9\u4e00-\u9fa5]/) &&
                  lastY !== null &&
                  currentY !== null &&
                  Math.abs(currentY - lastY) > 15));

            if (shouldBreakParagraph && currentParagraph.trim()) {
              segments.push({
                id: `seg-p${i}-${segments.length + 1}`,
                pageNumber: i,
                type: detectSegmentType(currentParagraph),
                original: currentParagraph.trim(),
                translated: '',
              });
              currentParagraph = str;
            } else {
              // Same paragraph: join with space if needed
              currentParagraph = currentParagraph ? `${currentParagraph} ${str}` : str;
            }

            lastY = currentY;
            lastHeight = currentHeight;
            totalTextLength += str.length;
          }

          if (currentParagraph.trim()) {
            segments.push({
              id: `seg-p${i}-${segments.length + 1}`,
              pageNumber: i,
              type: detectSegmentType(currentParagraph),
              original: currentParagraph.trim(),
              translated: '',
            });
          }
        }

        // If total extracted text is virtually zero (< 30 characters for multi-page doc), it is a scanned image PDF
        const isScannedImageDoc = totalTextLength === 0;

        return {
          title: fileName,
          pageCount,
          segments,
          isScannedImageDoc,
          firstPageImageBase64,
        };
      } catch (err) {
        throw new Error(`PDF 解析失败：${err instanceof Error ? err.message : String(err)}。请检查文件是否损坏或受密码保护。`);
      }
    }

    throw new Error('PDF 解析组件未就绪，请刷新页面后重新导入。');
  },

  // Read plain text / markdown
  async parseTextFile(file: File): Promise<{ title: string; segments: Segment[] }> {
    const text = await file.text();
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    const segments = this.splitTextIntoSegments(text);
    return {
      title: fileName,
      segments,
    };
  },

  // Split plain text into structured paragraphs
  splitTextIntoSegments(text: string): Segment[] {
    const rawParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
    if (rawParagraphs.length === 0) {
      throw new Error('文件中没有可读取的文字');
    }

    return rawParagraphs.map((para, idx) => ({
      id: `seg-text-${idx + 1}`,
      pageNumber: Math.floor(idx / 5) + 1,
      type: detectSegmentType(para),
      original: para,
      translated: '',
    }));
  },

  // Helper to convert image File to Base64
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async readTextOrFallback(file: File): Promise<string> {
    try {
      return await file.text();
    } catch {
      return `Document Title: ${file.name}\n\n[Auto extracted document content preview...]`;
    }
  },
};

function detectSegmentType(text: string): Segment['type'] {
  const clean = text.trim();
  if (clean.length < 50 && (/^[0-9]\./.test(clean) || /^[A-Z\s]{4,}$/.test(clean) || /^[#第]/.test(clean))) {
    return 'heading';
  }
  if (clean.length < 40 && !clean.includes('.') && !clean.includes('。')) {
    return 'title';
  }
  if (/^[•\-\*]/.test(clean)) {
    return 'bullet';
  }
  if (clean.includes('|')) {
    return 'table_row';
  }
  return 'paragraph';
}

