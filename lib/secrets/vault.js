'use strict';
// lib/secrets/vault.js — centralized secret access, always reads from process.env
// Never holds secrets in memory longer than necessary.
// All calls go through vault.get() — never access process.env directly in app code.

const REQUIRED = [
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_ACCESS_KEY',
];

const OPTIONAL = [
  'GOOGLE_API_KEY',
  'GITHUB_TOKEN',
  'SLACK_BOT_TOKEN',
  'NOTION_TOKEN',
  'NOTION_API_KEY',
  'OPENAI_API_KEY',
  'RENDER_API_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_ANON_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
  'DASHBOARD_PASSWORD',
  'CRON_SECRET',
  'DEEPGRAM_API_KEY',
  'SENTRY_DSN',
  'RAG_SIDECAR_URL',
  'BRAVE_API_KEY',
  'VOYAGE_API_KEY',
  'OPENROUTER_API_KEY',
  'COGNITIVE_CRONS_ENABLED',
  'AUTONOMY_LEVEL',
  'SUPABASE_HOLDOUT_URL',
  'SUPABASE_HOLDOUT_ANON_KEY',
  'HOLDOUT_EVAL_KEY',
  'HOLDOUT_ORACLE_URL',
  'ELEVENLABS_API_KEY',
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',
  'OBSIDIAN_API_KEY',
  'OBSIDIAN_URL',
  'OBSIDIAN_VAULT_PATH',
  'AGENT_SECRET',
  'PHASE0_TEST_SECRET',
  'RENDER_SERVICE_ID',
  'RENDER_EXTERNAL_URL',
  'LOCAL_MODE',
  'LOG_LEVEL',
  'PIPELINE_BUDGET_USD',
  'RENDER_HEALTH_URL',
];

const ALL_KEYS = new Set([...REQUIRED, ...OPTIONAL]);

function get(key) {
  if (!ALL_KEYS.has(key)) {
    // Warn but don't throw — new integrations may add keys before this list updates
    const logger = require('../logger');
    logger.warn('vault', 'unknown secret key requested', { key });
  }
  const val = process.env[key];
  if (!val && REQUIRED.includes(key)) {
    throw new Error(`vault: required secret ${key} is not set`);
  }
  return val || null;
}

// Validate all required secrets are present at startup
function validate() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`vault: missing required secrets: ${missing.join(', ')}`);
  }
  return true;
}

module.exports = { get, validate };
