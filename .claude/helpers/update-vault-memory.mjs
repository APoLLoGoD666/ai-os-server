#!/usr/bin/env node
/**
 * update-vault-memory.mjs
 * Fires after git push — reads recent commits + diff, calls Claude Haiku
 * to update the Obsidian vault project memory file.
 *
 * Usage:
 *   node update-vault-memory.mjs          # auto-detect trigger (git push)
 *   node update-vault-memory.mjs --force  # force update regardless
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const VAULT_MEMORY  = 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS\\System\\Claude-Memory\\project-apex-ai-os.md';
const STAMP_FILE    = join(PROJECT_ROOT, '.claude-flow', 'data', 'last-memory-update.txt');
const ENV_PATH      = join(PROJECT_ROOT, '.env');

// ── Load .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).forEach(line => {
    const eq = line.indexOf('=');
    if (eq === -1) return;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val && !process.env[key]) process.env[key] = val;
  });
}

// ── Git helpers ────────────────────────────────────────────────────────────
function git(cmd) {
  try { return execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

function getLastCommitHash() { return git('git rev-parse HEAD'); }

function getLastUpdatedHash() {
  try { return existsSync(STAMP_FILE) ? readFileSync(STAMP_FILE, 'utf8').trim() : ''; }
  catch { return ''; }
}

function saveHash(hash) {
  try { writeFileSync(STAMP_FILE, hash, 'utf8'); } catch {}
}

// ── Claude Haiku call ──────────────────────────────────────────────────────
async function callHaiku(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const force = process.argv.includes('--force');
  const currentHash = getLastCommitHash();
  const lastHash    = getLastUpdatedHash();

  if (!force && currentHash && currentHash === lastHash) {
    console.log('[VaultMemory] No new commits since last update — skipping.');
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[VaultMemory] ANTHROPIC_API_KEY not found — skipping.');
    return;
  }

  if (!existsSync(VAULT_MEMORY)) {
    console.error('[VaultMemory] Vault memory file not found — skipping.');
    return;
  }

  // Gather context
  const recentCommits = git('git log --oneline -15');
  const diffStat      = git('git diff HEAD~5 --stat 2>/dev/null || git diff HEAD~1 --stat');
  const currentMemory = readFileSync(VAULT_MEMORY, 'utf8');
  const today         = new Date().toISOString().split('T')[0];

  const system = `You are a memory updater for the Apex AI OS project. You receive:
1. The current project memory file
2. Recent git commits
3. A diff stat showing what files changed

Your job: update the memory file to reflect the current state. Rules:
- Keep the frontmatter (---...---) exactly as-is
- Update "## Dashboard panels", "## Key file map", "## Immediate next steps", and any other sections that changed
- Add a new section or update existing ones to reflect new features/files from the commits
- Keep the file concise — no padding, no repetition
- Update the date references to ${today} where relevant
- Return ONLY the updated markdown file content, nothing else`;

  const userMsg = `Current memory file:
\`\`\`
${currentMemory}
\`\`\`

Recent commits (newest first):
\`\`\`
${recentCommits}
\`\`\`

Files changed (diff stat):
\`\`\`
${diffStat}
\`\`\`

Return the updated memory file.`;

  console.log('[VaultMemory] Calling Haiku to update vault memory...');
  const updated = await callHaiku(system, userMsg);

  // Only write if it looks like valid markdown with our frontmatter
  if (!updated.includes('name: Apex AI OS')) {
    console.error('[VaultMemory] Response did not look valid — skipping write.');
    return;
  }

  writeFileSync(VAULT_MEMORY, updated, 'utf8');
  saveHash(currentHash);
  console.log(`[VaultMemory] ✓ Vault memory updated (${today})`);
}

main().catch(err => console.error('[VaultMemory] Error:', err.message));
