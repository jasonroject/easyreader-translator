"""Add a local OCR text layer only to image pages without usable text."""
from pathlib import Path
import math
import pymupdf
import hashlib
import shutil
import numpy as np
from uuid import uuid4


def has_ocr_layer(source: Path):
    with pymupdf.open(source) as pdf:
        return any(page.get_images() and any(span['type'] == 3 for span in page.get_texttrace()) for page in pdf)


def prepare_pdf(source: Path, destination: Path, emit, profile='balanced', cache_dir=None):
    cache = None
    if cache_dir:
        digest = hashlib.sha256(source.read_bytes() + ('ocr-v2:' + profile).encode()).hexdigest()
        cache = Path(cache_dir) / (digest + '.pdf')
        if cache.is_file():
            try:
                with pymupdf.open(cache) as cached:
                    if not len(cached) or not any(page.get_text().strip() for page in cached):
                        raise ValueError('invalid cache')
                shutil.copy2(cache, destination)
                emit(stage='已复用本机 OCR 缓存，跳过重复识别', progress=0)
                return destination
            except Exception:
                pass  # Rebuild incomplete or unreadable cache entries.
    engine = None
    changed = False
    fonts = {}
    with pymupdf.open(source) as pdf:
        if pdf.needs_pass:
            raise RuntimeError('PDF 已加密，请先解锁再导入。')
        for page in pdf:
            if page.get_text().strip() or not page.get_images():
                continue
            if engine is None:
                emit(stage='正在加载本地 OCR（模型随依赖安装，后续直接复用）', progress=0)
                from rapidocr_onnxruntime import RapidOCR
                engine = RapidOCR(intra_op_num_threads=2, inter_op_num_threads=2)
            emit(stage=f'正在识别扫描页 {page.number + 1} / {len(pdf)}', progress=0)
            # OCR operates in displayed coordinates; normalize rotation on this copy.
            page.remove_rotation()
            scale = min({'fast': 1.7, 'balanced': 2.5, 'quality': 3.2}.get(profile, 2.5), math.sqrt(12_000_000 / max(1, page.rect.width * page.rect.height)))
            pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False, colorspace=pymupdf.csRGB)
            # RapidOCR accepts BGR arrays: avoid PNG encoding and decoding per page.
            pixels = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)[:, :, ::-1].copy()
            results, _ = engine(pixels)
            count = 0
            for box, text, score in results or []:
                if not text.strip() or score < 0.5:
                    continue
                x0 = min(p[0] for p in box) / scale
                y0 = min(p[1] for p in box) / scale
                x1 = max(p[0] for p in box) / scale
                y1 = max(p[1] for p in box) / scale
                name = 'china-s' if any(ord(c) > 255 for c in text) else 'tiro'
                if name not in fonts:
                    fonts[name] = pymupdf.Font(name)
                font = fonts[name]
                width = font.text_length(text, fontsize=1)
                height = font.ascender - font.descender
                size = min((x1 - x0) / max(width, 0.1), (y1 - y0) / max(height, 0.1))
                if size <= 0:
                    continue
                writer = pymupdf.TextWriter(page.rect)
                writer.append((x0, y0 + size * font.ascender), text, font=font, fontsize=size)
                writer.write_text(page, render_mode=3)
                count += 1
            if not count:
                raise RuntimeError(f'第 {page.number + 1} 页未识别到可翻译文字。请使用更清晰的扫描件；当前本地 OCR 主要支持中英文印刷体。')
            changed = True
        if not any(page.get_text().strip() for page in pdf):
            raise RuntimeError('PDF 中没有可翻译的文字，请检查是否为空白页或文字已转为曲线。')
        if changed:
            pdf.save(destination, garbage=3, deflate=True)
    if changed and cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        temporary = cache.with_suffix('.' + uuid4().hex + '.tmp')
        shutil.copy2(destination, temporary)
        temporary.replace(cache)
    return destination if changed else source
