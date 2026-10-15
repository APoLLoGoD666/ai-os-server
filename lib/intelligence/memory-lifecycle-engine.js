'use strict';

// Memory Lifecycle Engine — Phase 9
// Scores all memory objects on: Recency, Usage, Confidence, Impact, Graph Connectivity.
// Promotes to Hot/Warm/Cold/Archive tiers automatically.
// Never deletes evidence. Archive means compressed, not deleted.
//
// Temperature tiers:
//   Hot    (0.70–1.00): frequently retrieved, recent, high confidence
//   Warm   (0.40–0.70): active in DB, normal retrieval
//   Cold   (0.20–0.40): DB only, requires explicit query
//   Archive (<0.20):    low retrieval priority, never returned in default searches

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

const MEMORY_TABLES = [
    'episodic_memory',
    'semantic_memory',
    'procedural_memory',
    'strategic_memory',
    'skill_memory',
    'decision_memory',
];

// Score and classify all memory objects. Called weekly by cron.
async function runLifecycleCycle() {
    let total = 0, promoted = 0, demoted = 0, archived = 0;
    console.log('[lifecycle-engine] starting lifecycle cycle');

    for (const table of MEMORY_TABLES) {
        try {
            const result = await _processTable(table);
            total    += result.total;
            promoted += result.promoted;
            demoted  += result.demoted;
            archived += result.archived;
        } catch (e) {
            console.error(`[lifecycle-engine] failed table ${table}: ${e.message}`);
        }
    }

    console.log(`[lifecycle-engine] cycle complete: ${total} scored, ${promoted} promoted, ${demoted} demoted, ${archived} archived`);
    return { total, promoted, demoted, archived };
}

async function _processTable(table) {
    const result = { total: 0, promoted: 0, demoted: 0, archived: 0 };
    const idField = 'memory_id';

    // Get retrieval counts from retrieval_logs
    const retrievalCounts = await _getRetrievalCounts(table);

    // Get graph connectivity scores
    const graphScores = await _getGraphConnectivityScores(table);

    // Fetch all non-archived records
    const { data, error } = await _sb().from(table)
        .select(`${idField}, confidence, status, created_at, updated_at`)
        .not('status', 'eq', 'archived')
        .limit(1000);
    if (error || !data) return result;

    for (const row of data) {
        try {
            const memId          = row[idField];
            const retrieval      = retrievalCounts[memId]     || 0;
            const graphConnec    = graphScores[memId]         || 0;
            const { score, tier } = _computeTemperature(row, retrieval, graphConnec);

            const prev = await _getPreviousTier(memId, table);
            await _upsertScore(memId, table, score, tier, row, retrieval, graphConnec);

            result.total++;
            if (tier === prev) continue;
            if (['hot','warm'].includes(tier) && ['cold','archive'].includes(prev)) result.promoted++;
            else if (['cold','archive'].includes(tier) && ['hot','warm'].includes(prev)) result.demoted++;
            if (tier === 'archive') {
                result.archived++;
                // Mark memory as archived in source table (never deletes, just labels)
                await _sb().from(table).update({
                    status:     'archived',
                    updated_at: new Date().toISOString(),
                }).eq(idField, memId).eq('status', 'deprecated'); // only archive deprecated records
            }
        } catch (_) {}
    }
    return result;
}

function _computeTemperature(row, retrievalCount, graphConnectivity) {
    const now    = Date.now();
    const ageMs  = now - new Date(row.created_at || now).getTime();
    const ageDays = ageMs / 86400000;

    // Recency: 1.0 today → 0.0 at 180 days
    const recencyScore = Math.max(0, 1 - (ageDays / 180));

    // Usage: based on retrieval frequency
    const usageScore = Math.min(1.0, retrievalCount / 10);

    // Confidence
    const confidenceScore = parseFloat(row.confidence || 0.5);

    // Impact: proxy via confidence * usage interaction
    const impactScore = Math.min(1.0, confidenceScore * 0.7 + usageScore * 0.3);

    // Graph connectivity: 0–1 based on node degree
    const graphScore = Math.min(1.0, graphConnectivity / 5);

    // Composite temperature
    const temperature = (
        recencyScore    * 0.30 +
        usageScore      * 0.25 +
        confidenceScore * 0.25 +
        impactScore     * 0.10 +
        graphScore      * 0.10
    );

    let tier;
    if (temperature >= 0.70)      tier = 'hot';
    else if (temperature >= 0.40) tier = 'warm';
    else if (temperature >= 0.20) tier = 'cold';
    else                          tier = 'archive';

    return {
        score:            parseFloat(temperature.toFixed(3)),
        tier,
        recencyScore:     parseFloat(recencyScore.toFixed(3)),
        usageScore:       parseFloat(usageScore.toFixed(3)),
        confidenceScore,
        impactScore:      parseFloat(impactScore.toFixed(3)),
        graphScore:       parseFloat(graphScore.toFixed(3)),
    };
}

