import test from 'node:test';
import assert from 'node:assert/strict';
import { translatePlainText } from '../src/services/plainTranslation.ts';

const reply = data => async () => new Response(JSON.stringify(data));

test('plain translator preserves paragraphs, provider and cancellation signal', async () => {
  const controller = new AbortController();
  const result = await translatePlainText('Hello\nWorld', 'auto', 'zh-CN', 'bing', controller.signal, async (url, options) => {
    assert.equal(url, '/api/translate');
    assert.equal(options.signal, controller.signal);
    assert.deepEqual(JSON.parse(options.body), { segments: [{ id: 'plain-text', text: 'Hello\nWorld' }], sourceLang: 'auto', targetLang: 'zh-CN', engineStyle: 'bing', extractGlossary: false });
    return new Response(JSON.stringify({ success: true, translations: [{ id: 'plain-text', translated: '你好\n世界' }], detectedSourceLang: 'zh-Hans' }));
  });
  assert.deepEqual(result, { text: '你好\n世界', detectedLanguage: 'zh-CN' });
});

test('invalid input never sends a request', async () => {
  const never = async () => assert.fail('must not send invalid input');
  for (const input of ['  \n ', 'a'.repeat(5001)]) {
    await assert.rejects(translatePlainText(input, 'en', 'zh-CN', 'google', undefined, never));
  }
});

test('failed or missing translations are not shown as successful output', async () => {
  for (const data of [
    { success: false, error: '服务暂不可用', translations: [{ id: 'plain-text', translated: 'offline fallback' }] },
    { success: true, translations: [{ id: 'another-document', translated: 'unrelated text' }] },
    { success: true, translations: [{ id: 'plain-text', translated: '  ' }] },
  ]) await assert.rejects(translatePlainText('Hello', 'en', 'zh-CN', 'bing', undefined, reply(data)));
});

test('network cancellation reaches the caller', async () => {
  await assert.rejects(translatePlainText('Hello', 'en', 'zh-CN', 'bing', undefined, async () => {
    throw new DOMException('Aborted', 'AbortError');
  }), { name: 'AbortError' });
});
