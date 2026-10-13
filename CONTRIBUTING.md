# Contributing

Use Node.js 22.19+ and `npm ci`. Run `npm run lint`, `npm test` and `npm run build` before submitting a pull request. Keep changes focused and describe the observed problem, resulting behavior and validation.

For layout changes, run `npm run setup:layout` and the Python tests in `tests/test_pdf_preflight.py`. Include reproducible, self-created fixtures. Do not submit copyrighted papers, personal PDFs, credentials, environment directories or translation caches.

Report your OS, Node version, engine and a minimal reproduction in issues. Redact document content and credentials from logs. For translation providers, use mocked tests by default; live tests can incur API costs and must be explicit.

Dependency changes should update the npm lockfile or regenerate `scripts/layout-requirements.txt` with `uv pip compile --universal --python-version 3.12 scripts/layout-requirements.in -o scripts/layout-requirements.txt`.
