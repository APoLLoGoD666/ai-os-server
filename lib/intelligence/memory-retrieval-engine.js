'use strict';

// Memory Retrieval Engine — Phase 2
// Given a task, retrieves relevant context from ALL memory layers simultaneously.
// Hybrid retrieval: vector search + keyword + graph traversal + confidence weighting.
// Called at task start. Output feeds context-composer.js → planning-influence-engine.js.
//
// Current gap closed: memory-retriever.js only retrieved episodes+lessons (500 chars max).
// This engine retrieves from all 7 memory layers + knowledge graph, deduplicated and ranked.

const { getSupabaseClient }   = require('../clients');
const { embedText }           = require('../embed');
const { generateMemoryId }    = require('../memory/memory-governor');
const { createHash }          = require('crypto');

function _sb() { return getSupabaseClient(); }

// ── Configuration ─────────────────────────────────────────────────────────────
const LIMITS = {
    episodes:   5,
    lessons:    8,
    decisions:  4,
    procedures: 3,
    knowledge:  6,
    skills:     5,
    graph:      8,
    incidents:  3,
};

const MIN_SCORE = 0.05;

// ── Main retrieval entry point ────────────────────────────────────────────────
// Returns a contextPack with all retrieved memory, ranked and deduplicated.
// Never throws — all failures are caught per-source.
async function retrieveForTask(spec, options = {}) {
    const { traceId, taskId, sessionId, retrievalLimits } = options;
    const LIMITS_ACTIVE = retrievalLimits ? { ...LIMITS, ...retrievalLimits } : LIMITS;
    const objective   = (spec.objective || spec.task || '').slice(0, 500);
    const startMs     = Date.now();
    const objectiveHash = createHash('sha256').update(objective).digest('hex').slice(0, 16);

    // Compute embedding once, share across all semantic searches
    let embedding = null;
    try { embedding = await embedText(objective); } catch (_) {}

    const keywords = _extractKeywords(objective);

    // Run all retrievals in parallel — failures are isolated
    const [episodes, lessons, decisions, procedures, knowledge, skills, incidents, graphNodes] = await Promise.all([
        _retrieveEpisodes(objective, embedding, keywords, LIMITS_ACTIVE.episodes).catch(() => []),
        _retrieveLessons(objective, embedding, keywords, LIMITS_ACTIVE.lessons).catch(() => []),
        _retrieveDecisions(objective, embedding, keywords, LIMITS_ACTIVE.decisions).catch(() => []),
        _retrieveProcedures(objective, embedding, keywords, LIMITS_ACTIVE.procedures).catch(() => []),
        _retrieveKnowledge(objective, embedding, keywords, LIMITS_ACTIVE.knowledge).catch(() => []),
        _retrieveSkills(objective, keywords, LIMITS_ACTIVE.skills).catch(() => []),
        _retrieveIncidents(objective, keywords, LIMITS_ACTIVE.incidents).catch(() => []),
        _retrieveGraphNeighborhood(objective, keywords, LIMITS_ACTIVE.graph).catch(() => []),
    ]);

    // Compute overall retrieval confidence
    const totalItems = episodes.length + lessons.length + decisions.length +
                       procedures.length + knowledge.length + skills.length;
    const avgConfidence = totalItems > 0
        ? _avg([...episodes, ...lessons, ...decisions, ...procedures, ...knowledge]
               .map(r => r._score || r.confidence || 0.5))
        : 0.3;

    const contextPack = {
        objective,
        traceId,
        taskId,
        episodes,
        lessons,
        decisions,
        procedures,
        knowledge,
        skills,
        incidents,
        graphNodes,
        confidence:        parseFloat(avgConfidence.toFixed(3)),
        retrieval_sources: _buildSourceList({ episodes, lessons, decisions, procedures, knowledge, skills, incidents, graphNodes }),
        graph_evidence:    _buildGraphEvidence(graphNodes),
        retrieved_at:      new Date().toISOString(),
        embedding_available: !!embedding,
    };

    // Audit log (non-blocking)
    setImmediate(async () => {
        try {
            await _sb().from('retrieval_logs').insert({
                log_id:               generateMemoryId('retrieval').replace('mem-', 'rl-'),
                trace_id:             traceId || null,
                task_id:              taskId  || null,
                objective_hash:       objectiveHash,
                sources_queried:      contextPack.retrieval_sources,
                total_retrieved:      totalItems,
                episodes_retrieved:   episodes.length,
                lessons_retrieved:    lessons.length,
                decisions_retrieved:  decisions.length,
                procedures_retrieved: procedures.length,
                knowledge_retrieved:  knowledge.length,
                graph_nodes_retrieved: graphNodes.length,
                overall_confidence:   contextPack.confidence,
                retrieval_method:     embedding ? 'hybrid' : 'keyword',
                duration_ms:          Date.now() - startMs,
            });
        } catch (_) {}
    });

    return contextPack;
}