async function _upsertScore(memId, table, score, tier, row, retrievalCount, graphConnectivity) {
    const computed = _computeTemperature(row, retrievalCount, graphConnectivity);
    await _sb().from('memory_temperature_scores').upsert({
        memory_id:           memId,
        memory_table:        table,
        temperature_score:   score,
        tier,
        recency_score:       computed.recencyScore,
        usage_score:         computed.usageScore,
        confidence_score:    computed.confidenceScore,
        impact_score:        computed.impactScore,
        graph_connectivity:  computed.graphScore,
        computed_at:         new Date().toISOString(),
    }, { onConflict: 'memory_id,memory_table' });
}

async function _getPreviousTier(memId, table) {
    try {
        const { data } = await _sb().from('memory_temperature_scores')
            .select('tier').eq('memory_id', memId).eq('memory_table', table).single();
        return data?.tier || 'warm';
    } catch (_) { return 'warm'; }
}

async function _getRetrievalCounts(table) {
    // Count how many times each memory_id appears in retrieval_logs
    // This is approximated by checking reflexion_records retrieval_count
    try {
        const { data } = await _sb().from('reflexion_records')
            .select('lesson_text, retrieval_count');
        const counts = {};
        for (const r of (data || [])) counts[r.lesson_text?.slice(0, 60)] = r.retrieval_count || 0;
        return counts;
    } catch (_) { return {}; }
}

async function _getGraphConnectivityScores(table) {
    try {
        // Count edges per source_memory_id
        const { data: nodes } = await _sb().from('knowledge_graph_nodes')
            .select('source_memory_id, node_id')
            .eq('source_table', table);
        if (!nodes) return {};

        const nodeIds = nodes.map(n => n.node_id).filter(Boolean);
        if (nodeIds.length === 0) return {};

        const { data: edges } = await _sb().from('knowledge_graph_edges')
            .select('from_node_id')
            .in('from_node_id', nodeIds);

        const edgeCounts = {};
        for (const e of (edges || [])) edgeCounts[e.from_node_id] = (edgeCounts[e.from_node_id] || 0) + 1;

        const memIdMap = {};
        for (const n of nodes) {
            if (n.source_memory_id && n.node_id) {
                memIdMap[n.source_memory_id] = edgeCounts[n.node_id] || 0;
            }
        }
        return memIdMap;
    } catch (_) { return {}; }
}

// Get lifecycle statistics.
async function getStats() {
    try {
        const { data } = await _sb().from('memory_temperature_scores').select('tier, memory_table');
        const byTier  = { hot: 0, warm: 0, cold: 0, archive: 0 };
        const byTable = {};
        for (const r of (data || [])) {
            byTier[r.tier] = (byTier[r.tier] || 0) + 1;
            byTable[r.memory_table] = (byTable[r.memory_table] || 0) + 1;
        }
        return { total: (data || []).length, byTier, byTable };
    } catch (_) { return { total: 0 }; }
}

// Get hot memory for a specific table — fast path for retrieval.
async function getHotMemory(table, limit = 20) {
    try {
        const { data } = await _sb().from('memory_temperature_scores')
            .select('memory_id')
            .eq('memory_table', table)
            .eq('tier', 'hot')
            .order('temperature_score', { ascending: false })
            .limit(limit);
        return (data || []).map(r => r.memory_id);
    } catch (_) { return []; }
}

module.exports = { runLifecycleCycle, getStats, getHotMemory };
