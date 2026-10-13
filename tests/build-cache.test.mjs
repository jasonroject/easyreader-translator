import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildFingerprint } from '../scripts/build-cache.mjs';
test('launcher rebuilds for source or environment changes, but not documents or logs', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'easyreader-build-'));
  try {
    mkdirSync(path.join(root, 'src')); writeFileSync(path.join(root, 'src', 'app.ts'), 'version 1');
    const first = buildFingerprint(root);
    writeFileSync(path.join(root, 'README.md'), 'documentation');
    assert.equal(buildFingerprint(root), first);
    writeFileSync(path.join(root, 'src', 'app.ts'), 'version 2');
    const second = buildFingerprint(root); assert.notEqual(second, first);
    writeFileSync(path.join(root, '.env.local'), 'VITE_LABEL=updated');
    assert.notEqual(buildFingerprint(root), second);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
