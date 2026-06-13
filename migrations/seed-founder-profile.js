#!/usr/bin/env node
'use strict';
// migrations/seed-founder-profile.js
// Seeds founder_memory (Layer 0) with the complete Founder OS profile.
// Safe to re-run — uses upsert on section+key unique index.
// Run: node migrations/seed-founder-profile.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PROFILE = [
  // ── Identity ──────────────────────────────────────────────────────────────
  { section: 'identity', key: 'core_mission',    importance: 10, value: { text: 'Reach true potential and build an empire that creates freedom, protection, mastery, and lasting impact.' } },
  { section: 'identity', key: 'primary_driver',  importance: 10, value: { text: 'Potential' } },
  { section: 'identity', key: 'ultimate_goal',   importance: 10, value: { text: 'Reach true potential.' } },
  { section: 'identity', key: 'decision_model',  importance: 9,  value: { order: ['Logic', 'Intuition', 'Data', 'Advisors', 'Experience'], weights: { logic: 5, intuition: 4, data: 3, advisors: 2, experience: 1 } } },
  { section: 'identity', key: 'risk_profile',    importance: 9,  value: { approach: 'Calculated risk with maximum aggression when conviction is high.', financial_tolerance: 0.40, label: 'calculated_aggressor' } },

  // ── Core Values ────────────────────────────────────────────────────────────
  { section: 'values.core', key: 'freedom',  importance: 10, value: { text: 'Freedom', rank: 1, keywords: ['freedom', 'autonomous', 'independent', 'own', 'control', 'agency', 'self-directed', 'no boss', 'choice'] } },
  { section: 'values.core', key: 'family',   importance: 10, value: { text: 'Family',  rank: 2, keywords: ['family', 'personal', 'loved', 'relationship', 'home', 'protect'] } },
  { section: 'values.core', key: 'truth',    importance: 10, value: { text: 'Truth',   rank: 3, keywords: ['truth', 'honest', 'real', 'evidence', 'verified', 'accurate', 'transparent', 'no compromise'] } },
  { section: 'values.core', key: 'growth',   importance: 10, value: { text: 'Growth',  rank: 4, keywords: ['grow', 'learn', 'improve', 'develop', 'expand', 'skill', 'knowledge', 'capability', 'progress'] } },
  { section: 'values.core', key: 'legacy',   importance: 10, value: { text: 'Legacy',  rank: 5, keywords: ['legacy', 'impact', 'lasting', 'future', 'inspire', 'build', 'create', 'scale', 'generation'] } },

  // ── Strategic Values ────────────────────────────────────────────────────────
  { section: 'values.strategic', key: 'health',     importance: 9, value: { text: 'Health',     keywords: ['health', 'fitness', 'body', 'strength', 'mobility', 'longevity', 'athletic', 'pain-free', 'nutrition', 'sleep'] } },
  { section: 'values.strategic', key: 'wealth',     importance: 9, value: { text: 'Wealth',     keywords: ['wealth', 'financial', 'money', 'revenue', 'income', 'asset', 'investment', 'capital', 'roi', 'profit'] } },
  { section: 'values.strategic', key: 'knowledge',  importance: 9, value: { text: 'Knowledge',  keywords: ['knowledge', 'learn', 'research', 'understand', 'data', 'intelligence', 'insight', 'study', 'master'] } },
  { section: 'values.strategic', key: 'capability', importance: 9, value: { text: 'Capability', keywords: ['capability', 'skill', 'tool', 'system', 'leverage', 'automate', 'platform', 'ability', 'execution'] } },
  { section: 'values.strategic', key: 'security',   importance: 9, value: { text: 'Security',   keywords: ['security', 'protection', 'privacy', 'safe', 'backup', 'redundancy', 'fortress', 'resilient'] } },

  // ── Principles ─────────────────────────────────────────────────────────────
  { section: 'principles', key: 'truth_over_convenience',   importance: 9, value: { text: 'Truth over convenience.', violation_keywords: ['convenient lie', 'comfortable', 'easier to say', 'avoid', 'not mention'] } },
  { section: 'principles', key: 'no_bad_people',            importance: 9, value: { text: 'Do not work with bad people.', violation_keywords: ['dishonest', 'unethical', 'manipulative', 'toxic', 'disloyal'] } },
  { section: 'principles', key: 'no_unhealthy_promotion',   importance: 8, value: { text: 'Do not promote unhealthy things.', violation_keywords: ['unhealthy', 'harmful', 'addictive', 'toxic product', 'destructive'] } },
  { section: 'principles', key: 'protect_loyal',            importance: 9, value: { text: 'Protect those who helped me.', tags: ['loyalty', 'reciprocity', 'protection'] } },

  // ── Protected People ────────────────────────────────────────────────────────
  { section: 'protected_people', key: 'mother',    importance: 10, value: { role: 'mother',    redacted_as: '[PROTECTED:mother]',    priority: 'absolute' } },
  { section: 'protected_people', key: 'father',    importance: 10, value: { role: 'father',    redacted_as: '[PROTECTED:father]',    priority: 'absolute' } },
  { section: 'protected_people', key: 'brother',   importance: 10, value: { role: 'brother',   redacted_as: '[PROTECTED:brother]',   priority: 'absolute' } },
  { section: 'protected_people', key: 'sister',    importance: 10, value: { role: 'sister',    redacted_as: '[PROTECTED:sister]',    priority: 'absolute' } },
  { section: 'protected_people', key: 'girlfriend', importance: 10, value: { role: 'partner',  redacted_as: '[PROTECTED:partner]',   priority: 'absolute' } },

  // ── Trusted / Distrusted Traits ─────────────────────────────────────────────
  { section: 'traits.trusted',   key: 'list', importance: 8, value: { traits: ['Loyalty', 'Honesty', 'Communication', 'Intelligence', 'Listening'] } },
  { section: 'traits.distrusted', key: 'list', importance: 8, value: { traits: ['Disrespect', 'Insecurity', 'Stupidity', 'Refusal to listen'], flag_in_executives: true } },

  // ── Anti-Goals ──────────────────────────────────────────────────────────────
  { section: 'anti_goals', key: 'loss_of_privacy',    importance: 10, value: { text: 'Loss of privacy', severity: 'critical', keywords: ['expose', 'leak', 'surveillance', 'track', 'data breach', 'public personal data', 'doxx'] } },
  { section: 'anti_goals', key: 'stagnation',          importance: 10, value: { text: 'Stagnation',       severity: 'high',    keywords: ['stagnate', 'plateau', 'stuck', 'no progress', 'static', 'unchanging', 'no growth'] } },
  { section: 'anti_goals', key: 'dependency',          importance: 9,  value: { text: 'Dependency',       severity: 'high',    keywords: ['depend on', 'rely on', 'need others', 'vendor lock', 'single point of failure', 'trapped'] } },
  { section: 'anti_goals', key: 'inaction',            importance: 10, value: { text: 'Inaction',         severity: 'high',    keywords: ['delay', 'procrastinate', 'wait', 'defer', 'no action', 'overthink', 'hesitate', 'maybe later'] } },
  { section: 'anti_goals', key: 'unfulfilled_potential', importance: 10, value: { text: 'Unfulfilled potential', severity: 'critical', keywords: ['unfulfill', 'waste', 'underutilize', 'below potential', 'half measure', 'good enough'] } },

  // ── Failure Pattern ─────────────────────────────────────────────────────────
  { section: 'patterns.failure', key: 'cascade', importance: 9, value: {
    stages: ['Uncertainty', 'Overthinking', 'Delay', 'Inaction', 'Anxiety', 'More Inaction'],
    early_warning_keywords: ['not sure', 'maybe', 'unclear', 'think about it', 'wait and see', 'uncertain'],
    intervention: 'Force a decision using Logic → Data → first-principles. Break the loop immediately.',
  } },

  // ── Peak State ──────────────────────────────────────────────────────────────
  { section: 'peak_state', key: 'characteristics', importance: 8, value: {
    states: ['Deep focus', 'Learning', 'Building', 'Executing', 'Expanding capabilities', 'High momentum'],
    keywords: ['focus', 'learn', 'build', 'execute', 'expand', 'momentum', 'flow', 'output', 'progress'],
  } },

  // ── Ideal Future State ────────────────────────────────────────────────────
  { section: 'ideal_future', key: 'vision', importance: 9, value: {
    elements: ['Warm climate', 'Ocean access', 'Multiple properties', 'Family nearby', 'Excellent health', 'Financial freedom', 'Strategic work', 'Travel', 'Continuous growth', 'High agency'],
    location_preference: 'warm_climate_ocean',
    lifestyle_model: 'sovereign_operator',
  } },

  // ── Health Goals ─────────────────────────────────────────────────────────
  { section: 'goals.health', key: 'body_composition', importance: 8, value: { target_weight_kg: 92, range: '90-95', body_fat_pct: 10, description: '90-95kg at ~10% body fat' } },
  { section: 'goals.health', key: 'performance',      importance: 8, value: { targets: ['Elite athleticism', 'Elite strength', 'Excellent mobility', 'Longevity', 'Pain-free functionality'] } },

  // ── Wealth Philosophy ──────────────────────────────────────────────────────
  { section: 'wealth', key: 'philosophy', importance: 9, value: {
    core_belief: 'Money is infrastructure.',
    freedom_model: 'Financial freedom comes from self-sustaining systems that generate more than they consume.',
    target: 'Systems-based, not labor-based income',
    measurement: 'Value created > value consumed',
  } },

  // ── Legacy ────────────────────────────────────────────────────────────────
  { section: 'legacy', key: 'goal', importance: 9, value: { text: 'Create systems, influence, and impact that meaningfully shift the world and inspire future generations.' } },
];

