"""Local, synthetic benchmark; provider latency is simulated, not a Bing speed claim."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from pdf_preflight import prepare_pdf

def main():
    results = {'fixture': 'project-authored PDFs', 'provider': 'local mock, 1.5 s/request', 'layout': {}, 'ocr': {}}
    class Provider(BaseHTTPRequestHandler):
        def do_POST(self):
            payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            time.sleep(1.5)
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'translations': [{'id': item['id'], 'translated': '工程文档翻译测试。保持版式与逻辑。'} for item in payload['segments']]}).encode())
        def log_message(self, *_args): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Provider)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            for profile in ('balanced', 'fast', 'quality'):
                cache = folder / ('cache-' + profile)
                for attempt in ('first', 'cached'):
                    started = time.perf_counter()
                    prepare_pdf(ROOT / 'tests/scanned-demo.pdf', folder / 'ocr.pdf', lambda **kw: None, profile, cache)
                    results['ocr'][profile + '_' + attempt] = round(time.perf_counter() - started, 3)
            for speed in ('stable', 'balanced'):
                job = folder / speed; job.mkdir()
                shutil.copy2(ROOT / 'tests/layout-demo.pdf', job / 'source.pdf')
                (job / 'config.json').write_text(json.dumps({'engine': 'bing', 'source': 'en', 'target': 'zh-CN', 'speed': speed, 'glossary': f'benchmark-{time.time_ns()}', 'api_url': f'http://127.0.0.1:{server.server_port}/translate'}))
                started = time.perf_counter()
                run = subprocess.run([sys.executable, str(ROOT / 'scripts/layout_worker.py'), str(job)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', env={**os.environ, 'PYTHONUTF8': '1'}, timeout=120)
                if run.returncode or not (job / 'mono.pdf').is_file(): raise RuntimeError(run.stdout[-1000:] + run.stderr[-1000:])
                results['layout'][speed] = round(time.perf_counter() - started, 3)
    finally: server.shutdown(); server.server_close()
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
