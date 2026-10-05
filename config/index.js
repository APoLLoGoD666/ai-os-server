'use strict';

// ── Models ────────────────────────────────────────────────────────────────────
const HAIKU_MODEL  = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const OPUS_MODEL   = 'claude-opus-4-7';

// ── Startup delays (ms) ───────────────────────────────────────────────────────
const MASTRA_INIT_DELAY  = 5  * 60 * 1000; // 5 min — avoid startup OOM
const RUFLO_INIT_DELAY   = 10 * 60 * 1000; // 10 min — after Mastra settles

// ── Rate limits ───────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX       = 30;

// ── Timeouts (ms) ─────────────────────────────────────────────────────────────
const TOOL_TIMEOUT_MS    = 15 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;

// ── Obsidian ──────────────────────────────────────────────────────────────────
// M9: Non-Render Linux deployments must set OBSIDIAN_VAULT_PATH explicitly.
if (!process.env.OBSIDIAN_VAULT_PATH && process.platform !== 'win32' && !process.env.RENDER) {
    console.warn('[config] OBSIDIAN_VAULT_PATH not set — defaulting to Render path. Set env var for other Linux deployments.');
}
const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH
    || (process.platform === 'win32'
        ? 'C:\\Users\\arwwo\\Desktop\\APEX\\APEX AI OS'
        : '/opt/render/project/src/APEX AI OS');

// ── Document limits ───────────────────────────────────────────────────────────
const DOC_ANALYSIS_LIMIT = 10;
const FACT_LOAD_LIMIT    = 30;

module.exports = {
    HAIKU_MODEL,
    SONNET_MODEL,
    OPUS_MODEL,
    MASTRA_INIT_DELAY,
    RUFLO_INIT_DELAY,
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX,
    TOOL_TIMEOUT_MS,
    REQUEST_TIMEOUT_MS,
    OBSIDIAN_VAULT_PATH,
    DOC_ANALYSIS_LIMIT,
    FACT_LOAD_LIMIT,
};
