"""Prepare BabelDOC's verified persistent font/model cache before translation."""
from babeldoc.assets.assets import warmup
from rapidocr_onnxruntime import RapidOCR

print('正在检查并缓存版面模型、字体及 OCR；已有完整文件会复用。', flush=True)
warmup()
RapidOCR(intra_op_num_threads=2, inter_op_num_threads=2)
print('版式翻译资源已准备好。', flush=True)
