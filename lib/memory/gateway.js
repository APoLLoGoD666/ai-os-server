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
const healthMonitor = require('../health/monitor');

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

  // Layer 0 (founder) is checked per-entity inside _getFounderContext.
  // Layers 10 and 11 (lessons/improvements) are readable by AGENT class and above.
  ctrl.check(requestingEntity, [10, 11], 'READ');

  const cacheKey = cache.key('ctx', { taskId, category, modelFormat });
  const hit = cache.get(cacheKey);
  if (hit) {
    _auditLog(requestingEntity, 'getContext', { cacheHit: true, taskId });
    return hit;
  }

  const [founderCtx, lessons, policies, historical, projectCtx, semanticFacts, workingMem, skillMem, kgNodes, sieResult, execVerdicts] = await Promise.allSettled([
    _getFounderContext(requestingEntity),
    _getLessons(description, category, requestingEntity),
    _getPolicies(category, complexity, requestingEntity),
    _getHistorical(description, category, requestingEntity),
    _getProjectContext(requestingEntity),
    _getSemanticFacts(description, requestingEntity),
    _getWorkingMemory(taskId),
    _getSkillSummary(description, category),
    _getKnowledgeNodes(description),
    _getSIEBriefing(description),
    _getExecutiveVerdicts(category),
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
    semantic_facts:   safe(semanticFacts, []),
    working_memory:   safe(workingMem, []),
    skill_context:    safe(skillMem, []),
    knowledge_nodes:       safe(kgNodes, []),
    strategic_intelligence: safe(sieResult, null),
    executive_history:      safe(execVerdicts, []),
    constraints:      safe(policies, { constraints: { cost_cap_usd: parseFloat(process.env.PIPELINE_BUDGET_USD || '2.00'), timeout_ms: 45000, max_retries: 3 } }).constraints,
    policies:         safe(policies, { cognitive: { retrieval_limit: 15 } }).cognitive,
    assembly_metadata: {
      layers_queried: [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 'sie', 'exec_verdicts'],
      latency_ms:     Date.now() - start,
    },
  };

  cache.set(cacheKey, pkg, 60_000);
  _auditLog(requestingEntity, 'getContext', { assemblyId, taskId });
  require('../consumption-log').record({ subsystem: 'memory.gateway', output_key: 'context', consumer: requestingEntity || 'unknown', task_id: taskId });

  // Reflexion tracking — record every retrieved lesson
  if (pkg.lessons && pkg.lessons.length) {
    const _rfx = require('./reflexion-tracker');
    setImmediate(() => {
      for (const l of pkg.lessons) {
        if (l.content) _rfx.recordRetrieval(l.content)
          .then(() => healthMonitor.recordReflexionWrite(true))
          .catch(err => {
            healthMonitor.recordReflexionWrite(false);
            logger.warn('gateway', 'recordRetrieval failed', { error: err.message });
          });
      }
    });
  }

  // Phase 5 — Lesson-to-task linkage: write retrieved lesson IDs to working memory
  // keyed by taskId so successful task completions can confirm influence.
  if (taskId && pkg.lessons && pkg.lessons.length) {
    const _wmGw = require('./working-memory');
    setImmediate(() => _wmGw.set(
      String(taskId),
      'execution_context',
      pkg.lessons.map(l => ({ id: l.id, content: (l.content || '').slice(0, 100) })),
      { ttlSeconds: 7200 }
    ).catch(() => {}));
  }

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
        .select('id, lesson, task_id, created_at')
        .textSearch('lesson', query.split(' ').slice(0, 5).join(' | '), { type: 'plain' })
        .order('created_at', { ascending: false })
        .limit(limit);
      results.push(...(data || []).map(l => ({ layer: 10, id: l.id, content: l.lesson, task_id: l.task_id, created_at: l.created_at })));
    } catch {
      // fallback: keyword match
      try {
        const { data } = await _sb()
          .from('apex_lessons')
          .select('id, lesson, task_id, created_at')
          .ilike('lesson', `%${query.slice(0, 60).replace(/%/g, '')}%`)
          .order('created_at', { ascending: false })
          .limit(limit);
        results.push(...(data || []).map(l => ({ layer: 10, id: l.id, content: l.lesson, task_id: l.task_id, created_at: l.created_at })));
      } catch {}
    }
  }
  if (layers.includes(9)) {
    try {
      const facts = await mem.semanticMemory.search(query, { limit });
      results.push(...(facts || []).map(f => ({ layer: 9, content: f.fact, ...f })));
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
  if (layers.includes(1)) {
    try {
      const { data } = await _sb()
        .from('working_memory')
        .select('task_id, source, content, created_at')
        .ilike('content', `%${query.slice(0, 60).replace(/%/g, '')}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      results.push(...(data || []).map(r => ({ layer: 1, content: r.content, task_id: r.task_id, source: r.source, created_at: r.created_at })));
    } catch {}
  }
  if (layers.includes(3)) {
    try {
      const procs = await mem.proceduralMemory.findProcedure(query, null, limit);
      results.push(...(procs || []).map(p => ({ layer: 3, ...p })));
    } catch {}
  }
  if (layers.includes(5)) {
    try {
      const { data } = await _sb()
        .from('strategic_memory')
        .select('memory_id, title, content, strategic_type, created_at')
        .ilike('title', `%${query.slice(0, 60).replace(/%/g, '')}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      results.push(...(data || []).map(r => ({ layer: 5, id: r.memory_id, content: r.title, detail: r.content, strategic_type: r.strategic_type, created_at: r.created_at })));
    } catch {}
  }
  if (layers.includes(4)) {
    try {
      const facts = await mem.semanticMemory.search(query, { limit });
      results.push(...(facts || []).map(f => ({ layer: 4, content: f.fact, ...f })));
    } catch {}
  }
  if (layers.includes(8)) {
    try {
      const { data } = await _sb()
        .from('knowledge_graph_nodes')
        .select('node_id, label, node_type, created_at')
        .ilike('label', `%${query.slice(0, 60).replace(/%/g, '')}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      results.push(...(data || []).map(r => ({ layer: 8, id: r.node_id, content: r.label, node_type: r.node_type, created_at: r.created_at })));
    } catch {}
  }
  if (layers.includes(11)) {
    try {
      const { data } = await _sb()
        .from('reflexion_records')
        .select('reflexion_id, lesson_text, task_id, retrieval_count, created_at')
        .ilike('lesson_text', `%${query.slice(0, 60).replace(/%/g, '')}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      results.push(...(data || []).map(r => ({ layer: 11, id: r.reflexion_id, content: r.lesson_text, task_id: r.task_id, retrieval_count: r.retrieval_count, created_at: r.created_at })));
    } catch {}
  }
  if (layers.includes(12)) {
    try {
      const { data } = await _sb()
        .from('improvement_candidates')
        .select('candidate_id, title, description, status, created_at')
        .ilike('description', `%${query.slice(0, 60).replace(/%/g, '')}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      results.push(...(data || []).map(r => ({ layer: 12, id: r.candidate_id, content: r.title, description: r.description, status: r.status, created_at: r.created_at })));
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
async function storeMemory({ layer, content, tags = [], source, taskId, traceId,
                              importance = 5, requestingEntity = 'agent', outcome, category }) {
  ctrl.check(requestingEntity, [layer], 'WRITE');

  if (layer === 0) ctrl.checkElevated(requestingEntity, 'FOUNDER_WRITE');

  const sanitized = sanitizer.sanitize(typeof content === 'string' ? content : JSON.stringify(content));

  let result;
  switch (layer) {
    case 10: result = await _storeLesson(sanitized, tags, source, taskId, importance, traceId); break;
    case 2:  result = await _storeEpisode(sanitized, tags, source, taskId, outcome); break;
    case 7:  result = await mem.decisionMemory.storeDecision(
               `gw-${Date.now()}`, 'operational', { context: sanitized, source }, { source }); break;
    case 9:  result = await mem.semanticMemory.storeFact(sanitized, 'fact', { source, evidence: source }); break;
    case 6:  result = await mem.skillMemory.upsertSkill(
               `skill-${Date.now()}`, 'general', {}, { description: sanitized, source }); break;
    case 5:  result = await mem.strategicMemory.storeStrategicItem(
               `stored-${Date.now()}`, 'direction', sanitized, 'medium_term', { source }); break;
    case 0:  result = await founderMemory.update({ content: sanitized, tags, source, importance }); break;
    case 1:  result = await mem.workingMemory.set(
               taskId || 'gateway', category || 'active_task', sanitized,
               { taskId, source, ttlSeconds: 7200 }); break;
    case 3:  result = await mem.proceduralMemory.storeProcedure(
               `gw-${Date.now()}`, 'workflow', [sanitized], { source, domain: 'gateway' }); break;
    case 8:  result = await mem.knowledgeGraph.createNode(
               'Knowledge', String(sanitized).slice(0, 100),
               { content: sanitized, source }, null, null); break;
    case 11: result = await mem.reflexionTracker.createReflexion(sanitized, null, taskId); break;
    case 12: result = await mem.improvementEngine.submitCandidate(
               `gw-${Date.now()}`, sanitized, 'planning', source || 'gateway', {}); break;
    case 13: {
      const _ac = require('./adaptation-cycle');
      setImmediate(() => _ac.runWeeklyCycle().catch(() => {}));
      result = { scheduled: true, trigger: sanitized };
      break;
    }
    case 4:  result = await mem.semanticMemory.storeFact(sanitized, 'concept', { source, evidence: source, domain: 'associative' }); break;
    default: throw new Error(`Gateway: no write handler for layer ${layer}`);
  }

  if (layer === 10) cache.invalidatePattern('lessons');
  if (layer === 11) cache.invalidatePattern('policies');
  if (layer === 0)  cache.invalidatePattern('founder');
  if (layer === 2)  cache.invalidatePattern('episodes');
  if (layer === 5)  cache.invalidatePattern('strategic');
  if (layer === 7)  cache.invalidatePattern('decisions');
  if (layer === 9)  cache.invalidatePattern('semantic');
  if (layer === 3)  cache.invalidatePattern('procedural');
  if (layer === 8)  cache.invalidatePattern('knowledge');
  if (layer === 11) cache.invalidatePattern('reflexion');
  if (layer === 12) cache.invalidatePattern('improvement');
  if (layer === 13) cache.invalidatePattern('adaptation');

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
    healthMonitor.recordPolicyRetrieval(false);
    return _defaultPolicies(complexity);
  }

  const policies = _buildPolicyMap(data, complexity);
  healthMonitor.recordPolicyRetrieval(true);
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

  const _lessonStart = Date.now();
  const { data, error } = await _sb()
    .from('apex_lessons')
    .select('id, lesson, task_id, trace_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  healthMonitor.recordRetrievalCall(Date.now() - _lessonStart, !(error));
  if (error || !data?.length) return [];

  const raw = data.map(l => ({
    id:            l.id,
    content:       sanitizer.sanitize(l.lesson),
    task_id:       l.task_id,
    trace_id:      l.trace_id,
    created_at:    l.created_at,
    recency_weight: _recencyWeight(l.created_at),
  }));

  // Phase 5 — enrich with influence weights from reflexion_records, re-rank
  const lessons = await _enrichWithInfluence(raw);

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
    ctrl.check(requestingEntity, [0], 'READ');
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
  const results = await searchMemory({ query: description, layers: [2, 7], limit: 5, requestingEntity });
  // Exclude voice/chat exchange records — episodic layer is for pipeline task episodes only
  return results.filter(r => r.source !== 'voice_chat' && r.source !== 'api_client');
}

async function _getSemanticFacts(description, requestingEntity) {
  try {
    const facts = await mem.semanticMemory.search(description, { limit: 3 });
    return (facts || []).map(f => ({ layer: 9, content: f.fact || f.content, ...f }));
  } catch {
    return [];
  }
}

async function _getProjectContext() {
  try {
    const contextBlock = await mem.strategicMemory.getContextBlock(3);
    return { active_project: 'APEX AI OS', goals: contextBlock || [] };
  } catch {
    return { active_project: 'APEX AI OS', goals: [] };
  }
}

async function _storeLesson(content, tags, source, taskId, importance, traceId) {
  const { data, error } = await _sb().from('apex_lessons').insert({
    lesson:   content,
    task_id:  taskId,
    trace_id: traceId ?? (taskId ? `trace-${taskId}` : null),
  }).select();
  if (error) throw new Error(`gateway storeLesson: ${error.message}`);
  return { id: data?.[0]?.id };
}

async function _storeEpisode(content, tags, source, taskId, outcome) {
  return mem.episodicMemory.storeEpisode({
    objective:       content,
    success:         outcome !== undefined ? outcome : null,
    outcomesSummary: content,
    taskId,
  }, { source: source || 'gateway' });
}

function _recencyWeight(createdAt) {
  const daysSince = (Date.now() - new Date(createdAt)) / 86_400_000;
  return Math.max(0.5, 1.0 - (daysSince / 90) * 0.3);
}

// Phase 5 — Retrieval Influence: enrich lessons with reflexion confidence, re-rank.
// Lessons that have repeatedly influenced decisions float to the top.
// Fail-safe: returns unmodified array if DB query fails.
async function _enrichWithInfluence(lessons) {
  if (!lessons.length) return lessons;
  try {
    const { data: rfx } = await _sb()
      .from('reflexion_records')
      .select('lesson_text, retrieval_count, influenced_decisions, behavior_change_verified')
      .in('status', ['pending', 'validated', 'applied'])
      .limit(200);

    if (!rfx?.length) return lessons;

    const enriched = lessons.map(l => {
      const prefix = l.content.slice(0, 80).toLowerCase();
      const match  = rfx.find(r => r.lesson_text?.toLowerCase().startsWith(prefix));
      const ret    = match?.retrieval_count    || 0;
      const inf    = match?.influenced_decisions || 0;
      const influence_weight = ret > 0 ? Math.min(1.0, inf / ret) : 0;
      return { ...l, retrieval_count: ret, influenced_decisions: inf, influence_weight };
    });

    return enriched.sort((a, b) => {
      const sA = a.recency_weight * (1 + a.influence_weight * 0.5);
      const sB = b.recency_weight * (1 + b.influence_weight * 0.5);
      return sB - sA;
    });
  } catch {
    return lessons;
  }
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
    constraints: { cost_cap_usd: parseFloat(process.env.PIPELINE_BUDGET_USD || '2.00'), timeout_ms: 45000, max_retries: 3 },
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
    constraints: { cost_cap_usd: parseFloat(process.env.PIPELINE_BUDGET_USD || '2.00'), timeout_ms: 45000, max_retries: 3 },
    cognitive:   {},
  };
  for (const row of rows) {
    map.cognitive[row.policy_name] = row.policy_value ?? row.proposed_value;
  }
  if (!map.cognitive.retrieval_limit) map.cognitive.retrieval_limit = 15;
  return map;
}

async function _getWorkingMemory(taskId) {
  if (!taskId) return [];
  try {
    const { data } = await _sb()
      .from('working_memory')
      .select('task_id, source, content, created_at')
      .eq('task_id', String(taskId))
      .order('created_at', { ascending: false })
      .limit(5);
    return (data || []).map(r => ({ layer: 1, content: r.content, source: r.source, created_at: r.created_at }));
  } catch { return []; }
}

async function _getSkillSummary(description, category) {
  try {
    const procs = await mem.proceduralMemory.findProcedure(description || '', category, 3);
    return (procs || []).map(p => ({ layer: 6, ...p }));
  } catch { return []; }
}

async function _getKnowledgeNodes(description) {
  if (!description) return [];
  try {
    const { data } = await _sb()
      .from('knowledge_graph_nodes')
      .select('node_id, label, node_type, created_at')
      .ilike('label', `%${(description || '').slice(0, 40).replace(/%/g, '')}%`)
      .order('created_at', { ascending: false })
      .limit(5);
    return (data || []).map(r => ({ layer: 8, id: r.node_id, content: r.label, node_type: r.node_type, created_at: r.created_at }));
  } catch { return []; }
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

// verifyEpisode — read-back check: returns the stored row if found, null if not
async function verifyEpisode(taskId) {
  try {
    const { data } = await _sb()
      .from('episodic_memory')
      .select('memory_id, task_id, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1);
    return (data && data.length > 0) ? data[0] : null;
  } catch {
    return null;
  }
}

// B1: Strategic Intelligence Engine briefing (6h cached inside SIE)
async function _getSIEBriefing(description) {
  try {
    const sie = require('../intelligence/sie');
    return await sie.generateExecutiveBriefing({ query: description || 'apex strategic review' });
  } catch { return null; }
}

// B2: Recent executive council verdicts for context
async function _getExecutiveVerdicts(category) {
  try {
    const { data } = await _sb().from('executive_verdicts')
      .select('role, decision, rationale, created_at')
      .order('created_at', { ascending: false })
      .limit(3);
    return data || [];
  } catch { return []; }
}

module.exports = {
  getContext,
  searchMemory,
  storeMemory,
  retrievePolicies,
  retrieveLessons,
  retrieveFounderContext,
  summarizeMemory,
  verifyEpisode,
};
