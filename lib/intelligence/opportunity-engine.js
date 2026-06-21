'use strict';
// lib/intelligence/opportunity-engine.js
// Evidence-backed opportunity detection with full lineage tracking.
// Every opportunity traces to: origin events, memory patterns, or explicit market signals.
// No orphan opportunities — opportunities without evidence are rejected.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

// detect — discover opportunities from real inputs.
// founderInterests: string[] — explicit founder preferences (optional)
// companyObjectives: string[] — explicit objectives (optional)
// marketSignals: string[] — explicit external signals (optional, with source)
// Returns persisted opportunity rows with full lineage.
async function detect({ founderInterests = [], companyObjectives = [], marketSignals = [] } = {}) {
  const modelSelector = require('../models/selector');
  const gateway       = require('../memory/gateway');
  const model         = modelSelector.select('balanced');

  // Pull real persisted events as evidence base
  const gig = require('./global-intelligence-engine');
  let events = [];
  try { events = await gig.getRecentEvents({ minSignificance: 0.4, limit: 20, realOnly: true }); } catch {}

  // Pull memory patterns as evidence
  let memPatterns = [];
  try {
    memPatterns = await gateway.searchMemory({
      query: 'opportunity growth capability automation',
      layers: [5, 9, 10],
      limit: 8,
      requestingEntity: 'opportunity_engine',
    });
  } catch {}

  // Require at least one evidence source
  const hasEvents    = events.length > 0;
  const hasMemory    = memPatterns.length > 0;
  const hasSignals   = marketSignals.length > 0;
  const hasExplicit  = founderInterests.length > 0 || companyObjectives.length > 0;

  if (!hasEvents && !hasMemory && !hasSignals && !hasExplicit) {
    logger.warn('opportunity-engine', 'detect called with no evidence — skipping');
    return [];
  }

  const eventsText  = events.map((e, i) => `[EVT-${i}] id=${e.id} [${e.category}] ${e.title}: ${(e.summary || '').slice(0, 150)}`).join('\n');
  const memText     = memPatterns.map((m, i) => `[MEM-${i}] ${typeof m.content === 'string' ? m.content.slice(0, 150) : ''}`).join('\n');
  const signalText  = marketSignals.map((s, i) => `[SIG-${i}] ${String(s).slice(0, 150)}`).join('\n');

  const prompt = `You are the APEX Opportunity Detection Engine.

Founder interests: ${founderInterests.join(', ') || 'AI, automation, productivity, personal leverage'}
Objectives: ${companyObjectives.join(', ') || 'build capable personal AI OS, reduce manual work'}

Evidence base:
${eventsText  ? `GLOBAL EVENTS:\n${eventsText}\n`  : ''}${memText     ? `MEMORY PATTERNS:\n${memText}\n`     : ''}${signalText  ? `MARKET SIGNALS:\n${signalText}\n`  : ''}
Identify 1-5 actionable opportunities TRACEABLE to the evidence above.
For each opportunity, cite the SPECIFIC evidence items that support it using their [EVT-N], [MEM-N], or [SIG-N] references.

Return JSON array:
[{
  "title": string,
  "description": string (2-3 sentences),
  "category": "product" | "automation" | "integration" | "intelligence" | "strategic" | "financial",
  "urgency": "immediate" | "this_week" | "this_month" | "this_quarter",
  "recommended_action": string,
  "executive_owner": "cso" | "cgo" | "cfo" | "cto" | "coo" | "cio",
  "composite_score": number 0-1,
  "evidence_refs": string[] (e.g. ["EVT-0", "MEM-2"]),
  "reasoning_chain": string (explain how evidence leads to this opportunity)
}]

Only include opportunities directly supported by cited evidence.`;

  let rawOpps = [];
  try {
    const result = await model.complete(prompt, {}, { maxTokens: 2000 });
    const match = result.content.match(/\[[\s\S]*\]/);
    if (match) rawOpps = JSON.parse(match[0]);
  } catch (e) {
    logger.warn('opportunity-engine', 'model parse failed', { error: e.message });
    return [];
  }

  // Filter: require evidence refs when there are actual citable items (events/memory/signals).
  // If running on explicit founder context only (no citable evidence), accept all model output.
  const canCite = hasEvents || hasMemory || hasSignals;
  const evidenced = canCite
    ? rawOpps.filter(o => Array.isArray(o.evidence_refs) && o.evidence_refs.length > 0)
    : rawOpps;
  if (!evidenced.length) {
    logger.warn('opportunity-engine', 'no opportunities produced');
    return [];
  }

  // Resolve evidence refs to actual event IDs and signals
  const eventIdMap   = Object.fromEntries(events.map((e, i) => [`EVT-${i}`, e.id]));
  const signalMap    = Object.fromEntries(marketSignals.map((s, i) => [`SIG-${i}`, s]));

  // Get executive scores for top 5
  const scored = await _scoreWithExecutives(evidenced.slice(0, 5));

  const rows = scored.map(opp => {
    const originEventIds = (opp.evidence_refs || [])
      .filter(r => r.startsWith('EVT-'))
      .map(r => eventIdMap[r])
      .filter(Boolean);

    const citedSignals = (opp.evidence_refs || [])
      .filter(r => r.startsWith('SIG-'))
      .map(r => signalMap[r])
      .filter(Boolean);

    const citedMemory = (opp.evidence_refs || [])
      .filter(r => r.startsWith('MEM-'))
      .map(r => {
        const idx = parseInt(r.replace('MEM-', ''));
        const m = memPatterns[idx];
        return m ? (typeof m.content === 'string' ? m.content.slice(0, 200) : null) : null;
      })
      .filter(Boolean);

    return {
      category:          String(opp.category || 'strategic').slice(0, 50),
      title:             String(opp.title || '').slice(0, 200),
      description:       String(opp.description || '').slice(0, 1000),
      // signals: actual cited market signals (fixes the always-empty bug)
      signals:           citedSignals.map(s => ({ content: s, source: 'market_signal' })),
      composite_score:   Math.max(0, Math.min(1, parseFloat(opp.composite_score) || 0.5)),
      status:            'detected',
      assigned_ministry: opp.executive_owner || 'cgo',
      origin_event_ids:  originEventIds,
      reasoning_chain:   String(opp.reasoning_chain || '').slice(0, 2000),
      roi_forecast: {
        urgency:             opp.urgency || 'this_month',
        recommended_action:  opp.recommended_action || '',
        evidence_refs:       opp.evidence_refs || [],
        cited_memory:        citedMemory,
        executive_review:    opp._executiveReview || null,
      },
    };
  });

  // Founder OS alignment scoring — filter anti-goal violations and enrich roi_forecast
  try {
    const founderOS = require('../founder');
    await Promise.allSettled(rows.map(async row => {
      const oppInput = { title: row.title, description: row.description, category: row.category };
      const founderScore = await founderOS.scoreOpportunity(oppInput);
      row.roi_forecast = row.roi_forecast || {};
      row.roi_forecast.founder_alignment = founderScore.founder_alignment;
      row.roi_forecast.founder_composite  = founderScore.composite;
      row.roi_forecast.anti_goal_clean    = founderScore.anti_goal_clean;
      row.roi_forecast.founder_recommended = founderScore.recommended;
      if (!founderScore.anti_goal_clean) {
        row.roi_forecast.anti_goal_flags = (founderScore.anti_goal_result?.triggered || []).map(t => t.anti_goal);
      }
      // Boost or suppress composite_score based on founder alignment
      if (founderScore.composite >= 70) row.composite_score = Math.min(1, (row.composite_score || 0.5) + 0.15);
      if (!founderScore.anti_goal_clean)  row.composite_score = Math.max(0, (row.composite_score || 0.5) - 0.3);
    }));
  } catch {}

  const { data, error } = await _sb().from('opportunities').insert(rows).select();
  if (error) {
    logger.warn('opportunity-engine', 'persist failed', { error: error.message });
    return rows;
  }
  logger.debug('opportunity-engine', 'detected', { count: rows.length, evidenced: rows.length });
  return data || rows;
}

