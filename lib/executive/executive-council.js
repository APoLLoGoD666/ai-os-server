'use strict';
// lib/executive/executive-council.js
// Council deliberation: all executives vote, produce a final recommendation.
// Persists to executive_deliberations + executive_votes tables.

const { getSupabaseClient } = require('../clients');
const { ENTITIES, escalateToFounder } = require('./registry');
const logger = require('../logger');

const COUNCIL_ORDER = ['ceo', 'cto', 'cfo', 'coo', 'cso', 'cio', 'cgo'];
// CEO is the Founder/system voice; we synthesize their position from the other votes.
const VOTING_ENTITIES = ['cto', 'cfo', 'coo', 'cso', 'cio', 'cgo'];

function _sb() { return getSupabaseClient(); }

// Deliberate a question across the full council.
// Returns { deliberationId, recommendation, votes, consensusLevel, escalate }
async function deliberate(question, context = {}) {
  // Create deliberation record first
  const { data: delib, error: delibErr } = await _sb()
    .from('executive_deliberations')
    .insert({
      question:     question.slice(0, 500),
      context:      context,
      participants: VOTING_ENTITIES,
      discussion:   [],
      status:       'deliberating',
    })
    .select()
    .single();

  if (delibErr) {
    logger.warn('executive-council', 'deliberation create failed', { error: delibErr.message });
  }

  const deliberationId = delib?.id || `delib-${Date.now()}`;

  // All 6 voting executives decide in parallel
  const voteResults = await Promise.allSettled(
    VOTING_ENTITIES.map(entityId => _castVote(entityId, question, context, deliberationId))
  );

  const votes = voteResults
    .map((r, i) => r.status === 'fulfilled' ? r.value : { entityId: VOTING_ENTITIES[i], vote: 'abstain', confidence: 0, rationale: 'error' })
    .filter(Boolean);

  // Persist votes
  await _persistVotes(votes, deliberationId);

  // Track each exec's vote as a performance recommendation (fire-and-forget)
  setImmediate(async () => {
    try {
      const perf = require('../intelligence/executive-performance-engine');
      await Promise.allSettled(votes.map(v =>
        perf.recordRecommendation({
          entityId:        v.entityId,
          recommendation:  String(v.rationale || v.vote).slice(0, 500),
          decisionId:      deliberationId,
          confidenceAtTime: v.confidence || 0.7,
          decisionType:    /approve|yes|proceed|go|accept/i.test(v.vote) ? 'approved'
                         : /reject|no|hold|deny|stop|block/i.test(v.vote) ? 'rejected' : 'pending',
          category:        'strategic',
          contextSummary:  question.slice(0, 300),
        })
      ));
    } catch {}
  });

  // Synthesize final recommendation
  const { recommendation, consensusLevel, escalate } = await _synthesize(question, votes, context);

  // Update deliberation
  const discussion = votes.map(v => ({ entity: v.entityId, vote: v.vote, rationale: String(v.rationale || '').slice(0, 300) }));
  await _sb()
    .from('executive_deliberations')
    .update({
      discussion,
      final_recommendation: recommendation,
      consensus_level:      consensusLevel,
      status:               escalate ? 'escalated' : 'resolved',
      resolved_at:          new Date().toISOString(),
    })
    .eq('id', deliberationId);

  if (escalate) {
    await escalateToFounder(question, context, 'council_escalation');
  }

  // Track decision for outcome measurement
  setImmediate(async () => {
    try {
      const outcomes = require('../intelligence/decision-outcome-engine');
      await outcomes.recordCouncilDecision(deliberationId, question, recommendation);
    } catch {}
  });

  // Phase 3 — Executive Institutional Memory: persist to gateway for long-term memory
  setImmediate(async () => {
    try {
      const domainMem = require('./domain-memory');
      await domainMem.recordCouncilDecision({ question, recommendation, votes, consensusLevel, deliberationId });
      await domainMem.recordDomainLessons({ question, recommendation, votes, deliberationId });
    } catch {}
  });

  logger.debug('executive-council', 'deliberation complete', { deliberationId, consensusLevel, escalate });
  return { deliberationId, recommendation, votes, consensusLevel, escalate };
}

