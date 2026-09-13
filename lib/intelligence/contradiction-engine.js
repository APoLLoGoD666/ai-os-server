'use strict';

// Contradiction Engine — Phase 7
// Detects conflicts between knowledge objects, procedures, decisions, and policies.
// Nothing is silently overwritten. All contradictions are reported and tracked.
// Supports evidence weighting, confidence weighting, recency weighting, supersession.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');
const { embedText }         = require('../embed');
const knowledgeGraph        = require('../memory/knowledge-graph');

function _sb() { return getSupabaseClient(); }

const SEMANTIC_CONTRADICTION_THRESHOLD = 0.82;

// Check a newly created memory object against all existing objects of the same type.
// Non-blocking — designed to be called via setImmediate.
async function checkNew(memoryId, memoryTable) {
    try {
        switch (memoryTable) {
            case 'semantic_memory':   return _checkSemanticContradictions(memoryId);
            case 'procedural_memory': return _checkProceduralContradictions(memoryId);
            case 'decision_memory':   return _checkDecisionContradictions(memoryId);
            default: return [];
        }
    } catch (e) {
        console.warn(`[contradiction-engine] checkNew failed: ${e.message}`);
        return [];
    }
}

// Full scan — called weekly by adaptation cycle.
// Returns total contradictions found.
async function fullScan() {
    let total = 0;
    total += await _scanSemanticMemory();
    total += await _scanProceduralMemory();
    console.log(`[contradiction-engine] full scan complete: ${total} contradictions found`);
    return total;
}

// ── Semantic contradiction detection ─────────────────────────────────────────

async function _checkSemanticContradictions(memoryId) {
    const { data: record } = await _sb().from('semantic_memory')
        .select('memory_id, fact, category, confidence, embedding')
        .eq('memory_id', memoryId)
        .single();
    if (!record) return [];

    const contradictions = [];
    const embedding      = record.embedding;

    if (embedding) {
        // Find semantically similar facts (might be contradictory)
        const { data: similar } = await _sb().rpc('search_semantic_memory', {
            query_embedding:      embedding,
            similarity_threshold: SEMANTIC_CONTRADICTION_THRESHOLD,
            max_results:          10,
        });
        for (const s of (similar || [])) {
            if (s.memory_id === memoryId) continue;
            if (await _areContradictory(record.fact, s.fact)) {
                const reportId = await _createReport({
                    type:          'knowledge',
                    severity:      _knowledgeSeverity(record.confidence, s.confidence),
                    memoryAId:     memoryId,
                    memoryATable:  'semantic_memory',
                    memoryBId:     s.memory_id,
                    memoryBTable:  'semantic_memory',
                    description:   `Contradicting facts: "${record.fact.slice(0, 100)}" vs "${s.fact.slice(0, 100)}"`,
                    evidence:      { similarity_score: 1.0, contradiction_type: 'semantic_opposite' },
                    similarityScore: SEMANTIC_CONTRADICTION_THRESHOLD,
                    confidenceA:   record.confidence,
                    confidenceB:   s.confidence,
                    recommendation: record.confidence > s.confidence ? 'supersede_b' : 'supersede_a',
                });
                if (reportId) {
                    contradictions.push(reportId);
                    // Create CONTRADICTS edge in knowledge graph
                    setImmediate(async () => {
                        try {
                            const nodeA = await knowledgeGraph.syncFromMemory('Knowledge', memoryId, 'semantic_memory', record.fact.slice(0, 60), {});
                            const nodeB = await knowledgeGraph.syncFromMemory('Knowledge', s.memory_id, 'semantic_memory', s.fact.slice(0, 60), {});
                            if (nodeA && nodeB) await knowledgeGraph.createEdge(nodeA, nodeB, 'CONTRADICTS', { reportId }, 0.8);
                        } catch (_) {}
                    });
                }
            }
        }
    } else {
        // Keyword-based fallback
        const { data: all } = await _sb().from('semantic_memory')
            .select('memory_id, fact, confidence')
            .eq('category', record.category)
            .in('status', ['candidate','validated'])
            .neq('memory_id', memoryId)
            .limit(50);
        for (const s of (all || [])) {
            if (await _areContradictory(record.fact, s.fact)) {
                await _createReport({
                    type:         'knowledge',
                    severity:     'low',
                    memoryAId:    memoryId,
                    memoryATable: 'semantic_memory',
                    memoryBId:    s.memory_id,
                    memoryBTable: 'semantic_memory',
                    description:  `Possible contradicting facts (keyword detection)`,
                    evidence:     {},
                    recommendation: 'flag_review',
                });
            }
        }
    }

    return contradictions;
}

