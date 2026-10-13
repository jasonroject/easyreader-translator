import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { annotationPoint, strokePath, emptyAnnotations, saveAnnotations, loadAnnotations, readAnnotations } from '../src/services/annotations.ts';

test('annotation positions stay anchored when the page is scaled or scrolled', () => {
  assert.deepEqual(annotationPoint(450, 600, { left: 0, top: 0, width: 900, height: 1200 }), { x: 500, y: 500 });
  assert.deepEqual(annotationPoint(325, 250, { left: 100, top: -50, width: 450, height: 600 }), { x: 500, y: 500 });
  assert.deepEqual(annotationPoint(-20, 1500, { left: 0, top: 0, width: 900, height: 1200 }), { x: 0, y: 1000 });
  assert.match(strokePath([{ x: 200, y: 300 }]), /l0.01,0.01$/);
});

test('rapid note edits persist the latest value, with document and page isolation', async () => {
  const first = { strokes: [{ id: 'line', color: '#ef4444', width: 3, points: [{ x: 50, y: 80 }, { x: 100, y: 80 }] }], notes: [{ id: 'note', point: { x: 50, y: 80 }, text: 'First' }] };
  const last = { ...first, notes: [{ ...first.notes[0], text: 'Final note' }] };
  const savedFirst = saveAnnotations('a:pdf:1', first);
  const savedLast = saveAnnotations('a:pdf:1', last);
  assert.deepEqual(await loadAnnotations('a:pdf:1'), last);
  await Promise.all([savedFirst, savedLast]);
  assert.deepEqual(await readAnnotations('a:pdf:1'), last);
  assert.deepEqual(await loadAnnotations('a:pdf:2'), emptyAnnotations());
  assert.deepEqual(await loadAnnotations('b:pdf:1'), emptyAnnotations());
  await saveAnnotations('a:pdf:1', emptyAnnotations());
  assert.deepEqual(await loadAnnotations('a:pdf:1'), emptyAnnotations());
});
