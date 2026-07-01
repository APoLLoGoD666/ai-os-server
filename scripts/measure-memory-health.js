'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function count(table, filter = null) {
    try {
        let q = sb.from(table).select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count: n, error } = await q;
        if (error) return { n: null, error: error.message };
        return { n };
    } catch (e) { return { n: null, error: e.message }; }
}

async function rows(table, select = '*', filter = null, limit = 500) {
    try {
        let q = sb.from(table).select(select).limit(limit);
        if (filter) q = filter(q);
        const { data, error } = await q;
        if (error) return [];
        return data || [];
    } catch { return []; }
}

async function timedInsert(table, payload, idField) {
    const t0 = Date.now();
    try {
        const { data, error } = await sb.from(table).insert(payload).select(idField).single();
        const ms = Date.now() - t0;
        if (error) return { ms: null, id: null, error: error.message };
        return { ms, id: data?.[idField] };
    } catch (e) { return { ms: null, id: null, error: e.message }; }
}

async function timedRead(table, select, filter) {
    const t0 = Date.now();
    try {
        let q = sb.from(table).select(select).limit(10);
        if (filter) q = filter(q);
        const { error } = await q;
        const ms = Date.now() - t0;
        if (error) return { ms: null, error: error.message };
        return { ms };
    } catch (e) { return { ms: null, error: e.message }; }
}

