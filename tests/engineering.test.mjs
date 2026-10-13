import test from 'node:test';
import assert from 'node:assert/strict';
import { engineeringTerms, protectEngineeringTerms, engineeringInstruction } from '../src/services/engineeringDomains.ts';
import { validateTranslations, numericWarnings } from '../translationValidation.ts';
test('engineering review flags changed values without rejecting legitimate unit wording', () => {
  const source = [{ id: 'a', text: 'Pressure must not exceed 10 MPa.' }];
  assert.equal(numericWarnings(source, [{ id: 'a', translated: '压力不得超过 10 兆帕。' }]).length, 0);
  assert.equal(numericWarnings(source, [{ id: 'a', translated: '压力不得超过 100 MPa。' }]).length, 1);
});
test('AI missing, duplicate or empty paragraph results are rejected', () => {
  for (const output of [[], [{ id: 'a', translated: '' }], [{ id: 'b', translated: 'wrong id' }]]) assert.throws(() => validateTranslations([{ id: 'a' }], output));
  assert.throws(() => validateTranslations([{ id: 'a' }, { id: 'b' }], [{ id: 'a', translated: 'one' }, { id: 'a', translated: 'two' }]));
  validateTranslations([{ id: 'a' }], [{ id: 'a', translated: '正确译文' }]);
});
test('domain terms preserve longest match, numbers, units and identifier boundaries', () => {
  const input = 'shear stress = 10 MPa; stress_tensor must not change.';
  const prepared = protectEngineeringTerms([{ id: 'p', text: input }], 'en', 'zh-CN', 'mechanical');
  assert.match(prepared.segments[0].text, /10 MPa; stress_tensor must not change/);
  assert.equal(prepared.restore('p', prepared.segments[0].text), '剪切应力 = 10 MPa; stress_tensor must not change.');
  assert.throws(() => prepared.restore('p', 'missing term'), /未保留/);
});
test('user terms override domain entries without leaking into other target languages', () => {
  assert.equal(engineeringTerms('mechanical', 'stress=测试应力').stress, '测试应力');
  const prepared = protectEngineeringTerms([{ id: 'p', text: 'stress' }], 'en', 'ja', 'mechanical');
  assert.equal(prepared.segments[0].text, 'stress');
  assert.match(engineeringInstruction('electrical'), /negation, causality/);
});
