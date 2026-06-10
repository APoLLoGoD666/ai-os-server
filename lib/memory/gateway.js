'use strict';
// lib/memory/gateway.js
// All memory access in APEX flows through this module.
// No model, agent, or pipeline component reads memory directly.

const mem           = require('./index');
const AccessController = require('./access-controller');
const sanitizer     = require('./sanitizer');
const cache         = require('./cache');
const founderMemory = require('./founder-memory');
const { getSupabaseClient } = require('../clients');
const logger        = require('../logger');

const ctrl = new AccessController();

function _sb() { return getSupabaseClient(); }

// ─────────────────────────────────────────────────────────────────────────────
// getContext — assemble a full Context Package for a task
// ─────────────────────────────────────────────────────────────────────────────
async function getContext({ taskId, description, category, complexity,
                             modelFormat = 'claude', tokenBudget = 8000,
                             requestingEntity = 'orchestrator' }) {
  const assemblyId = `CTX-${Date.now()}`;
  const start = Date.now();

  ctrl.check(requestingEntity, [0, 10, 11], 'READ');

  const cacheKey = cache.key('ctx', { taskId, category, modelFormat });
  const hit = cache.get(cacheKey);
  if (hit) {
    _auditLog(requestingEntity, 'getContext', { cacheHit: true, taskId });
    return hit;
  }

  const [founderCtx, lessons, policies, historical, projectCtx] = await Promise.allSettled([
    _getFounderContext(requestingEntity),
    _getLessons(description, category, requestingEntity),
    _getPolicies(category, complexity, requestingEntity),
    _getHistorical(description, category, requestingEntity),
    _getProjectContext(requestingEntity),
  ]);

  const safe = (r, fallback) => r.status === 'fulfilled' ? r.value : fallback;

  const pkg = {
    assembly_id:      assemblyId,
    task_id:          taskId,
    assembled_at:     new Date().toISOString(),
    model_format:     modelFormat,
    token_budget:     tokenBudget,
    task:             { id: taskId, description, category, complexity },
    founder_context:  safe(founderCtx, founderMemory.FALLBACK_CONTEXT),
    project_context:  safe(projectCtx, { active_project: 'APEX AI OS', goals: [] }),
    historical_context: safe(historical, []),
    lessons:          safe(lessons, []),
    constraints:      safe(policies, { constraints: { cost_cap_usd: 2.00, timeout_ms: 45000, max_retries: 3 } }).constraints,
    policies:         safe(policies, { cognitive: { retrieval_limit: 15 } }).cognitive,
    assembly_metadata: {
      layers_queried: [0, 5, 7, 8, 10, 11],
      latency_ms:     Date.now() - start,
    },
  };

  cache.set(cacheKey, pkg, 60_000);
  _auditLog(requestingEntity, 'getContext', { assemblyId, taskId });
  return pkg;
}

// ─────────────────────────────────────────────────────────────────────────────
// searchMemory — cross-layer keyword + similarity search
// ─────────────────────────────────────────────────────────────────────────────
async function searchMemory({ query, layers = [9, 10], limit = 5,
                               requestingEntity = 'agent' }) {
  ctrl.check(requestingEntity, layers, 'READ');

  const cacheKey = cache.key('search', { query: query.slice(0, 80), layers, limit });
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const results = [];

  if (layers.includes(10)) {
    try {
      const { data } = await _sb()
        .from('apex_lessons')
        .select('id, content, tags, importance, created_at')
        .textSearch('content', query.split(' ').slice(0, 5).join(' | '), { type: 'plain' })
        .order('importance', { ascending: false })
        .limit(limit);
      results.push(...(data || []).map(l => ({ layer: 10, ...l })));
    } catch {
      // fallback: keyword match
      try {
        const { data } = await _sb()
          .from('apex_lessons')
          .select('id, content, tags, importance, created_at')
          .ilike('content', `%${query.slice(0, 60).replace(/%/g, '')}%`)
          .order('importance', { ascending: false })
          .limit(limit);
        results.push(...(data || []).map(l => ({ layer: 10, ...l })));
      } catch {}
    }
  }
  if (layers.includes(9)) {
    try {
      const facts = await mem.semanticMemory.search(query, { limit });
      results.push(...(facts || []).map(f => ({ layer: 9, ...f })));
    } catch {}
  }
  if (layers.includes(6)) {
    try {
      const procs = await mem.proceduralMemory.findProcedure(query, null, limit);
      results.push(...(procs || []).map(p => ({ layer: 6, ...p })));
    } catch {}
  }
  if (layers.includes(2)) {
    try {
      const episodes = await mem.episodicMemory.findSimilar(query, { limit });
      results.push(...(episodes || []).map(e => ({ layer: 2, ...e })));
    } catch {}
  }
  if (layers.includes(7)) {
    try {
      const decisions = await mem.decisionMemory.findSimilar(query, { limit });
      results.push(...(decisions || []).map(d => ({ layer: 7, ...d })));
    } catch {}
  }

  const sanitized = results.map(r => ({
    ...r,
    content: sanitizer.sanitize(typeof r.content === 'string' ? r.content : JSON.stringify(r.content || '')),
  }));

  cache.set(cacheKey, sanitized, 120_000);
  _auditLog(requestingEntity, 'searchMemory', { layers, count: sanitized.length });
  return sanitized;
}

