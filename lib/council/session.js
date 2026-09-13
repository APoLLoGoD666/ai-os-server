'use strict';
// lib/council/session.js — Supreme Council weekly strategic session (Stage 4)

const log = require('../logger');
function _sb() { return require('../clients').getSupabaseClient(); }

async function runWeeklySession() {
  const council = require('../executive/executive-council');
  const ts = new Date().toISOString();

  // Gather civilization context
  let healthScore = null, healthDimensions = {};
  try {
    const { data } = await _sb()
      .from('civilization_health_snapshots')
      .select('overall_score, dimensions')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    healthScore      = data?.overall_score ?? null;
    healthDimensions = data?.dimensions    || {};
  } catch {}

  let topOpportunities = [];
  try {
    const { data } = await _sb()
      .from('opportunities')
      .select('title, category, roi_score')
      .eq('status', 'identified')
      .order('roi_score', { ascending: false })
      .limit(5);
    topOpportunities = data || [];
  } catch {}

  let weeklyFailures = 0;
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await _sb()
      .from('cron_run_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'error')
      .gte('started_at', since);
    weeklyFailures = count || 0;
  } catch {}

  const oppSummary = topOpportunities.length
    ? `Top opportunities: ${topOpportunities.map(o => `${o.title} (ROI: ${Number(o.roi_score || 0).toFixed(1)})`).join(', ')}.`
    : 'No opportunities identified this cycle.';

  // Rotate topic each week so the council deliberates different domains cyclically
  const WEEKLY_TOPICS = [
    { type: 'strategic',     focus: 'highest-priority strategic decisions and resource allocation for the coming week',                               dispatch_hint: 'civilisation' },
    { type: 'financial',     focus: 'treasury health, budget efficiency, and upcoming financial commitments or risks',                                dispatch_hint: 'finance'      },
    { type: 'operational',   focus: 'process bottlenecks, delivery performance improvements, and cross-department coordination',                     dispatch_hint: 'system'       },
    { type: 'intelligence',  focus: 'knowledge gaps, research priorities, and what APEX should learn, document, or synthesize this week',             dispatch_hint: 'file'         },
    { type: 'governance',    focus: 'constitutional compliance, outstanding audit items, and governance protocol improvements',                       dispatch_hint: 'civilisation' },
    { type: 'growth',        focus: 'revenue opportunities, market positioning, client pipeline, and capability expansion',                          dispatch_hint: 'business'     },
    { type: 'technology',    focus: 'system reliability, infrastructure health, technical debt, and build pipeline stability',                        dispatch_hint: 'system'       },
  ];
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const topic = WEEKLY_TOPICS[weekNum % WEEKLY_TOPICS.length];

  const agenda = [
    `Weekly ${topic.type.charAt(0).toUpperCase() + topic.type.slice(1)} Council Session — ${new Date().toUTCString()}`,
    healthScore != null ? `Civilization health: ${healthScore}/100` : 'Health score: unavailable',
    oppSummary,
    weeklyFailures > 0 ? `Cron failures this week: ${weeklyFailures}` : 'All systems operational.',
    `Topic focus: ${topic.type}`,
  ].join('\n');

  const question = [
    `You are convening the weekly APEX Supreme Council session. This week's focus: ${topic.type.toUpperCase()}.`,
    healthScore != null ? ` Civilization health is ${healthScore}/100.` : '',
    ` ${oppSummary}`,
    weeklyFailures > 0 ? ` There were ${weeklyFailures} system failures this week.` : '',
    ` What are the most important actions and decisions regarding ${topic.focus}?`,
    ` Be specific, actionable, and reference real data. Assign clear ownership.`,
  ].join('');

  const context = {
    session_type:      `weekly_${topic.type}`,
    topic:             topic.type,
    dispatch_hint:     topic.dispatch_hint,
    health_score:      healthScore,
    health_dimensions: healthDimensions,
    top_opportunities: topOpportunities,
    weekly_failures:   weeklyFailures,
  };

  const result = await council.deliberate(question, context);

  // Persist session record
  const sessionId = `CS-${ts.slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`;
  await _sb().from('council_sessions').insert({
    id:              sessionId,
    session_type:    `weekly_${topic.type}`,
    agenda,
    context,
    health_score:    healthScore,
    status:          result.escalate ? 'escalated' : 'completed',
    deliberation_id: result.deliberationId,
    recommendation:  result.recommendation,
    consensus_level: result.consensusLevel,
    escalated:       result.escalate || false,
    participants:    ['ceo', 'cto', 'cfo', 'coo', 'cso', 'cio', 'cgo'],
  });

  // Extract decisions from recommendation text
  const decisions = (result.recommendation || '')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15)
    .slice(0, 5)
    .map((desc, i) => ({
      session_id:    sessionId,
      decision_type: 'strategic',
      description:   desc,
      priority:      i + 1,
      status:        'pending',
    }));

  if (decisions.length) {
    await _sb().from('council_decisions').insert(decisions);
  }

  log.info('council-session', 'Weekly session complete', {
    sessionId,
    consensusLevel: result.consensusLevel,
    escalated:      result.escalate,
    decisions:      decisions.length,
  });

  return { sessionId, recommendation: result.recommendation, decisions: decisions.length };
}

module.exports = { runWeeklySession };