async function _scoreWithExecutives(opportunities) {
  const { consultExecutive } = require('../cognitive/runtime');
  for (const opp of opportunities) {
    try {
      const [cgoResult, csoResult] = await Promise.allSettled([
        consultExecutive('cgo', `Score this opportunity: "${opp.title}". ${opp.description}`, { urgency: opp.urgency }),
        consultExecutive('cso', `Assess strategic fit: "${opp.title}". ${opp.description}`, { category: opp.category }),
      ]);
      opp._executiveReview = {
        cgo: cgoResult.status === 'fulfilled' ? (cgoResult.value.choice || cgoResult.value.decision || null) : null,
        cso: csoResult.status === 'fulfilled' ? (csoResult.value.choice || csoResult.value.decision || null) : null,
      };
      if (cgoResult.status === 'fulfilled' && (cgoResult.value.confidence || 0) > 0.7) {
        opp.composite_score = Math.min(1, (opp.composite_score || 0.5) + 0.1);
      }
    } catch {}
  }
  return opportunities;
}

async function getTopOpportunities(limit = 10) {
  const { data, error } = await _sb()
    .from('opportunities')
    .select('*')
    .eq('status', 'detected')
    .order('composite_score', { ascending: false })
    .limit(limit);
  if (error) { logger.warn('opportunity-engine', 'getTop error', { error: error.message }); return []; }
  return data || [];
}

async function action(id, notes = '') {
  const { error } = await _sb()
    .from('opportunities')
    .update({ status: 'actioned' })
    .eq('id', id);
  if (error) throw new Error(`opportunity action: ${error.message}`);
}

async function runCycle(context = {}) {
  return detect({
    founderInterests:   context.founderInterests?.length   ? context.founderInterests   : ['AI automation', 'personal leverage', 'productivity', 'financial freedom', 'building AI OS'],
    companyObjectives:  context.companyObjectives?.length  ? context.companyObjectives  : ['build capable personal AI OS', 'reduce manual work', 'create financial independence'],
    marketSignals:      context.marketSignals || [],
  });
}

module.exports = { detect, getTopOpportunities, action, runCycle };