// ─────────────────────────────────────────────────────────────────────────────
// storeMemory — write to a specific layer via the gateway
// ─────────────────────────────────────────────────────────────────────────────
async function storeMemory({ layer, content, tags = [], source, taskId,
                              importance = 5, requestingEntity = 'agent' }) {
  ctrl.check(requestingEntity, [layer], 'WRITE');

  if (layer === 0) ctrl.checkElevated(requestingEntity, 'FOUNDER_WRITE');

  const sanitized = sanitizer.sanitize(typeof content === 'string' ? content : JSON.stringify(content));

  let result;
  switch (layer) {
    case 10: result = await _storeLesson(sanitized, tags, source, taskId, importance); break;
    case 2:  result = await _storeEpisode(sanitized, tags, source, taskId); break;
    case 7:  result = await mem.decisionMemory.storeDecision(
               `gw-${Date.now()}`, 'general', { context: sanitized, source }, { source }); break;
    case 9:  result = await mem.semanticMemory.storeFact(sanitized, 'general', { source, evidence: source }); break;
    case 6:  result = await mem.proceduralMemory.storeProcedure(
               `stored-${Date.now()}`, 'general', [{ step: 1, action: sanitized }], { source }); break;
    case 5:  result = await mem.strategicMemory.storeStrategicItem(
               `stored-${Date.now()}`, 'direction', sanitized, 'medium_term', { source }); break;
    case 0:  result = await founderMemory.update({ content: sanitized, tags, source, importance }); break;
    default: throw new Error(`Gateway: no write handler for layer ${layer}`);
  }

  if (layer === 10) cache.invalidatePattern('lessons');
  if (layer === 11) cache.invalidatePattern('policies');
  if (layer === 0)  cache.invalidatePattern('founder');

  _auditLog(requestingEntity, 'storeMemory', { layer, source, taskId, importance });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// retrievePolicies — active cognitive policies for a task
// ─────────────────────────────────────────────────────────────────────────────
async function retrievePolicies({ taskCategory, complexity,
                                   requestingEntity = 'orchestrator' }) {
  ctrl.check(requestingEntity, [11], 'READ');

  const cacheKey = cache.key('policies', { taskCategory, complexity });
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const { data, error } = await _sb()
    .from('cognitive_policy_settings')
    .select('*')
    .in('applies_to', [taskCategory, 'all'])
    .eq('active', true);

  if (error || !data?.length) {
    logger.warn('gateway', 'policy read failed, using defaults', { error: error?.message });
    return _defaultPolicies(complexity);
  }

  const policies = _buildPolicyMap(data, complexity);
  cache.set(cacheKey, policies, 60_000);
  _auditLog(requestingEntity, 'retrievePolicies', { taskCategory, complexity });
  return policies;
}

// ─────────────────────────────────────────────────────────────────────────────
// retrieveLessons — relevant lessons for a domain/tags
// ─────────────────────────────────────────────────────────────────────────────
async function retrieveLessons({ domain, tags = [], limit = 8,
                                  requestingEntity = 'agent' }) {
  ctrl.check(requestingEntity, [10], 'READ');

  const cacheKey = cache.key('lessons', { domain, tags, limit });
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const queryTags = tags.length ? tags : [domain];
  const { data, error } = await _sb()
    .from('apex_lessons')
    .select('id, content, tags, importance, created_at')
    .contains('tags', queryTags)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const lessons = data.map(l => ({
    ...l,
    content: sanitizer.sanitize(l.content),
    recency_weight: _recencyWeight(l.created_at),
  }));

  cache.set(cacheKey, lessons, 300_000);
  _auditLog(requestingEntity, 'retrieveLessons', { domain, count: lessons.length });
  return lessons;
}

// ─────────────────────────────────────────────────────────────────────────────
// retrieveFounderContext — Layer 0 read
// ─────────────────────────────────────────────────────────────────────────────
async function retrieveFounderContext({ domain = 'all', requestingEntity = 'orchestrator' }) {
  ctrl.check(requestingEntity, [0], 'READ');
  return founderMemory.getContext(domain);
}

// ─────────────────────────────────────────────────────────────────────────────
// summarizeMemory — submit content for consolidation
// ─────────────────────────────────────────────────────────────────────────────
async function summarizeMemory({ layer, filter, requestingEntity = 'consolidation_engine' }) {
  ctrl.check(requestingEntity, [layer], 'SUMMARIZE');
  // Submit to consolidation queue; processing happens async via cron
  return mem.consolidationEngine.submit('gateway', `layer-${layer}`, JSON.stringify(filter || {}), 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────
async function _getFounderContext(requestingEntity) {
  try {
    const founderOS = require('../founder/context-provider');
    return await founderOS.getContext('', { entityId: requestingEntity || 'gateway' });
  } catch {
    return founderMemory.getContext('all');
  }
}

async function _getLessons(description, category, requestingEntity) {
  return retrieveLessons({ domain: category, tags: _extractTags(description), limit: 8, requestingEntity });
}

async function _getPolicies(category, complexity, requestingEntity) {
  return retrievePolicies({ taskCategory: category, complexity, requestingEntity });
}

async function _getHistorical(description, category, requestingEntity) {
  return searchMemory({ query: description, layers: [2, 7], limit: 5, requestingEntity });
}

async function _getProjectContext() {
  try {
    const contextBlock = await mem.strategicMemory.getContextBlock(3);
    return { active_project: 'APEX AI OS', goals: contextBlock || [] };
  } catch {
    return { active_project: 'APEX AI OS', goals: [] };
  }
}

async function _storeLesson(content, tags, source, taskId, importance) {
  const id = `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await _sb().from('apex_lessons').insert({
    id, content, tags, source,
    task_id: taskId,
    importance,
    trace_id: taskId ? `trace-${taskId}` : null,
  });
  if (error) throw new Error(`gateway storeLesson: ${error.message}`);
  return { id };
}

async function _storeEpisode(content, tags, source, taskId) {
  return mem.episodicMemory.storeEpisode({
    objective:       content,
    success:         true,
    outcomesSummary: content,
    source,
    taskId,
  });
}

function _recencyWeight(createdAt) {
  const daysSince = (Date.now() - new Date(createdAt)) / 86_400_000;
  return Math.max(0.5, 1.0 - (daysSince / 90) * 0.3);
}

function _extractTags(description) {
  const keywords = ['gmail', 'email', 'timeout', 'supabase', 'auth', 'deploy',
                    'render', 'github', 'voice', 'gemini', 'claude', 'cron',
                    'governance', 'memory', 'pipeline', 'database', 'migration'];
  const lower = description.toLowerCase();
  return keywords.filter(k => lower.includes(k));
}

function _defaultPolicies(complexity) {
  return {
    constraints: { cost_cap_usd: 2.00, timeout_ms: 45000, max_retries: 3 },
    cognitive: {
      retrieval_limit:        15,
      planning_strategy:      'systematic',
      autonomy_level:         0.5,
      fail_closed_threshold:  complexity === 'critical' ? 'critical' : 'complex',
    },
  };
}

function _buildPolicyMap(rows, complexity) {
  const map = {
    constraints: { cost_cap_usd: 2.00, timeout_ms: 45000, max_retries: 3 },
    cognitive:   {},
  };
  for (const row of rows) {
    map.cognitive[row.policy_name] = row.policy_value ?? row.proposed_value;
  }
  if (!map.cognitive.retrieval_limit) map.cognitive.retrieval_limit = 15;
  return map;
}

async function _auditLog(entity, operation, meta) {
  logger.debug('gateway', operation, { entity, ...meta });
  if (operation === 'storeMemory' && (meta.layer === 0 || meta.layer === 11)) {
    try {
      const gov = require('../governance');
      await gov.appendEvidenceBlock({
        type: 'memory_write', entity, operation,
        layer: meta.layer, taskId: meta.taskId,
        timestamp: new Date().toISOString(),
      }, 'memory');
    } catch {}
  }
}

module.exports = {
  getContext,
  searchMemory,
  storeMemory,
  retrievePolicies,
  retrieveLessons,
  retrieveFounderContext,
  summarizeMemory,
};
