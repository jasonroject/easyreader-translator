import test from 'node:test';
import assert from 'node:assert/strict';
import { remainingStrokes } from '../src/services/eraser.ts';

const line = { id: 'line', color: '#ff0000', width: 3, points: [{ x: 100, y: 500 }, { x: 900, y: 500 }] };
test('a drag that starts outside a stroke erases it when crossing between samples', () => {
  assert.deepEqual(remainingStrokes([line], { x: 500, y: 300 }, { x: 500, y: 700 }, { width: 1000, height: 1000 }), []);
});
test('eraser hit radius is in screen pixels across zoom and non-square pages', () => {
  for (const size of [{ width: 500, height: 1000 }, { width: 2000, height: 600 }]) {
    const near = { x: 500, y: 500 + 8 / size.height * 1000 };
    const far = { x: 500, y: 500 + 20 / size.height * 1000 };
    assert.equal(remainingStrokes([line], near, near, size).length, 0);
    assert.equal(remainingStrokes([line], far, far, size).length, 1);
  }
});
test('single-point strokes can be erased without removing other strokes', () => {
  const dot = { ...line, id: 'dot', points: [{ x: 50, y: 50 }] };
  assert.deepEqual(remainingStrokes([line, dot], { x: 50, y: 50 }, { x: 50, y: 50 }, { width: 1000, height: 1000 }), [line]);
});