// ── Per-source retrievers ─────────────────────────────────────────────────────

async function _retrieveEpisodes(objective, embedding, keywords, lim = LIMITS.episodes) {
    const results = [];
    try {
        const epPg = require('../memory/episodic-memory-pg');
        const pg   = await epPg.findSimilar(objective, { limit: lim });
        for (const r of pg) results.push({ ...r, _source: 'episodic_pg', _score: r.similarity || 0.5 });
    } catch (_) {}
    try {
        const epOld = require('../../agent-system/episodic-memory');
        const old   = await epOld.getSimilarExperiences(objective, { limit: 3 });
        for (const r of old) {
            if (!results.find(x => _isSimilarText(x.objective, r.objective, 0.85))) {
                results.push({ ...r, _source: 'episodic_vault', _score: r._relevance || 0.3 });
            }
        }
    } catch (_) {}
    return _rankAndLimit(results, lim, '_score');
}

async function _retrieveLessons(objective, embedding, keywords, lim = LIMITS.lessons) {
    const results = [];
    // apex_lessons Supabase table
    try {
        const { data } = await _sb().from('apex_lessons')
            .select('id, lesson, task_id, trace_id, created_at')
            .order('created_at', { ascending: false })
            .limit(100);
        const kwScore = (text) => _keywordScore(keywords, text);
        for (const row of (data || [])) {
            const score = kwScore(row.lesson);
            if (score >= MIN_SCORE) results.push({ ...row, text: row.lesson, _source: 'apex_lessons', _score: score });
        }
    } catch (_) {}
    // Old memory-indexer lessons
    try {
        const retriever = require('../../agent-system/memory-retriever');
        const res       = await retriever.findSimilarLessons(objective, { limit: 5 });
        for (const r of res) {
            if (!results.find(x => _isSimilarText(x.text || x.lesson, r.text, 0.90))) {
                results.push({ ...r, _source: 'lesson_index', _score: r._relevance || 0.3 });
            }
        }
    } catch (_) {}
    return _rankAndLimit(results, lim, '_score');
}

async function _retrieveDecisions(objective, embedding, keywords, lim = LIMITS.decisions) {
    try {
        const decMem = require('../memory/decision-memory');
        const similar = await decMem.findSimilar(objective, { limit: lim });
        return similar.map(r => ({ ...r, _source: 'decision_memory', _score: r.similarity || 0.4 }));
    } catch (_) { return []; }
}

async function _retrieveProcedures(objective, embedding, keywords, lim = LIMITS.procedures) {
    try {
        const procMem = require('../memory/procedural-memory');
        const results = await procMem.findProcedure(objective, null, lim);
        return results.map(r => ({ ...r, _source: 'procedural_memory', _score: r.confidence || 0.5 }));
    } catch (_) { return []; }
}

async function _retrieveKnowledge(objective, embedding, keywords, lim = LIMITS.knowledge) {
    try {
        const semMem = require('../memory/semantic-memory');
        const results = await semMem.search(objective, { limit: lim, minConfidence: 0.4 });
        return results.map(r => ({ ...r, _source: 'semantic_memory', _score: r.similarity || r.confidence || 0.5 }));
    } catch (_) { return []; }
}

async function _retrieveSkills(objective, keywords, lim = LIMITS.skills) {
    try {
        const skillMem = require('../memory/skill-memory');
        const all   = await skillMem.getSkills(null);
        const scored = all
            .filter(s => s.execution_count > 0)
            .map(s => ({
                ...s,
                _source: 'skill_memory',
                _score:  _keywordScore(keywords, s.skill_name + ' ' + (s.domain || '')),
            }))
            .filter(s => s._score > 0 || s.execution_count > 10)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, lim);
        return scored;
    } catch (_) { return []; }
}

