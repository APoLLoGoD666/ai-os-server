'use strict';
// lib/memory/sanitizer.js — strip secrets from all content before storage or context assembly

const PATTERNS = [
  /sk-ant-[a-zA-Z0-9-]{40,}/g,                              // Anthropic API key
  /sk-or-v1-[a-zA-Z0-9]{40,}/g,                             // OpenRouter API key
  /sk-proj-[a-zA-Z0-9_-]{40,}/g,                            // OpenAI project API key
  /sk-[a-zA-Z0-9]{48,}/g,                                   // OpenAI legacy API key
  /sk_[a-zA-Z0-9]{40,}/g,                                   // ElevenLabs / generic sk_ key
  /AIza[a-zA-Z0-9-_]{35}/g,                                 // Google API key
  /AQ\.Ab[a-zA-Z0-9-_]{30,}/g,                              // Google OAuth token
  /GOCSPX-[a-zA-Z0-9_-]+/g,                                 // Google OAuth client secret
  /ghp_[a-zA-Z0-9]{36}/g,                                   // GitHub personal access token
  /ntn_[a-zA-Z0-9]+/g,                                      // Notion token
  /xoxb-[0-9]+-[a-zA-Z0-9-]+/g,                            // Slack bot token
  /sbp_[a-zA-Z0-9]+/g,                                      // Supabase personal token
  /sb_secret_[a-zA-Z0-9_-]+/g,                              // Supabase service role key
  /sb_publishable_[a-zA-Z0-9_-]+/g,                         // Supabase anon key
  /eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g,  // JWT
  /rnd_[a-zA-Z0-9]+/g,                                      // Render API key
  /AKIA[A-Z0-9]{16}/g,                                       // AWS access key
  /postgresql:\/\/[^\s"']+/g,                                // PostgreSQL connection string
  /Bearer [a-zA-Z0-9._\-]{20,}/g,                           // Generic Bearer token
  /-----BEGIN [A-Z ]+-----[^-]*-----END [A-Z ]+-----/g,    // PEM block (certificate/key)
  /sk_live_[a-zA-Z0-9]{24,}/g,                              // Stripe live key
  /sk_test_[a-zA-Z0-9]{24,}/g,                              // Stripe test key
  /SG\.[a-zA-Z0-9_-]{22,}/g,                                // SendGrid API key
  /hf_[a-zA-Z0-9]{30,}/g,                                   // HuggingFace API key
  /mongodb(\+srv)?:\/\/[^\s"']+/g,                           // MongoDB connection string
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
