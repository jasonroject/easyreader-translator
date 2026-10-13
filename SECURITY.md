# Security

EasyReader is a local single-user application. It binds to loopback and validates request hosts and browser origins. It is not designed as a public multi-user service; do not reverse-proxy it onto the public internet without authentication and additional isolation.

Never post keys, private documents, browser storage exports or unredacted translation logs in issues. If GitHub private vulnerability reporting is available, use the repository's Security tab. Otherwise report only a non-sensitive description and request a private reporting channel before disclosing exploit details.

Before sharing a folder, exclude `.env*`, `node_modules`, `.babeldoc-venv`, `.layout-jobs`, logs and local caches. Translation providers receive the content sent to them; local storage is not encrypted by this application.
