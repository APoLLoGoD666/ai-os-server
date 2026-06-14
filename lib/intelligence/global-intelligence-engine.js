'use strict';
// lib/intelligence/global-intelligence-engine.js
// Reality-grounded intelligence pipeline.
// RULE: Every event must have real input signals with source attribution.
// scan() (synthetic model self-assessment) has been removed — it produced events without evidence.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

const DOMAINS = ['geopolitical', 'economic', 'ai_industry', 'technology', 'regulatory', 'news'];

const DOMAIN_PROMPTS = {
  geopolitical: 'Assess these geopolitical signals for their impact on a personal AI OS business. Focus on: trade policy, digital sovereignty, data residency, cloud infrastructure risk.',
  economic:     'Assess these economic signals for their impact on a bootstrapped AI product. Focus on: API cost trends, funding environment, consumer software spend.',
  ai_industry:  'Assess these AI industry signals. Focus on: model releases, API pricing changes, agent framework developments, capability shifts.',
  technology:   'Assess these technology signals for a Node.js AI OS. Focus on: new APIs, platform updates, voice AI, open-source developments.',
  regulatory:   'Assess these regulatory signals for AI products. Focus on: EU AI Act, US executive orders, data privacy law changes.',
  news:         'Assess these news signals for AI product opportunity. Focus on: big tech moves, acquisitions, emerging AI use cases.',
};

function _sb() { return getSupabaseClient(); }

// ingest — process real external signals for a domain.
// signals: array of { title, body, source, url, timestamp }
// Each signal is real external data supplied by the caller.
// Returns persisted civilization_event rows.
async function ingest(domain, signals = []) {
  if (!DOMAINS.includes(domain)) throw new Error(`Unknown domain: ${domain}`);
  if (!signals.length) {
    logger.debug('global-intelligence', 'ingest called with no signals — skipping', { domain });
    return [];
  }

  // Validate every signal has a source
  const validSignals = signals.filter(s => s.source && s.source !== 'unknown' && s.source !== 'model_scan');
  if (!validSignals.length) {
    logger.warn('global-intelligence', 'all signals missing source attribution — rejected', { domain, count: signals.length });
    return [];
  }

  const modelSelector = require('../models/selector');
  const model = modelSelector.select('balanced');

  const prompt = `${DOMAIN_PROMPTS[domain]}

Analyze these ${validSignals.length} real signal(s) and produce structured intelligence events.

SIGNALS:
${validSignals.map((s, i) => `[${i + 1}] ${s.title} (source: ${s.source}${s.url ? ', url: ' + s.url : ''})\n${(s.body || '').slice(0, 400)}`).join('\n\n')}

Return a JSON array of events. Each event must reference the signal(s) it came from:
[{
  "title": string,
  "summary": string (2-3 sentences, stating what happened, not speculation),
  "significance": number 0-1 (impact on APEX operations),
  "confidence": number 0-1 (based on source reliability and signal strength),
  "time_horizon": "immediate" | "short_term" | "medium_term" | "long_term",
  "affected_domains": string[],
  "signal_indices": number[] (1-based indices of signals that support this event)
}]

Only include events with significance >= 0.3. Return [] if nothing is significant.
Do not generate events for which there is no signal evidence.`;

  let rawEvents = [];
  try {
    const result = await model.complete(prompt, {}, { maxTokens: 1500 });
    const match = result.content.match(/\[[\s\S]*\]/);
    if (match) rawEvents = JSON.parse(match[0]);
  } catch (e) {
    logger.warn('global-intelligence', 'model parse failed', { domain, error: e.message });
    return [];
  }

  const rows = rawEvents.map(ev => {
    // Build evidence from the signals that support this event
    const supportingIndices = Array.isArray(ev.signal_indices) ? ev.signal_indices.map(i => i - 1) : [];
    const supportingSignals = supportingIndices.length
      ? supportingIndices.map(i => validSignals[i]).filter(Boolean)
      : validSignals; // if not specified, cite all input signals

    const evidence = {
      signals: supportingSignals.map(s => ({
        title:     s.title,
        source:    s.source,
        url:       s.url || null,
        timestamp: s.timestamp || null,
      })),
      analysis_method: 'model_structured_extraction',
    };

    return {
      category:           domain,
      title:              String(ev.title || '').slice(0, 200),
      summary:            String(ev.summary || '').slice(0, 1000),
      significance:       Math.max(0, Math.min(1, parseFloat(ev.significance) || 0.5)),
      confidence:         Math.max(0, Math.min(1, parseFloat(ev.confidence) || 0.7)),
      time_horizon:       ['immediate', 'short_term', 'medium_term', 'long_term'].includes(ev.time_horizon)
                            ? ev.time_horizon : 'medium_term',
      affected_domains:   Array.isArray(ev.affected_domains) ? ev.affected_domains : [],
      raw_signals:        validSignals.map(s => ({ title: s.title, source: s.source })),
      source:             validSignals.map(s => s.source).join(', ').slice(0, 500),
      evidence,
      is_synthetic:       false,
      input_signal_count: validSignals.length,
    };
  }).filter(r => r.title);

  if (!rows.length) return [];

  const { data, error } = await _sb().from('civilization_events').insert(rows).select();
  if (error) {
    logger.warn('global-intelligence', 'persist failed', { domain, error: error.message });
    return rows;
  }
  logger.debug('global-intelligence', 'ingested', { domain, count: rows.length, synthetic: false });
  return data || rows;
}

