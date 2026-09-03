'use strict';
// lib/memory/founder-memory.js — Layer 0: Founder Memory
// Reads from founder_memory Supabase table (migration 015).
// Falls back to hardcoded Alex profile when the table is not yet populated.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

// Hardcoded fallback — loaded when the founder_memory table is empty or unavailable.
// Populated from Alex.md / Obsidian vault identity profile.
const FALLBACK_CONTEXT = {
  identity_summary: 'Alex — builder of APEX AI OS, based in Royal Leamington Spa. Systems thinker, voice-first operator, obsessed with building a personal AI civilization that runs largely without manual intervention.',
  communication_style: 'Direct. No filler. Address as "sir" when appropriate. No emoji unless asked.',
  active_goals: [
    'Complete APEX Cognitive Runtime implementation (Missions 7–10)',
    'Reach civilization score 80+ (Autonomous Organization)',
    'Operate AFK with daily voice briefings',
  ],
  working_style: [
    'No manual step lists for known commands',
    'Commit per logical unit',
    'No trailing summaries after code changes',
    'Syntax-check rule: node --check after every .js write',
  ],
  constraints: [
    'Max $2.00/run cost cap',
    'No new npm packages without approval',
    'Never expose secrets',
    'No autonomous destructive operations',
  ],
  relevant_preferences: [
    'Voice-first interaction (Gemini Live)',
    'Cost-conscious — prefer HAIKU for simple tasks',
    'AFK operation where possible',
    'Dashboard at /dashboard for status visibility',
  ],
  technical_environment: {
    server: 'Render (ai-os-server-jx20.onrender.com)',
    db: 'Supabase Postgres',
    models: 'Claude API + Gemini 2.5',
    local_vault: 'Obsidian on Windows 11',
    timezone: 'Europe/London',
  },
};

// Get founder context for a given domain.
// domain: 'all' | 'identity' | 'goals' | 'constraints' | 'preferences'
async function getContext(domain = 'all') {
  try {
    const { data, error } = await _sb()
      .from('founder_memory')
      .select('section, key, value, importance')
      .order('importance', { ascending: false })
      .limit(50);

    if (error || !data?.length) return FALLBACK_CONTEXT;

    // Reconstruct structured context from DB rows
    const ctx = {};
    for (const row of data) {
      if (!ctx[row.section]) ctx[row.section] = {};
      ctx[row.section][row.key] = row.value;
    }
    return ctx;
  } catch (e) {
    logger.warn('founder-memory', 'getContext fell back to hardcoded profile', { error: e.message });
    return FALLBACK_CONTEXT;
  }
}

// Update a founder memory entry (Layer 0 write — requires FOUNDER_WRITE elevation).
async function update({ section = 'general', key, content, tags = [], source, importance = 7 }) {
  const id = `fm-${section}-${key || Date.now()}`;
  const { error } = await _sb()
    .from('founder_memory')
    .upsert({
      id,
      section,
      key: key || 'update',
      value: typeof content === 'object' ? content : { text: content },
      importance,
      source: source || 'system',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    logger.warn('founder-memory', 'update failed', { error: error.message });
    throw new Error(`founder-memory update: ${error.message}`);
  }
  return { id };
}

module.exports = { getContext, update, FALLBACK_CONTEXT };