async function _castVote(entityId, question, context, deliberationId) {
  if (!ENTITIES[entityId]) return null;
  try {
    const decision = await ENTITIES[entityId].decide(question, { ...context, deliberationId });
    return {
      entityId,
      vote:       decision.choice || decision.decision || 'no_vote',
      rationale:  decision.rationale || '',
      confidence: decision.confidence || 0.7,
      escalate:   decision.escalate || false,
    };
  } catch (e) {
    logger.warn('executive-council', 'vote failed', { entityId, error: e.message });
    return { entityId, vote: 'abstain', confidence: 0, rationale: `error: ${e.message}` };
  }
}

async function _persistVotes(votes, deliberationId) {
  if (!votes.length) return;
  const rows = votes.map(v => ({
    deliberation_id: deliberationId,
    entity_id:       v.entityId,
    vote:            String(v.vote).slice(0, 200),
    rationale:       String(v.rationale || '').slice(0, 500),
    confidence:      v.confidence || 0.7,
  }));
  const { error } = await _sb().from('executive_votes').insert(rows);
  if (error) logger.warn('executive-council', 'vote persist failed', { error: error.message });
}

async function _synthesize(question, votes, context) {
  const modelSelector = require('../models/selector');
  const model = modelSelector.select('balanced');

  const voteSummary = votes.map(v =>
    `${v.entityId.toUpperCase()}: ${v.vote} (confidence=${v.confidence.toFixed(2)}) — ${String(v.rationale || '').slice(0, 200)}`
  ).join('\n');

  const anyEscalate = votes.some(v => v.escalate);
  const avgConfidence = votes.reduce((s, v) => s + (v.confidence || 0), 0) / Math.max(votes.length, 1);

  // Simple consensus: count non-abstain votes that contain approve/yes/proceed vs reject/hold/deny
  const approveCount = votes.filter(v => /approve|yes|proceed|go|positive|accept/i.test(v.vote)).length;
  const rejectCount  = votes.filter(v => /reject|no|hold|deny|stop|block/i.test(v.vote)).length;
  const consensusLevel = Math.abs(approveCount - rejectCount) / Math.max(votes.length, 1);

  let alignmentGuidance = '';
  try {
    const founderOS = require('../founder/context-provider');
    alignmentGuidance = await founderOS.getAlignmentGuidanceForPrompt(question);
  } catch {}

  const prompt = `You are the CEO of APEX, synthesizing a council decision.

${alignmentGuidance ? `Founder alignment guidance:\n${alignmentGuidance}\n\n` : ''}Question: ${question}

Council votes:
${voteSummary}

${approveCount} approve, ${rejectCount} reject, ${votes.length - approveCount - rejectCount} abstain/mixed.
Average confidence: ${avgConfidence.toFixed(2)}

Provide a concise final recommendation (2-3 sentences) that:
1. States the decision (approve/reject/hold/conditional)
2. Names the key condition or action required
3. Names who owns execution

Return plain text, no JSON.`;

  let recommendation = '';
  try {
    const result = await model.complete(prompt, {}, { maxTokens: 300 });
    recommendation = result.content.trim();
  } catch {
    recommendation = rejectCount > approveCount
      ? `Council majority rejects. ${votes.find(v => /reject|hold/i.test(v.vote))?.rationale || 'Insufficient approval.'}`
      : `Council majority approves. Primary owner: ${votes.sort((a,b) => b.confidence - a.confidence)[0]?.entityId?.toUpperCase() || 'CSO'}.`;
  }

  return { recommendation, consensusLevel, escalate: anyEscalate || (avgConfidence < 0.45) };
}

// Get recent deliberations
async function getRecentDeliberations(limit = 10) {
  const { data, error } = await _sb()
    .from('executive_deliberations')
    .select('*, executive_votes(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { logger.warn('executive-council', 'get error', { error: error.message }); return []; }
  return data || [];
}

module.exports = { deliberate, getRecentDeliberations };
