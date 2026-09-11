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

// Domain classification — picks the most relevant domain agent to brief the council
const _DOMAIN_PATTERNS = [
    { slug: 'finance',      re: /finance|budget|spend|cost|invoice|revenue|money|payment|transaction|profit|loss|cashflow/i },
    { slug: 'system',       re: /system|deploy|render|server|pipeline|database|infra|technical|code|build|uptime|error|performance/i },
    { slug: 'business',     re: /business|client|crm|project|proposal|sales|customer|deal|contract/i },
    { slug: 'uni',          re: /university|study|assignment|module|academic|coursework|exam|lecture/i },
    { slug: 'civilisation', re: /genome|constitutional|consensus|domain health|civilisation|civilization|governance|clock/i },
    { slug: 'file',         re: /file|document|vault|obsidian|knowledge|wiki|note/i },
];

function _classifyDomain(question) {
    for (const { slug, re } of _DOMAIN_PATTERNS) {
        if (re.test(question)) return slug;
    }
    return null;
}

// Query the relevant domain agent for a factual operational briefing before the council votes.
// Uses council=true to skip escalation and prevent loops.
async function _gatherDomainContext(question) {
    const slug = _classifyDomain(question);
    if (!slug) return '';
    try {
        const { invokeDomainAgent } = require('../../agent-system/domain-agents');
        const { reply } = await invokeDomainAgent(slug,
            `The Supreme Council is deliberating: "${question.slice(0, 200)}"\n\nProvide a factual 3-sentence operational briefing from your domain. Be specific and data-focused.`,
            { maxTokens: 200, council: true }
        );
        return reply ? `\n\n[${slug.toUpperCase()} DOMAIN BRIEFING]\n${reply.trim()}` : '';
    } catch { return ''; }
}

// After a council decision, always create an awaiting-approval task for the founder to review.
async function _createCouncilTask(taskTitle, recommendation, deliberationId, dispatch) {
    try {
        const title = (taskTitle || (dispatch?.action) || recommendation || 'Council decision').slice(0, 200);
        const newId = `COUNCIL-${String(Date.now()).slice(-6)}`;
        await _sb().from('apex_tasks').insert({
            id:       newId,
            title,
            status:   'awaiting_approval',
            metadata: {
                type:           dispatch?.slug ? 'council_dispatch' : 'council_recommendation',
                deliberationId,
                dispatch:       dispatch || null,
                recommendation: recommendation ? recommendation.slice(0, 800) : null,
                task_title:     taskTitle || null,
            },
        });
    } catch (e) {
        logger.warn('executive-council', 'council task creation failed', { error: e.message });
    }
}

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

  // Gather live domain intelligence to brief the council before voting
  const domainContext = await _gatherDomainContext(question);

  // All 6 voting executives decide in parallel — with domain context included
  const voteResults = await Promise.allSettled(
    VOTING_ENTITIES.map(entityId => _castVote(entityId, question, { ...context, domainContext }, deliberationId))
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
  const { recommendation, taskTitle, consensusLevel, escalate, dispatch } = await _synthesize(question, votes, context);

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

  // Create an awaiting-approval task for actionable council decisions (awaited — not fire-and-forget)
  await _createCouncilTask(taskTitle, recommendation, deliberationId, dispatch);

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
    // Enrich the question with live domain context so executives vote on real data
    const enrichedQuestion = context.domainContext
        ? `${question}${context.domainContext}`
        : question;
    const decision = await ENTITIES[entityId].decide(enrichedQuestion, { ...context, deliberationId });
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

const _VALID_DISPATCH_SLUGS = ['finance', 'system', 'business', 'uni', 'civilisation', 'file'];

async function _synthesize(question, votes, context) {
  const runtime = require('../models/runtime');

  const voteSummary = votes.map(v =>
    `${v.entityId.toUpperCase()}: ${v.vote} (confidence=${v.confidence.toFixed(2)}) — ${String(v.rationale || '').slice(0, 200)}`
  ).join('\n');

  const anyEscalate = votes.some(v => v.escalate);
  const avgConfidence = votes.reduce((s, v) => s + (v.confidence || 0), 0) / Math.max(votes.length, 1);

  const approveCount = votes.filter(v => /approve|yes|proceed|go|positive|accept/i.test(v.vote)).length;
  const rejectCount  = votes.filter(v => /reject|no|hold|deny|stop|block/i.test(v.vote)).length;
  const consensusLevel = Math.abs(approveCount - rejectCount) / Math.max(votes.length, 1);

  let alignmentGuidance = '';
  try {
    const founderOS = require('../founder/context-provider');
    alignmentGuidance = await founderOS.getAlignmentGuidanceForPrompt(question);
  } catch {}

  const { getManifest: _getManifest } = require('../apex-self-manifest');
  const prompt = `${_getManifest()}\n\nYou are the CEO of APEX, synthesizing a council decision.

${alignmentGuidance ? `Founder alignment guidance:\n${alignmentGuidance}\n\n` : ''}Question: ${question}

Council votes:
${voteSummary}

${approveCount} approve, ${rejectCount} reject, ${votes.length - approveCount - rejectCount} abstain/mixed.
Average confidence: ${avgConfidence.toFixed(2)}

Respond with ONLY valid JSON (no markdown, no prose outside it):
{
  "recommendation": "<2-3 sentence strategic decision: what was decided, key condition, who owns execution>",
  "task_title": "<imperative action, max 80 chars, starts with a verb — this is what the founder will see in the approval queue, e.g. 'Audit pipeline failures and submit root-cause report within 24h'>",
  "dispatch": {
    "slug": "<one of: finance, system, business, uni, civilisation, file — or null if no domain action required>",
    "action": "<specific instruction for the domain agent, or null>"
  }
}`;

  let recommendation = '';
  let taskTitle = '';
  let dispatch = null;
  try {
    const { result } = await runtime.execute({ tier: 'balanced', caller: 'executive-council', messages: [{ role: 'user', content: prompt }], maxTokens: 500 });
    const raw = (result.content[0]?.text || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      recommendation = (parsed.recommendation || '').trim();
      taskTitle      = (parsed.task_title     || '').trim();
      const d = parsed.dispatch || {};
      if (d.slug && _VALID_DISPATCH_SLUGS.includes(d.slug) && d.action) {
        dispatch = { slug: d.slug, action: String(d.action).slice(0, 500) };
      }
    } else {
      recommendation = raw.slice(0, 400);
    }
  } catch {
    recommendation = rejectCount > approveCount
      ? `Council majority rejects. ${votes.find(v => /reject|hold/i.test(v.vote))?.rationale || 'Insufficient approval.'}`
      : `Council majority approves. Primary owner: ${votes.sort((a,b) => b.confidence - a.confidence)[0]?.entityId?.toUpperCase() || 'CSO'}.`;
  }

  return { recommendation, taskTitle, consensusLevel, escalate: anyEscalate || (avgConfidence < 0.45), dispatch };
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
