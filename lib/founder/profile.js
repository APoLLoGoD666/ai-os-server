'use strict';
// lib/founder/profile.js
// Reads and assembles the full Founder Profile from founder_memory (Layer 0).
// Cached for 24h — profile changes rarely.

const { getSupabaseClient } = require('../clients');
const cache = require('../memory/cache');
const logger = require('../logger');

const CACHE_KEY = 'founder:profile:full';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

function _sb() { return getSupabaseClient(); }

// Load full profile from DB, rebuild structured object
async function load(force = false) {
  if (!force) {
    const hit = cache.get(CACHE_KEY);
    if (hit) return hit;
  }

  const { data, error } = await _sb()
    .from('founder_memory')
    .select('section, key, value, importance')
    .order('importance', { ascending: false });

  if (error || !data?.length) {
    logger.warn('founder-profile', 'DB read failed, using hardcoded fallback', { error: error?.message });
    const fallback = require('../memory/founder-memory').FALLBACK_CONTEXT;
    return { _fallback: true, ...fallback };
  }

  const profile = _assemble(data);
  cache.set(CACHE_KEY, profile, CACHE_TTL);
  return profile;
}

function _assemble(rows) {
  const raw = {};
  for (const row of rows) {
    if (!raw[row.section]) raw[row.section] = {};
    raw[row.section][row.key] = row.value;
  }

  return {
    identity:         raw['identity']          || {},
    core_values:      raw['values.core']       || {},
    strategic_values: raw['values.strategic']  || {},
    principles:       _values(raw['principles']),
    protected_people: _values(raw['protected_people']),
    trusted_traits:   raw['traits.trusted']?.list?.traits || [],
    distrusted_traits: raw['traits.distrusted']?.list?.traits || [],
    anti_goals:       _values(raw['anti_goals']),
    failure_pattern:  raw['patterns.failure']?.cascade || {},
    peak_state:       raw['peak_state']?.characteristics || {},
    ideal_future:     raw['ideal_future']?.vision || {},
    wealth_philosophy: raw['wealth']?.philosophy || {},
    legacy:           { goal: raw['legacy']?.goal?.text || '' },
    health_goals:     raw['goals.health'] || {},
    _raw: raw,
  };
}

function _values(section) {
  if (!section) return [];
  return Object.values(section);
}

// Invalidate cache (call after profile update)
function invalidate() {
  cache.invalidatePattern('founder:profile');
}

// Get a specific section
async function getSection(section) {
  const profile = await load();
  return profile._raw?.[section] || profile[section] || null;
}

// Get all core value keywords as a flat array
async function getCoreValueKeywords() {
  const profile = await load();
  return Object.values(profile.core_values).flatMap(v => v.keywords || []);
}

// Get all anti-goal definitions
async function getAntiGoals() {
  const profile = await load();
  return profile.anti_goals;
}

// Get protected people definitions
async function getProtectedPeople() {
  const profile = await load();
  return profile.protected_people;
}

module.exports = { load, invalidate, getSection, getCoreValueKeywords, getAntiGoals, getProtectedPeople };
