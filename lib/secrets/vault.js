'use strict';
// lib/secrets/vault.js — centralized secret access, always reads from process.env
// Never holds secrets in memory longer than necessary.
// All calls go through vault.get() — never access process.env directly in app code.

const REQUIRED = [
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL = [
  'GOOGLE_API_KEY',
  'GITHUB_TOKEN',
  'SLACK_BOT_TOKEN',
  'NOTION_TOKEN',
  'OPENAI_API_KEY',
  'RENDER_API_KEY',
  'SUPABASE_ACCESS_TOKEN',
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