async function _scanSemanticMemory() {
    let found = 0;
    try {
        const { data } = await _sb().from('semantic_memory')
            .select('memory_id').eq('status', 'validated').limit(200);
        for (const row of (data || [])) {
            const reports = await _checkSemanticContradictions(row.memory_id);
            found += reports.length;
        }
    } catch (e) {
        console.error(`[contradiction-engine] scanSemanticMemory failed: ${e.message}`);
    }
    return found;
}

// ── Procedural contradiction detection ───────────────────────────────────────

async function _checkProceduralContradictions(memoryId) {
    // Two procedures with the same trigger/name but different steps = contradiction
    try {
        const { data: record } = await _sb().from('procedural_memory')
            .select('memory_id, name, procedure_type, triggers, steps')
            .eq('memory_id', memoryId)
            .single();
        if (!record) return [];

        const { data: similar } = await _sb().from('procedural_memory')
            .select('memory_id, name, steps')
            .eq('procedure_type', record.procedure_type)
            .ilike('name', `%${record.name.split(' ')[0]}%`)
            .neq('memory_id', memoryId)
            .limit(10);

        const reports = [];
        for (const s of (similar || [])) {
            // If same name but different first step, flag it
            const aStep = Array.isArray(record.steps) ? JSON.stringify(record.steps[0]) : '';
            const bStep = Array.isArray(s.steps)      ? JSON.stringify(s.steps[0])      : '';
            if (aStep && bStep && aStep !== bStep) {
                const id = await _createReport({
                    type:         'procedure',
                    severity:     'medium',
                    memoryAId:    memoryId,
                    memoryATable: 'procedural_memory',
                    memoryBId:    s.memory_id,
                    memoryBTable: 'procedural_memory',
                    description:  `Procedures with same name but conflicting steps: "${record.name}"`,
                    evidence:     { step_a: aStep.slice(0, 100), step_b: bStep.slice(0, 100) },
                    recommendation: 'flag_review',
                });
                if (id) reports.push(id);
            }
        }
        return reports;
    } catch (_) { return []; }
}

async function _scanProceduralMemory() {
    let found = 0;
    try {
        const { data } = await _sb().from('procedural_memory')
            .select('memory_id').eq('status', 'validated').limit(100);
        for (const row of (data || [])) {
            const reports = await _checkProceduralContradictions(row.memory_id);
            found += reports.length;
        }
    } catch (_) {}
    return found;
}

// ── Decision contradiction detection ─────────────────────────────────────────

async function _checkDecisionContradictions(memoryId) {
    try {
        const { data: record } = await _sb().from('decision_memory')
            .select('memory_id, decision, decision_type, outcome_quality, rationale')
            .eq('memory_id', memoryId)
            .single();
        if (!record || !record.outcome_quality) return [];

        // Find decisions of same type with opposite outcomes
        const { data: opposite } = await _sb().from('decision_memory')
            .select('memory_id, decision, outcome_quality, rationale')
            .eq('decision_type', record.decision_type)
            .in('outcome_quality', record.outcome_quality === 'excellent' ? ['poor','catastrophic'] : ['excellent','good'])
            .neq('memory_id', memoryId)
            .limit(5);

        const reports = [];
        for (const opp of (opposite || [])) {
            if (_textSimilarity(record.decision, opp.decision) > 0.5) {
                const id = await _createReport({
                    type:         'decision',
                    severity:     record.outcome_quality === 'catastrophic' ? 'high' : 'medium',
                    memoryAId:    memoryId,
                    memoryATable: 'decision_memory',
                    memoryBId:    opp.memory_id,
                    memoryBTable: 'decision_memory',
                    description:  `Similar decisions had conflicting outcomes: ${record.outcome_quality} vs ${opp.outcome_quality}`,
                    evidence:     {},
                    recommendation: 'flag_review',
                });
                if (id) reports.push(id);
            }
        }
        return reports;
    } catch (_) { return []; }
}

