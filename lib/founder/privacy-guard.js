'use strict';
// lib/founder/privacy-guard.js
// Protects founder PII in all text going to model prompts, logs, or external APIs.
// Protected people's names/relationships are replaced with role tokens.
// Sensitive profile sections are never exposed in full to model context.

const profile = require('./profile');
const logger  = require('../logger');

// STATIC_REDACTIONS: relationships that must always be redacted regardless of profile load success
// These are the role → token mappings; actual names come from profile
const ROLE_TOKENS = {
  mother:   '[PROTECTED:mother]',
  father:   '[PROTECTED:father]',
  brother:  '[PROTECTED:brother]',
  sister:   '[PROTECTED:sister]',
  partner:  '[PROTECTED:partner]',
};

// SECTIONS that must never be sent to a model in full
const RESTRICTED_SECTIONS = ['protected_people'];

// FIELDS that are always stripped from any object going external
const STRIP_FIELDS = ['protected_people', '_raw'];

// redact — replace protected person references in text.
// Pass the actual display names as hints if known; otherwise uses known role words.
async function redact(text, options = {}) {
  if (!text || typeof text !== 'string') return text;

  const p = await profile.load().catch(() => null);
  let result = text;

  // Replace role words that appear as names (case-insensitive, word boundary)
  const roleWords = ['Mum', 'Dad', 'Mum', 'Mom', 'Mother', 'Father', 'Brother', 'Sister', 'Girlfriend'];
  for (const word of roleWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const token = _roleToToken(word.toLowerCase());
    if (token) result = result.replace(regex, token);
  }

  // If caller passes extra names to redact (e.g., actual first names)
  if (Array.isArray(options.names)) {
    for (const name of options.names) {
      if (name && name.length > 1) {
        const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        result = result.replace(regex, '[PROTECTED:name]');
      }
    }
  }

  return result;
}

function _roleToToken(roleWord) {
  if (/mum|mom|mother/.test(roleWord)) return ROLE_TOKENS.mother;
  if (/dad|father/.test(roleWord))      return ROLE_TOKENS.father;
  if (/brother/.test(roleWord))         return ROLE_TOKENS.brother;
  if (/sister/.test(roleWord))          return ROLE_TOKENS.sister;
  if (/girlfriend|partner/.test(roleWord)) return ROLE_TOKENS.partner;
  return null;
}

// sanitizeForModel — strip all fields that should never reach a model prompt
function sanitizeForModel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const field of STRIP_FIELDS) {
    delete result[field];
  }
  return result;
}

// sanitizeForLog — strip sensitive fields from log objects
function sanitizeForLog(obj) {
  return sanitizeForModel(obj);
}

// guardContextPackage — ensure a context package is safe to pass to a model
async function guardContextPackage(pkg) {
  if (!pkg) return pkg;

  const result = sanitizeForModel(pkg);

  // Redact any text fields that might contain protected person references
  if (result.alignment_guidance) {
    result.alignment_guidance = await redact(result.alignment_guidance);
  }
  if (result.relevant_goals) {
    result.relevant_goals = await Promise.all(result.relevant_goals.map(g => redact(g)));
  }

  return { ...result, protected_context: { has_protected_people: true, redacted: true } };
}

// checkAccess — verify that a requesting entity is allowed to read a profile section
function checkAccess(entityId, section) {
  // Protected people data is never accessible to agents or external entities
  if (RESTRICTED_SECTIONS.includes(section)) {
    const allowed = ['orchestrator', 'founder_os', 'system'];
    if (!allowed.includes(entityId)) {
      logger.warn('privacy-guard', 'access denied', { entityId, section });
      return false;
    }
  }
  return true;
}

// ── WS1: Founder Abstraction Layer ──────────────────────────────────────────
// Converts sensitive founder_context fields into abstracted behavioral guidance
// before injection into external model prompts. Raw PII never reaches the API.

const SAFE_PASSTHROUGH = [
    'alignment_guidance',
    'peak_state_prompt',
    'relevant_values',
    'applicable_principles',
    'identity',
];

// Each entry: { field: dotted path, guidance: abstracted string to inject }
const ABSTRACTION_MAP = [
    { field: 'protected_people',  guidance: 'Prioritize the protection and wellbeing of close personal relationships.' },
    { field: 'wealth',            guidance: 'Favor decisions that preserve long-term financial stability over short-term gain.' },
    { field: 'patterns.failure',  guidance: 'Actively avoid behavioral patterns associated with past costly outcomes.' },
    { field: 'legacy',            guidance: 'Align decisions with long-term purpose and legacy over immediate convenience.' },
    { field: 'traits.distrusted', guidance: 'Apply heightened scrutiny in contexts matching historically distrusted patterns.' },
    { field: 'traits.trusted',    guidance: 'Draw confidence from approaches validated by proven advisors and relationships.' },
    { field: 'anti_goals',        guidance: 'Actively avoid outcomes that contradict core purpose.' },
    { field: 'ideal_future',      guidance: 'Orient decisions toward the envisioned long-term state.' },
    { field: 'goals.health',      guidance: 'Preserve decisions that support sustained physical and cognitive performance.' },
];

function _fieldPresent(obj, dotPath) {
    const keys = dotPath.split('.');
    let val = obj;
    for (const k of keys) val = val?.[k];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return false;
    return true;
}

// abstractForExternalPrompt — returns a context object safe to inject into external API prompts.
// Sensitive fields are replaced with abstracted behavioral guidance strings.
// Safe passthrough fields (alignment_guidance etc.) are passed without modification.
function abstractForExternalPrompt(founderCtx) {
    if (!founderCtx || typeof founderCtx !== 'object') return null;

    const result = { _abstraction_applied: true };

    for (const field of SAFE_PASSTHROUGH) {
        const val = founderCtx[field];
        if (val !== undefined && val !== null) result[field] = val;
    }

    const abstractedGuidance = ABSTRACTION_MAP
        .filter(({ field }) => _fieldPresent(founderCtx, field))
        .map(({ guidance }) => guidance);

    if (abstractedGuidance.length > 0) {
        result.abstracted_behavioral_guidance = abstractedGuidance;
    }

    return result;
}

module.exports = { redact, sanitizeForModel, sanitizeForLog, guardContextPackage, checkAccess, ROLE_TOKENS, abstractForExternalPrompt };
