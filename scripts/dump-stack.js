const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT  = path.join(ROOT, 'FULL_STACK_DUMP.txt');

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.claude-flow', 'graphify-out', 'backups',
  'local_ai_backups', 'local_ai_proposals', 'logs', 'workspace',
  'temp-assistant-read', '.gitnexus', '.swarm', 'audit', 'ruvector.db'
]);

const SKIP_FILES = new Set([
  'FULL_STACK_DUMP.txt', 'dump-stack.js', 'package-lock.json',
  'ruvector.db', 'ai_pipeline.db', 'adaptation-registry.json',
  'memory.json', 'notifications.json', 'timeline.json'
]);

const INCLUDE_EXTS = new Set([
  '.js', '.ts', '.mjs', '.cjs',
  '.sql', '.json', '.yaml', '.yml',
  '.md', '.txt', '.css', '.html',
  '.env', '.example', '.bat', '.sh'
]);

function walk(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const e of entries) {
    if (e.name.startsWith('.') && !e.name.startsWith('.env')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full, results);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (!SKIP_FILES.has(e.name) && (INCLUDE_EXTS.has(ext) || INCLUDE_EXTS.has(e.name))) {
        results.push(full);
      }
    }
  }
  return results;
}

const files = walk(ROOT).sort();
const chunks = [];
let totalBytes = 0;

for (const f of files) {
  const rel = path.relative(ROOT, f);
  let content;
  try { content = fs.readFileSync(f, 'utf8'); }
  catch { content = '[binary or unreadable]'; }

  const header = `\n${'='.repeat(80)}\nFILE: ${rel}\n${'='.repeat(80)}\n`;
  chunks.push(header + content);
  totalBytes += content.length;
}

const output = chunks.join('\n');
fs.writeFileSync(OUT, output, 'utf8');

console.log(`Done.`);
console.log(`Files: ${files.length}`);
console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Output: ${OUT}`);
