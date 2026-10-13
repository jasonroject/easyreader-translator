# EasyReader Translator

A local bilingual PDF reader. Bing web translation is the default; Google, Gemini and custom AI endpoints are optional. Includes a BabelDOC layout-preserving module and local OCR for image-only pages.

## Run

Install Node.js 22.19+ (24 recommended), download and extract the source, then double-click `start.cmd` on Windows or run `sh start.sh` on macOS/Linux. Alternatively run `npm ci` followed by `npm start`. Keep the terminal open. The app listens on `http://127.0.0.1:3000`; opening `index.html` directly does not work.

For PDF layout translation, install [uv](https://docs.astral.sh/uv/getting-started/installation/) and run `npm run setup:layout`. This prepares Python 3.12, pinned dependencies, layout models, fonts, CMaps and local OCR. Existing cached resources are reused. Translation itself still requires network access. Current local OCR mainly supports printed Chinese and English.

Import a PDF, then use the bottom-right translation button. For downloadable translated/bilingual PDFs, open the layout module. Inspect complex layouts and OCR output for errors.

Use the source annotation button above the reader to add pinned notes or draw on original PDF/text pages. Includes color, pen width, stroke eraser and per-page undo/redo. Notes and strokes are automatically saved in browser IndexedDB and restored after reload. Annotations currently stay in the local reader; they are not embedded in PDF/HTML exports or included in temporary sync.

Copy `.env.example` to `.env.local` for port/proxy settings. Gemini requires both an API key and a model available to your account. Bing/Google web channels require no key but are unofficial and may be rate-limited or unavailable.

## Privacy and portability

Documents live in browser storage. PDF layout inputs, intermediate files and outputs live in `.layout-jobs/`. BabelDOC resources and translation cache live under `~/.cache/babeldoc/`; translated text may be cached there. Text is sent to the selected provider; local OCR does not upload page images. Gemini image OCR does send images. Custom AI keys are stored in the browser.

The inherited sync feature uses temporary server memory, not a persistent cloud backup. Do not expose this local, unauthenticated service to the internet.

On another computer, download the source and install dependencies again. Do not copy `node_modules` or `.babeldoc-venv`. Windows has been locally tested; macOS/Linux scripts and CI are provided, but full end-to-end platform validation is still pending.

Run `npm run lint`, `npm test`, and `npm run build` for development checks. After layout setup, run `tests/test_pdf_preflight.py` using the virtual environment's Python.

Licensed under AGPL-3.0-only with preserved third-party notices. See [Chinese documentation](../README.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).