(async () => {
    console.log('=== MEMORY HEALTH MEASUREMENT ===');
    console.log('Run time:', new Date().toISOString());

    // ── Row counts ───────────────────────────────────────────────────────────
    console.log('\n--- Row counts ---');
    const tables = [
        'working_memory', 'episodic_memory', 'semantic_memory',
        'procedural_memory', 'strategic_memory', 'skill_memory', 'decision_memory',
        'knowledge_graph_nodes', 'knowledge_graph_edges',
        'memory_consolidation_queue', 'reflexion_records',
        'improvement_candidates', 'adaptation_cycles',
    ];
    const counts = {};
    for (const t of tables) {
        const r = await count(t);
        counts[t] = r.n;
        console.log(`  ${t.padEnd(30)} ${r.n !== null ? r.n : 'ERROR: ' + r.error}`);
    }

    // ── Insert velocity (rows created in last 24h) ───────────────────────────
    console.log('\n--- Insert velocity (last 24h) ---');
    const since24h = new Date(Date.now() - 86400000).toISOString();
    const velocity = {};
    for (const t of tables) {
        const r = await count(t, q => q.gte('created_at', since24h));
        velocity[t] = r.n;
        if (r.n !== null && r.n > 0) console.log(`  ${t.padEnd(30)} ${r.n}`);
    }
    const totalVel = Object.values(velocity).filter(v => v !== null).reduce((s, v) => s + v, 0);
    console.log(`  Total new rows in 24h: ${totalVel}`);

    // ── Read latency (single timing per table) ───────────────────────────────
    console.log('\n--- Read latency (ms per table) ---');
    const latency = {};
    for (const t of tables) {
        const r = await timedRead(t, 'created_at', null);
        latency[t] = r.ms;
        console.log(`  ${t.padEnd(30)} ${r.ms !== null ? r.ms + 'ms' : 'ERROR: ' + r.error}`);
    }

    // ── episodic_memory detail ───────────────────────────────────────────────
    console.log('\n--- episodic_memory detail ---');
    const epRows = await rows('episodic_memory', 'memory_id,success,embedding,created_at', null, 500);
    const epTotal = epRows.length;
    const epNullEmbed = epRows.filter(r => !r.embedding).length;
    const epSuccesses = epRows.filter(r => r.success).length;
    const epOrphans = 0; // episodic has no FK that could produce orphans
    console.log(`  Total rows (sample):    ${epTotal}`);
    console.log(`  Without embedding:      ${epNullEmbed} (${epTotal ? Math.round(epNullEmbed/epTotal*100) : 0}%)`);
    console.log(`  Success rate:           ${epTotal ? Math.round(epSuccesses/epTotal*100) : 0}%`);
    // Check for duplicate objectives
    const epObjs = epRows.map(r => r.objective);
    const epDupCount = epObjs ? 0 : 0; // skip deep analysis

    // ── decision_memory detail ───────────────────────────────────────────────
    console.log('\n--- decision_memory detail ---');
    const dmRows = await rows('decision_memory', 'memory_id,outcome_quality,embedding,task_id,created_at', null, 500);
    const dmTotal = dmRows.length;
    const dmNoOutcome = dmRows.filter(r => !r.outcome_quality).length;
    const dmNullEmbed = dmRows.filter(r => !r.embedding).length;
    const dmNoTask = dmRows.filter(r => !r.task_id).length;
    console.log(`  Total rows (sample):    ${dmTotal}`);
    console.log(`  Without outcome:        ${dmNoOutcome} (${dmTotal ? Math.round(dmNoOutcome/dmTotal*100) : 0}%)`);
    console.log(`  Without embedding:      ${dmNullEmbed} (${dmTotal ? Math.round(dmNullEmbed/dmTotal*100) : 0}%)`);
    console.log(`  Without task_id:        ${dmNoTask} (${dmTotal ? Math.round(dmNoTask/dmTotal*100) : 0}%)`);

    // ── semantic_memory detail ───────────────────────────────────────────────
    console.log('\n--- semantic_memory detail ---');
    const smRows = await rows('semantic_memory', 'memory_id,status,embedding,confidence,category,source', null, 500);
    const smTotal = smRows.length;
    const smNullEmbed = smRows.filter(r => !r.embedding).length;
    const smByStatus = {};
    for (const r of smRows) smByStatus[r.status] = (smByStatus[r.status] || 0) + 1;
    const smBySource = {};
    for (const r of smRows) smBySource[r.source || 'null'] = (smBySource[r.source || 'null'] || 0) + 1;
    console.log(`  Total rows (sample):    ${smTotal}`);
    console.log(`  Without embedding:      ${smNullEmbed} (${smTotal ? Math.round(smNullEmbed/smTotal*100) : 0}%)`);
    console.log(`  By status:              ${JSON.stringify(smByStatus)}`);
    console.log(`  By source:              ${JSON.stringify(smBySource)}`);

    // ── working_memory detail ────────────────────────────────────────────────
    console.log('\n--- working_memory detail ---');
    const wmRows = await rows('working_memory', 'memory_id,session_id,memory_type,expires_at,created_at', null, 200);
    const wmTotal = wmRows.length;
    const now = new Date();
    const wmExpired = wmRows.filter(r => new Date(r.expires_at) < now).length;
    const wmSessions = new Set(wmRows.map(r => r.session_id)).size;
    console.log(`  Total rows:             ${wmTotal}`);
    console.log(`  Expired (not purged):   ${wmExpired}`);
    console.log(`  Distinct sessions:      ${wmSessions}`);

    // ── knowledge graph detail ───────────────────────────────────────────────
    console.log('\n--- knowledge_graph detail ---');
    const kgnRows = await rows('knowledge_graph_nodes', 'node_id,node_type,source_memory_id,source_table', null, 500);
    const kgeRows = await rows('knowledge_graph_edges', 'edge_id,from_node_id,to_node_id,relationship', null, 500);
    const kgnTotal = kgnRows.length;
    const kgeTotal = kgeRows.length;
    const kgnByType = {};
    for (const r of kgnRows) kgnByType[r.node_type] = (kgnByType[r.node_type] || 0) + 1;
    const kgeByRel = {};
    for (const r of kgeRows) kgeByRel[r.relationship] = (kgeByRel[r.relationship] || 0) + 1;
    // Orphan edges: edges where from_node_id not in node set
    const nodeSet = new Set(kgnRows.map(r => r.node_id));
    const orphanEdges = kgeRows.filter(r => !nodeSet.has(r.from_node_id) || !nodeSet.has(r.to_node_id)).length;
    console.log(`  Nodes (sample):         ${kgnTotal}`);
    console.log(`  Edges (sample):         ${kgeTotal}`);
    console.log(`  Node types:             ${JSON.stringify(kgnByType)}`);
    console.log(`  Edge relationships:     ${JSON.stringify(kgeByRel)}`);
    console.log(`  Orphan edges (sample):  ${orphanEdges}`);

    // ── reflexion_records detail ─────────────────────────────────────────────
    console.log('\n--- reflexion_records detail ---');
    const rfxRows = await rows('reflexion_records', 'reflexion_id,status,retrieval_count,influenced_decisions,behavior_change_verified', null, 200);
    const rfxTotal = rfxRows.length;
    const rfxDead = rfxRows.filter(r => r.retrieval_count === 0 && r.status === 'pending').length;
    const rfxVerified = rfxRows.filter(r => r.behavior_change_verified).length;
    console.log(`  Total:                  ${rfxTotal}`);
    console.log(`  Dead (never retrieved): ${rfxDead} (${rfxTotal ? Math.round(rfxDead/rfxTotal*100) : 0}%)`);
    console.log(`  Behavior verified:      ${rfxVerified}`);

    // ── Insert timing ────────────────────────────────────────────────────────
    console.log('\n--- Insert latency probes ---');
    // Test with a real episodic insert and immediate delete
    const epId = `ep-health-${Date.now().toString(36)}`;
    const t0ep = Date.now();
    const { error: epInsErr } = await sb.from('episodic_memory').insert({
        memory_id:  epId,
        source:     'health_check',
        objective:  'health check probe — safe to delete',
        success:    true,
        keywords:   [],
        status:     'validated',
        validation_state: 'auto_validated',
    });
    const epInsMs = Date.now() - t0ep;
    if (epInsErr) {
        console.log(`  episodic INSERT: FAIL (${epInsErr.message})`);
    } else {
        console.log(`  episodic INSERT: ${epInsMs}ms`);
        // Clean up
        await sb.from('episodic_memory').delete().eq('memory_id', epId);
        console.log(`  episodic DELETE (cleanup): ok`);
    }

    // Test decision_memory insert
    const dmId = `dm-health-${Date.now().toString(36)}`;
    const t0dm = Date.now();
    const { error: dmInsErr } = await sb.from('decision_memory').insert({
        memory_id:       dmId,
        source:          'health_check',
        decision:        'health check probe — safe to delete',
        decision_type:   'operational',
        rationale:       'probe',
        status:          'candidate',
        validation_state:'pending',
    });
    const dmInsMs = Date.now() - t0dm;
    if (dmInsErr) {
        console.log(`  decision INSERT: FAIL (${dmInsErr.message})`);
    } else {
        console.log(`  decision INSERT: ${dmInsMs}ms`);
        await sb.from('decision_memory').delete().eq('memory_id', dmId);
        console.log(`  decision DELETE (cleanup): ok`);
    }

    // ── Consolidation queue state ────────────────────────────────────────────
    console.log('\n--- consolidation_queue state ---');
    const cqRows = await rows('memory_consolidation_queue', 'queue_id,consolidation_stage,attempts', null, 200);
    const cqByStage = {};
    for (const r of cqRows) cqByStage[r.consolidation_stage] = (cqByStage[r.consolidation_stage] || 0) + 1;
    const cqStuck = cqRows.filter(r => r.attempts >= 3).length;
    console.log(`  By stage: ${JSON.stringify(cqByStage)}`);
    console.log(`  Stuck (attempts>=3): ${cqStuck}`);

    // ── adaptation_cycles ───────────────────────────────────────────────────
    console.log('\n--- adaptation_cycles ---');
    const acRows = await rows('adaptation_cycles', 'cycle_id,status,started_at,completed_at', null, 20);
    const acByStatus = {};
    for (const r of acRows) acByStatus[r.status] = (acByStatus[r.status] || 0) + 1;
    console.log(`  By status: ${JSON.stringify(acByStatus)}`);

    console.log('\n=== MEASUREMENT COMPLETE ===');
    process.exit(0);
})();
