'use strict';
// lib/intelligence/value-creation-engine.js
// Measures whether APEX creates more value than it consumes.
// All numbers are derived from real database rows — no estimates, no projections.
// Revenue: $0 (APEX is a personal OS with no revenue mechanism implemented).
// Cost: real API spend from apex_agent_runs.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

// recordEvent — persist a value creation or cost event with evidence
async function recordEvent({ eventType, opportunityId = null, description, valueUsd = 0, costUsd = 0, evidence = {} }) {
  const validTypes = ['capability_added', 'automation_deployed', 'cost_saved', 'cost_incurred', 'opportunity_actioned', 'opportunity_detected'];
  if (!validTypes.includes(eventType)) throw new Error(`Unknown eventType: ${eventType}`);

  const roi         = costUsd > 0 ? (valueUsd - costUsd) / costUsd : null;
  const paybackDays = valueUsd > 0 && costUsd > 0 ? Math.round((costUsd / valueUsd) * 365) : null;

  const { data, error } = await _sb()
    .from('value_creation_events')
    .insert({
      event_type:     eventType,
      opportunity_id: opportunityId,
      description:    String(description).slice(0, 500),
      value_usd:      parseFloat(valueUsd) || 0,
      cost_usd:       parseFloat(costUsd) || 0,
      roi,
      payback_days:   paybackDays,
      evidence,
    })
    .select()
    .single();

  if (error) {
    logger.warn('value-creation', 'record failed', { error: error.message });
    return null;
  }
  return data;
}

// computeNetValue — real P&L from database sources only
async function computeNetValue({ since } = {}) {
  const sb = _sb();

  // Real cost: apex_agent_runs
  let costQuery = sb.from('apex_agent_runs').select('cost_usd, success, created_at');
  if (since) costQuery = costQuery.gte('created_at', since);
  const { data: runs, error: runsErr } = await costQuery;

  if (runsErr) {
    logger.warn('value-creation', 'apex_agent_runs query failed', { error: runsErr.message });
    return null;
  }

  const runRows    = runs || [];
  const totalCost  = runRows.reduce((s, r) => s + (parseFloat(r.cost_usd) || 0), 0);
  const successRuns = runRows.filter(r => r.success).length;

  // Real opportunity counts from opportunities table
  const [detected, actioned] = await Promise.allSettled([
    sb.from('opportunities').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
    sb.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'actioned').then(r => r.count || 0),
  ]);

  const opportunitiesDetected = detected.status  === 'fulfilled' ? detected.value  : null;
  const opportunitiesActioned = actioned.status  === 'fulfilled' ? actioned.value  : null;

  // Value creation events from our own table
  let vceQuery = sb.from('value_creation_events').select('value_usd, cost_usd, event_type');
  if (since) vceQuery = vceQuery.gte('recorded_at', since);
  const { data: vceRows } = await vceQuery;

  const totalValueTracked = (vceRows || []).reduce((s, r) => s + (parseFloat(r.value_usd) || 0), 0);
  const totalCostTracked  = (vceRows || []).reduce((s, r) => s + (parseFloat(r.cost_usd) || 0), 0);

  // Revenue: APEX has no revenue mechanism — honest zero
  const revenueUsd = 0;

  return {
    revenue_usd:              revenueUsd,
    revenue_note:             'No revenue mechanism implemented. APEX is a personal OS.',
    api_cost_usd:             parseFloat(totalCost.toFixed(4)),
    net_value_usd:            parseFloat((revenueUsd - totalCost).toFixed(4)),
    runs_total:               runRows.length,
    runs_successful:          successRuns,
    opportunities_detected:   opportunitiesDetected,
    opportunities_actioned:   opportunitiesActioned,
    tracked_value_events:     (vceRows || []).length,
    tracked_value_total_usd:  parseFloat(totalValueTracked.toFixed(4)),
    tracked_cost_total_usd:   parseFloat(totalCostTracked.toFixed(4)),
    measurement_period_since: since || 'all time',
  };
}

// getValueEvents — query persisted value events
async function getValueEvents({ eventType = null, limit = 20 } = {}) {
  let q = _sb()
    .from('value_creation_events')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (eventType) q = q.eq('event_type', eventType);

  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

// recordOpportunityDetected — called when opportunity-engine detects new opportunities
async function recordOpportunityDetected(count, evidenceCount) {
  if (count <= 0) return;
  return recordEvent({
    eventType:   'opportunity_detected',
    description: `${count} opportunities detected from ${evidenceCount} evidence sources`,
    valueUsd:    0,
    costUsd:     0,
    evidence:    { count, evidenceCount, source: 'opportunity_engine' },
  });
}

// recordOpportunityActioned — called when an opportunity is marked actioned
async function recordOpportunityActioned(opportunityId, title) {
  return recordEvent({
    eventType:     'opportunity_actioned',
    opportunityId,
    description:   `Opportunity actioned: ${String(title || '').slice(0, 200)}`,
    valueUsd:      0,  // actual value must be measured separately after execution
    costUsd:       0,
    evidence:      { opportunity_id: opportunityId, actioned_at: new Date().toISOString() },
  });
}

module.exports = { recordEvent, computeNetValue, getValueEvents, recordOpportunityDetected, recordOpportunityActioned };
