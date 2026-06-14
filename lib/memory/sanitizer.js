'use strict';
// lib/memory/sanitizer.js — strip secrets from all content before storage or context assembly

const PATTERNS = [
  /sk-ant-[a-zA-Z0-9-]{40,}/g,                              // Anthropic API key
  /AIza[a-zA-Z0-9-_]{35}/g,                                 // Google API key
  /AQ\.Ab[a-zA-Z0-9-_]{30,}/g,                              // Google OAuth token
  /ghp_[a-zA-Z0-9]{36}/g,                                   // GitHub personal access token
  /ntn_[a-zA-Z0-9]+/g,                                      // Notion token
  /xoxb-[0-9]+-[a-zA-Z0-9-]+/g,                            // Slack bot token
  /sbp_[a-zA-Z0-9]+/g,                                      // Supabase personal token
  /eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g,  // JWT
  /rnd_[a-zA-Z0-9]+/g,                                      // Render API key
  /AKIA[A-Z0-9]{16}/g,                                       // AWS access key
];

function sanitize(text) {
  if (typeof text !== 'string') return text;
  let result = text;
  for (const p of PATTERNS) result = result.replace(p, '[REDACTED]');
  return result;
}

function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitize(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeObject(v);
    return out;
  }
  return obj;
}

module.exports = { sanitize, sanitizeObject };