// ingestRaw — record a single pre-structured event with full evidence.
// Used by external integrations (webhooks, RSS parsers, API callers) that want
// to persist a fully-formed event without model processing.
async function ingestRaw(event) {
  const required = ['category', 'title', 'source'];
  for (const f of required) {
    if (!event[f]) throw new Error(`ingestRaw: missing required field "${f}"`);
  }
  if (!DOMAINS.includes(event.category)) throw new Error(`ingestRaw: unknown category "${event.category}"`);

  const row = {
    category:           event.category,
    title:              String(event.title).slice(0, 200),
    summary:            String(event.summary || '').slice(0, 1000),
    significance:       Math.max(0, Math.min(1, parseFloat(event.significance) || 0.5)),
    confidence:         Math.max(0, Math.min(1, parseFloat(event.confidence) || 0.7)),
    time_horizon:       ['immediate', 'short_term', 'medium_term', 'long_term'].includes(event.time_horizon)
                          ? event.time_horizon : 'medium_term',
    affected_domains:   Array.isArray(event.affected_domains) ? event.affected_domains : [],
    raw_signals:        event.raw_signals || [{ title: event.title, source: event.source }],
    source:             String(event.source).slice(0, 500),
    evidence:           event.evidence || { signals: [{ source: event.source, title: event.title }] },
    is_synthetic:       false,
    input_signal_count: 1,
  };

  const { data, error } = await _sb().from('civilization_events').insert(row).select().single();
  if (error) throw new Error(`ingestRaw: ${error.message}`);
  return data;
}

// getRecentEvents — query persisted events
async function getRecentEvents({ domain, minSignificance = 0, limit = 20, since, realOnly = false } = {}) {
  let q = _sb().from('civilization_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (domain) q = q.eq('category', domain);
  if (minSignificance > 0) q = q.gte('significance', minSignificance);
  if (since) q = q.gte('created_at', since);
  if (realOnly) q = q.eq('is_synthetic', false);

  const { data, error } = await q;
  if (error) { logger.warn('global-intelligence', 'getRecentEvents error', { error: error.message }); return []; }
  return data || [];
}

// getAlerts — high-significance real events
async function getAlerts() {
  return getRecentEvents({ minSignificance: 0.7, limit: 10, realOnly: true });
}

module.exports = { DOMAINS, ingest, ingestRaw, getRecentEvents, getAlerts };
