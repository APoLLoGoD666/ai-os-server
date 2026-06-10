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

module.exports = { redact, sanitizeForModel, sanitizeForLog, guardContextPackage, checkAccess, ROLE_TOKENS };
