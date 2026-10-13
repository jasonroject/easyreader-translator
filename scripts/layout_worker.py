"""BabelDOC adapter. Progress is emitted as one JSON object per stdout line."""
import asyncio
import json
import os
import shutil
import sys
from pathlib import Path

def emit(**data):
    print(json.dumps(data, ensure_ascii=False), flush=True)

async def main():
    job_dir = Path(sys.argv[1]).resolve()
    config = json.loads((job_dir / 'config.json').read_text(encoding='utf-8'))
    from pdf_preflight import prepare_pdf, has_ocr_layer
    input_pdf = prepare_pdf(job_dir / 'source.pdf', job_dir / 'ocr.pdf', emit)
    scanned = input_pdf.name == 'ocr.pdf' or has_ocr_layer(input_pdf)
    emit(stage='正在加载版面识别模型与字体（首次使用可能需要下载）', progress=0)
    from babeldoc.translator.translator import BaseTranslator, set_translate_rate_limiter
    from babeldoc.docvision.doclayout import DocLayoutModel
    from babeldoc.format.pdf.translation_config import TranslationConfig, WatermarkOutputMode
    from babeldoc.format.pdf.high_level import async_translate
    import httpx

    class WebTranslator(BaseTranslator):
        name = 'easyreader-web-v1'
        model = config['engine']

        def __init__(self):
            super().__init__(config['source'], config['target'], False)
            self.add_cache_impact_parameters('engine', self.model)
            self.errors = []

        def do_llm_translate(self, text, rate_limit_params=None):
            raise NotImplementedError

        def do_translate(self, text, rate_limit_params=None):
            # BabelDOC catches paragraph exceptions and otherwise continues the
            # entire document. Open the circuit after the first provider failure.
            if self.errors:
                raise RuntimeError(self.errors[0])
            try:
                # Loopback must not go through the user's external proxy.
                with httpx.Client(trust_env=False, timeout=60) as client:
                    response = client.post(config['api_url'], json={
                        'segments': [{'id': 'paragraph', 'text': text}],
                        'sourceLang': config['source'], 'targetLang': config['target'],
                        'engineStyle': self.model, 'extractGlossary': False,
                    })
                    data = response.json()
                    if not response.is_success or not data.get('success'):
                        raise RuntimeError(data.get('error', '翻译接口请求失败'))
                    translated = data['translations'][0]['translated']
                    if not isinstance(translated, str) or not translated.strip():
                        raise RuntimeError('翻译接口没有返回有效译文')
                    return translated
            except Exception as exc:
                message = f"{self.model.title()} 翻译中断：{exc}。请检查网络，或切换翻译引擎后重新生成；已成功翻译的段落缓存会复用。"
                self.errors.append(message)
                # Notify the parent immediately so it can stop this worker,
                # instead of leaving the UI waiting until the final paragraph.
                emit(error=message)
                raise

    translator = WebTranslator()
    set_translate_rate_limiter(1)
    layout = DocLayoutModel.load_onnx()
    options = TranslationConfig(
        translator=translator, input_file=input_pdf,
        lang_in=config['source'], lang_out=config['target'], doc_layout_model=layout,
        output_dir=job_dir / 'output', working_dir=job_dir / 'work',
        qps=1, pool_max_workers=1, use_rich_pbar=False,
        auto_extract_glossary=False, save_auto_extracted_glossary=False,
        disable_rich_text_translate=True, watermark_output_mode=WatermarkOutputMode.NoWatermark,
        use_alternating_pages_dual=False,
        ocr_workaround=scanned,
        auto_enable_ocr_workaround=not scanned,
    )
    completed = False
    async for event in async_translate(options):
        kind = event.get('type')
        if kind == 'error':
            raise RuntimeError(str(event.get('error', '版式处理失败')))
        if kind == 'finish':
            if translator.errors:
                raise RuntimeError('部分段落翻译失败，请重试：' + translator.errors[0])
            result = event['translate_result']
            for key in ('mono', 'dual'):
                original = getattr(result, key + '_pdf_path')
                if not original or not Path(original).is_file():
                    raise RuntimeError('BabelDOC 未生成完整的 PDF 输出')
                shutil.copy2(original, job_dir / (key + '.pdf'))
            completed = True
            emit(stage='已完成', progress=100, done=True)
            break
        else:
            emit(stage=event.get('stage', '正在处理'), progress=event.get('overall_progress', 0), current=event.get('stage_current'), total=event.get('stage_total'))
    if not completed:
        raise RuntimeError('版式任务结束，但没有生成文件')

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as exc:
        emit(error=str(exc))
        sys.exit(1)
