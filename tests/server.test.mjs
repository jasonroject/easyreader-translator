import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';

test('local server serves UI, rejects foreign origins and invalid PDF input', { timeout: 30000 }, async () => {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', GEMINI_API_KEY: '', GEMINI_MODEL: '' },
    stdio: 'ignore', windowsHide: true,
  });
  const exited = once(server, 'exit');
  const base = `http://127.0.0.1:${port}`;
  try {
    let health;
    for (let n = 0; n < 80; n++) {
      try { health = await (await fetch(base + '/api/health')).json(); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.equal(health?.appId, 'easyreader-local');
    assert.equal(health.hasApiKey, false);
    assert.equal((await fetch(base + '/api/health', { headers: { Origin: 'https://example.com' } })).status, 403);
    assert.equal((await fetch(base + '/api/health', { headers: { Origin: base } })).status, 200);
    const invalid = await fetch(base + '/api/layout/jobs', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: 'not a PDF' });
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /PDF/);
  } finally {
    server.kill();
    await exited;
  }
});
