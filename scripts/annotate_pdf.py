"""Write user-added inline text into a separate PDF; never mutate the input."""
import json
import sys
from pathlib import Path
import pymupdf

def annotate(source, output, pages):
    with pymupdf.open(source) as pdf:
        if pdf.needs_pass:
            raise ValueError('请先解锁 PDF')
        for item in pages:
            number = item['page']
            if number < 1 or number > len(pdf):
                raise ValueError('批注页码超出 PDF 范围')
            page = pdf[number - 1]
            page.remove_rotation()
            for note in item['notes']:
                x = note['point']['x'] / 1000 * page.rect.width
                y = note['point']['y'] / 1000 * page.rect.height
                size = note.get('fontSize', 18) / 1000 * page.rect.width
                box = pymupdf.Rect(x, y, min(page.rect.width, x + page.rect.width * .30), page.rect.height)
                color = note.get('color', '#dc2626').lstrip('#')
                rgb = tuple(int(color[i:i + 2], 16) / 255 for i in (0, 2, 4))
                # Built-in CJK font supports mixed Chinese/Latin without downloads.
                available = page.insert_textbox(box, note['text'], fontsize=size, fontname='china-s', color=rgb, overlay=True, lineheight=1.4)
                if available < 0:
                    raise ValueError(f'第 {number} 页插入文字超出可用空间，请缩短文字或换一个位置。')
        pdf.save(output, garbage=3, deflate=True)

if __name__ == '__main__':
    folder = Path(sys.argv[1])
    try:
        annotate(folder / 'input.pdf', folder / 'annotated.pdf', json.loads((folder / 'notes.json').read_text(encoding='utf-8')))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
