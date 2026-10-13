import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function buildFingerprint(root) {
  const hash = createHash('sha256').update(process.versions.node);
  const visit = relative => {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) return;
    for (const entry of readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) hash.update(name).update(readFileSync(path.join(root, name)));
    }
  };
  visit('src'); visit('public');
  for (const name of ['index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'vite.config.js', 'tsconfig.json', '.env', '.env.local', '.env.production', '.env.production.local']) {
    hash.update(name);
    if (existsSync(path.join(root, name))) hash.update(readFileSync(path.join(root, name)));
  }
  return hash.digest('hex');
}
