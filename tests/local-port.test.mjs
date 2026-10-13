import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { selectPort, canListen } from '../scripts/local-port.mjs';

async function serve(handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
test('occupied port without a health API is skipped', async () => {
  const other = await serve((_req, res) => res.end('Other application'));
  try {
    const occupied = other.address().port;
    const selected = await selectPort(occupied);
    assert.ok(selected.port > occupied);
    assert.equal(selected.running, false);
    assert.equal(await canListen(selected.port), true);
    await assert.rejects(selectPort(occupied, 1), /端口/);
  } finally { await close(other); }
});
test('existing EasyReader instance is reused', async () => {
  const app = await serve((_req, res) => res.end(JSON.stringify({ appId: 'easyreader-local' })));
  try { assert.deepEqual(await selectPort(app.address().port), { port: app.address().port, running: true }); }
  finally { await close(app); }
});