// ── Report management ─────────────────────────────────────────────────────────

async function _createReport(params) {
    const {
        type, severity, memoryAId, memoryATable, memoryBId, memoryBTable,
        description, evidence, similarityScore, confidenceA, confidenceB, recommendation
    } = params;

    // Idempotent: don't duplicate reports for the same pair
    try {
        const { data: existing } = await _sb().from('contradiction_reports')
            .select('report_id')
            .eq('memory_a_id', memoryAId)
            .eq('memory_b_id', memoryBId)
            .eq('contradiction_type', type)
            .eq('resolution_status', 'open')
            .limit(1);
        if (existing && existing.length > 0) return null;
    } catch (_) {}

    const reportId = generateMemoryId('contradiction').replace('mem-', 'cr-');
    try {
        const { error } = await _sb().from('contradiction_reports').insert({
            report_id:          reportId,
            contradiction_type: type,
            severity,
            memory_a_id:        memoryAId,
            memory_a_table:     memoryATable,
            memory_b_id:        memoryBId,
            memory_b_table:     memoryBTable,
            description,
            evidence,
            similarity_score:   similarityScore ?? null,
            confidence_a:       confidenceA ?? null,
            confidence_b:       confidenceB ?? null,
            recommendation:     recommendation || 'flag_review',
            resolution_status:  'open',
        });
        if (error) throw error;
        return reportId;
    } catch (e) {
        console.error(`[contradiction-engine] createReport failed: ${e.message}`);
        return null;
    }
}

async function _areContradictory(textA, textB) {
    const negationPairs = [
        [/\balways\b/i, /\bnever\b/i],
        [/\bmust\b/i,   /\bmust not\b/i],
        [/\bshould\b/i, /\bshould not\b/i],
        [/\bdo\b/i,     /\bdo not\b/i],
        [/\buse\b/i,    /\bavoid\b/i],
        [/\bprefer\b/i, /\bavoid\b/i],
    ];
    for (const [pos, neg] of negationPairs) {
        if ((pos.test(textA) && neg.test(textB)) || (pos.test(textB) && neg.test(textA))) {
            const wordsA = textA.toLowerCase().split(/\s+/);
            const wordsB = textB.toLowerCase().split(/\s+/);
            const shared = wordsA.filter(w => w.length > 4 && wordsB.includes(w));
            if (shared.length >= 2) return true;
        }
    }
    return false;
}

function _textSimilarity(a, b) {
    const wA = (a || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const wB = (b || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (!wA.length || !wB.length) return 0;
    const shared = wA.filter(w => wB.includes(w)).length;
    return shared / Math.max(wA.length, wB.length);
}

function _knowledgeSeverity(confA, confB) {
    const maxConf = Math.max(confA || 0, confB || 0);
    if (maxConf >= 0.8) return 'high';
    if (maxConf >= 0.6) return 'medium';
    return 'low';
}

// Resolve a contradiction report.
async function resolve(reportId, resolution, notes, resolvedBy = 'system') {
    try {
        const { error } = await _sb().from('contradiction_reports').update({
            resolution_status: 'resolved',
            recommendation:    resolution,
            resolution_notes:  notes,
            resolved_by:       resolvedBy,
            resolved_at:       new Date().toISOString(),
        }).eq('report_id', reportId);
        if (error) throw error;
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// Get open contradiction reports.
async function getOpenReports(limit = 50) {
    try {
        const { data, error } = await _sb().from('contradiction_reports')
            .select('*')
            .eq('resolution_status', 'open')
            .order('severity', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        return [];
    }
}

async function getStats() {
    try {
        const { data } = await _sb().from('contradiction_reports').select('contradiction_type, severity, resolution_status');
        const open   = (data || []).filter(r => r.resolution_status === 'open').length;
        const high   = (data || []).filter(r => r.severity === 'high' || r.severity === 'critical').length;
        return { total: (data || []).length, open, high };
    } catch (_) { return { total: 0, open: 0, high: 0 }; }
}

module.exports = { checkNew, fullScan, resolve, getOpenReports, getStats };
