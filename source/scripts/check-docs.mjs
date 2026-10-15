import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdownFiles = [path.join(root, 'README.md'), path.join(root, 'AGENTS.md')];

async function collectMarkdown(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectMarkdown(fullPath);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) markdownFiles.push(fullPath);
  }
}

await collectMarkdown(path.join(root, 'docs'));
const uniqueFiles = [...new Set(markdownFiles)];
let linkCount = 0;
const missing = [];
const featureIds = [];

for (const file of uniqueFiles) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      missing.push(`${path.relative(root, file)}: file not found`);
      continue;
    }
    throw error;
  }

  if (path.basename(file).toUpperCase() === 'FEATURES.MD') {
    for (const match of source.matchAll(/^\|\s*(F\d{2})\s*\|/gm)) featureIds.push(match[1]);
  }

  const linkPattern = /!?\[[^\]]*\]\(\s*(<[^>]*>|(?:\\.|[^)\s])*)(?:\s+[^)]*)?\s*\)/g;
  for (const match of source.matchAll(linkPattern)) {
    let target = match[1];
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    if (!target || target.startsWith('#') || /^(?:https?:|mailto:|codex:)/i.test(target)) continue;

    linkCount += 1;
    const localTarget = decodeURIComponent(target.split('#', 1)[0].split('?', 1)[0]);
    if (!localTarget) continue;
    const normalizedTarget = localTarget.replaceAll('\\', path.sep).replaceAll('/', path.sep);
    const resolved = path.isAbsolute(normalizedTarget)
      ? path.resolve(root, `.${normalizedTarget}`)
      : path.resolve(path.dirname(file), normalizedTarget);

    try {
      await stat(resolved);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        const line = source.slice(0, match.index).split('\n').length;
        missing.push(`${path.relative(root, file)}:${line} -> ${target}`);
      } else {
        throw error;
      }
    }
  }
}

const expectedIds = Array.from({ length: 36 }, (_, index) => `F${String(index + 1).padStart(2, '0')}`);
const uniqueFeatureIds = new Set(featureIds);
const duplicateFeatureIds = featureIds.filter((id, index) => featureIds.indexOf(id) !== index);
const absentFeatureIds = expectedIds.filter((id) => !uniqueFeatureIds.has(id));
const unexpectedFeatureIds = [...uniqueFeatureIds].filter((id) => !expectedIds.includes(id));

console.log(`Markdown files scanned: ${uniqueFiles.length}`);
console.log(`Relative links checked: ${linkCount}`);
console.log(`FEATURES IDs found: ${featureIds.length} rows (${uniqueFeatureIds.size} unique)`);

if (duplicateFeatureIds.length) console.error(`Duplicate feature IDs: ${[...new Set(duplicateFeatureIds)].join(', ')}`);
if (absentFeatureIds.length) console.error(`Missing feature IDs: ${absentFeatureIds.join(', ')}`);
if (unexpectedFeatureIds.length) console.error(`Unexpected feature IDs: ${unexpectedFeatureIds.join(', ')}`);
for (const item of missing) console.error(`Missing: ${item}`);

if (missing.length || duplicateFeatureIds.length || absentFeatureIds.length || unexpectedFeatureIds.length) {
  process.exitCode = 1;
} else {
  console.log('Documentation checks passed.');
}
