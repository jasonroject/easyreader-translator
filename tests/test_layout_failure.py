"""Exercise the real BabelDOC worker against a local unavailable provider."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]

class FailureTest(unittest.TestCase):
    def test_provider_failure_is_reported_before_processing_more_paragraphs(self):
        calls = []
        class Provider(BaseHTTPRequestHandler):
            def do_POST(self):
                self.rfile.read(int(self.headers['Content-Length']))
                calls.append(1)
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Google HTTP 429'}).encode())
            def log_message(self, *_args):
                pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), Provider)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with tempfile.TemporaryDirectory() as tmp:
                folder = Path(tmp)
                shutil.copy2(ROOT / 'tests/layout-demo.pdf', folder / 'source.pdf')
                (folder / 'config.json').write_text(json.dumps({'engine': 'google', 'source': 'en', 'target': 'zh-TW', 'api_url': f'http://127.0.0.1:{server.server_port}/api/translate'}))
                with tempfile.TemporaryFile() as errors:
                    process = subprocess.Popen([sys.executable, str(ROOT / 'scripts/layout_worker.py'), tmp], cwd=ROOT, stdout=subprocess.PIPE, stderr=errors, text=True, encoding='utf-8', env={**os.environ, 'PYTHONUTF8': '1'})
                    timer = threading.Timer(120, process.kill)
                    timer.start()
                    try:
                        failure = None
                        for line in process.stdout:
                            try:
                                event = json.loads(line)
                            except ValueError:
                                continue
                            if event.get('error'):
                                failure = event['error']
                                break
                        self.assertIsNotNone(failure, 'worker must emit an actionable error')
                        self.assertIn('429', failure)
                        self.assertEqual(len(calls), 1, 'failed provider must stop immediately, not wait through every paragraph')
                    finally:
                        timer.cancel()
                        if process.poll() is None:
                            process.kill()
                        process.communicate()
        finally:
            server.shutdown()
            server.server_close()

if __name__ == '__main__':
    unittest.main()
