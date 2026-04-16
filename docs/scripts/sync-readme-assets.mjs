import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(__dirname, '..');
const repoRoot = path.join(docsRoot, '..');
const srcDir = path.join(repoRoot, 'assets', 'readme');
const destDir = path.join(docsRoot, 'public', 'guide', 'readme');

if (!fs.existsSync(srcDir)) {
  console.warn(`sync-readme-assets: missing ${srcDir}, skipping`);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith('.png')) continue;
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
}