async function seed() {
  console.log(`Seeding ${PROFILE.length} founder profile entries...`);
  let ok = 0, err = 0;

  for (const entry of PROFILE) {
    const id = `fm-${entry.section}-${entry.key}`.replace(/\./g, '-').replace(/\s/g, '_');
    const { error } = await sb.from('founder_memory').upsert({
      id,
      section:    entry.section,
      key:        entry.key,
      value:      entry.value,
      importance: entry.importance,
      source:     'founder_os_seed',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'section,key' });

    if (error) {
      console.error(`  ERR [${entry.section}.${entry.key}]: ${error.message}`);
      err++;
    } else {
      console.log(`  OK  [${entry.section}.${entry.key}]`);
      ok++;
    }
  }

  // Seed domains
  const DOMAINS = [
    { id: 'dom-health',     name: 'Health',        category: 'personal',  priority: 10, target_state: { weight_kg: 92, body_fat_pct: 10, strength: 'elite', mobility: 'excellent' } },
    { id: 'dom-wealth',     name: 'Wealth',        category: 'financial', priority: 9,  target_state: { model: 'systems-based', dependency: 'none', freedom: true } },
    { id: 'dom-knowledge',  name: 'Knowledge',     category: 'cognitive', priority: 9,  target_state: { mastery_areas: ['AI systems', 'business', 'finance', 'health science'] } },
    { id: 'dom-capability', name: 'Capability',    category: 'execution', priority: 9,  target_state: { apex_autonomy: 'AFK', pipeline_success_rate: 0.95 } },
    { id: 'dom-security',   name: 'Security',      category: 'protection', priority: 8, target_state: { privacy: 'maximum', redundancy: 'full', dependencies: 'minimal' } },
    { id: 'dom-family',     name: 'Family',        category: 'personal',  priority: 10, target_state: { proximity: 'nearby', support: 'full', time: 'regular' } },
    { id: 'dom-location',   name: 'Location',      category: 'lifestyle', priority: 7,  target_state: { climate: 'warm', ocean: true, properties: 'multiple' } },
    { id: 'dom-impact',     name: 'Legacy & Impact', category: 'purpose', priority: 8, target_state: { systems_created: 'world-shifting', reach: 'generational' } },
  ];

  for (const domain of DOMAINS) {
    const { error } = await sb.from('founder_domains').upsert({
      ...domain,
      current_state: {},
      health_score:  null,
      description:   null,
      last_updated:  new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) { console.error(`  ERR domain [${domain.id}]: ${error.message}`); err++; }
    else { console.log(`  OK  domain [${domain.id}]`); ok++; }
  }

  // Seed initial goals
  const GOALS = [
    { domain_id: 'dom-health',    title: 'Body composition target',       success_metric: 'Weight 90-95kg at ~10% body fat',    target_value: '92kg / 10%',   unit: 'kg/%',   linked_values: ['health', 'freedom'], priority: 9 },
    { domain_id: 'dom-health',    title: 'Elite athleticism',             success_metric: 'Top 5% strength + mobility markers', target_value: 'elite',         unit: 'tier',   linked_values: ['health', 'growth'],  priority: 8 },
    { domain_id: 'dom-wealth',    title: 'Financial freedom via systems', success_metric: 'Passive income > monthly expenses',  target_value: 'systems_exceed_expenses', unit: 'ratio', linked_values: ['wealth', 'freedom'], priority: 10 },
    { domain_id: 'dom-capability', title: 'APEX AFK operation',          success_metric: 'System runs daily briefings without intervention', target_value: 'fully_autonomous', unit: 'boolean', linked_values: ['capability', 'freedom'], priority: 9 },
    { domain_id: 'dom-security',   title: 'Privacy fortress',            success_metric: 'Zero personal data exposure',        target_value: 'zero_exposure', unit: 'incidents', linked_values: ['security', 'freedom'], priority: 9 },
    { domain_id: 'dom-location',   title: 'Ideal location',              success_metric: 'Warm climate, ocean access, multiple properties', target_value: 'achieved', unit: 'boolean', linked_values: ['freedom', 'family'], priority: 7 },
  ];

  for (const goal of GOALS) {
    const { error } = await sb.from('founder_goals').insert({ ...goal, status: 'active', progress_pct: 0, current_value: null }).select().single().then(r => r);
    if (error && !error.message.includes('unique')) { console.error(`  ERR goal [${goal.title}]: ${error.message}`); err++; }
    else { console.log(`  OK  goal [${goal.title.slice(0, 40)}]`); ok++; }
  }

  console.log(`\nSeed complete: ${ok} OK, ${err} ERR`);
}

seed().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
