import test from 'node:test';
import assert from 'node:assert/strict';
import { translateGoogle } from '../googleTranslate.ts';
import { pythonPath, supportedNode } from '../scripts/runtime.mjs';

test('Google chunks preserve Unicode and segment identity', async () => {
  const input = '📖'.repeat(1201);
  const sent = [];
  const result = await translateGoogle([{ id: 'one', text: input }], 'auto', 'zh-CN', async url => {
    const text = url.searchParams.get('q');
    sent.push(text);
    return new Response(JSON.stringify([[[text]], null, 'en']));
  });
  assert.equal(sent.length, 2);
  assert.equal(sent.join(''), input);
  assert.deepEqual(result.translations, [{ id: 'one', translated: input }]);
});
test('Google rate limits and malformed results are errors, not translations', async () => {
  const input = [{ id: 'one', text: 'Hello' }];
  await assert.rejects(translateGoogle(input, 'auto', 'zh-CN', async () => new Response('', { status: 429 })), /429/);
  await assert.rejects(translateGoogle(input, 'auto', 'zh-CN', async () => new Response('{}')), /异常/);
});
test('runtime handles supported Node versions and platform Python locations', () => {
  assert.equal(supportedNode('22.18.0'), false);
  assert.equal(supportedNode('22.19.0'), true);
  assert.equal(supportedNode('24.0.0'), true);
  assert.match(pythonPath('/project', 'win32'), /Scripts[\\/]python.exe$/);
  assert.match(pythonPath('/project', 'linux'), /bin[\\/]python$/);
});