async function _retrieveIncidents(objective, keywords, lim = LIMITS.incidents) {
    try {
        const { data } = await _sb().from('incidents')
            .select('id, severity, description, status, created_at')
            .in('status', ['open','investigating'])
            .order('created_at', { ascending: false })
            .limit(10);
        if (!data) return [];
        return (data || [])
            .filter(i => _keywordScore(keywords, i.description || '') > MIN_SCORE)
            .slice(0, lim)
            .map(r => ({ ...r, _source: 'incidents', _score: r.severity === 'HIGH' ? 0.8 : 0.5 }));
    } catch (_) { return []; }
}

async function _retrieveGraphNeighborhood(objective, keywords, lim = LIMITS.graph) {
    try {
        const kg = require('../memory/knowledge-graph');
        const { nodes } = await kg.getHighConfidenceSubgraph(0.65, 50);
        const scored = nodes
            .map(n => ({
                ...n,
                _source: 'knowledge_graph',
                _score:  _keywordScore(keywords, n.label) + (n.confidence || 0.5) * 0.3,
            }))
            .filter(n => n._score > 0.1)
            .sort((a, b) => b._score - a._score)
            .slice(0, lim);
        return scored;
    } catch (_) { return []; }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _extractKeywords(text) {
    const stop = new Set(['the','and','for','with','this','that','from','into','have','been',
                          'will','using','when','then','after','before','which','should','could']);
    return (text || '').toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !stop.has(w))
        .slice(0, 25);
}

function _keywordScore(keywords, text) {
    if (!keywords.length || !text) return 0;
    const textLower = text.toLowerCase();
    const hits = keywords.filter(k => textLower.includes(k)).length;
    return hits / Math.max(keywords.length, 1);
}

function _isSimilarText(a, b, threshold = 0.8) {
    if (!a || !b) return false;
    const aKw = _extractKeywords(a);
    const bKw = _extractKeywords(b);
    if (!aKw.length || !bKw.length) return false;
    const hits = aKw.filter(k => bKw.includes(k)).length;
    return hits / Math.max(aKw.length, bKw.length) >= threshold;
}

function _rankAndLimit(items, limit, scoreKey = '_score') {
    return items
        .sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0))
        .slice(0, limit);
}

function _avg(values) {
    if (!values.length) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

function _buildSourceList(pack) {
    const sources = [];
    if (pack.episodes.length)    sources.push('episodic_memory');
    if (pack.lessons.length)     sources.push('apex_lessons');
    if (pack.decisions.length)   sources.push('decision_memory');
    if (pack.procedures.length)  sources.push('procedural_memory');
    if (pack.knowledge.length)   sources.push('semantic_memory');
    if (pack.skills.length)      sources.push('skill_memory');
    if (pack.incidents.length)   sources.push('incidents');
    if (pack.graphNodes.length)  sources.push('knowledge_graph');
    return sources;
}

function _buildGraphEvidence(graphNodes) {
    if (!graphNodes.length) return null;
    const byType = {};
    for (const n of graphNodes) {
        byType[n.node_type] = (byType[n.node_type] || 0) + 1;
    }
    return {
        total_nodes: graphNodes.length,
        by_type:     byType,
        top_nodes:   graphNodes.slice(0, 3).map(n => ({ label: n.label, type: n.node_type, confidence: n.confidence })),
    };
}

// Stats for health monitoring
async function getRetrievalStats(limit = 50) {
    try {
        const { data, error } = await _sb().from('retrieval_logs')
            .select('overall_confidence, total_retrieved, retrieval_method, duration_ms, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        const logs = data || [];
        return {
            total_retrievals:  logs.length,
            avg_confidence:    _avg(logs.map(l => l.overall_confidence || 0)),
            avg_items:         _avg(logs.map(l => l.total_retrieved || 0)),
            avg_duration_ms:   _avg(logs.map(l => l.duration_ms || 0)),
            semantic_rate:     logs.filter(l => l.retrieval_method === 'hybrid').length / Math.max(logs.length, 1),
        };
    } catch (e) {
        return { total_retrievals: 0 };
    }
}

module.exports = { retrieveForTask, getRetrievalStats, _extractKeywords };
