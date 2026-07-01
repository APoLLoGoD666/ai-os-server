'use strict';
// Phase 17: Executive Domain Universality Audit
// Tests ALL registered executive domains (not just CFO/CTO):
// stored → retrieved → exact-source priority → cross-domain isolation
// Produces a matrix of results.

require('dotenv').config();
const domainMem = require('./lib/executive/domain-memory');
const pgPool    = require('../../lib/pg_database');

// All executives from domain-memory EXEC_DOMAINS + cross-check with registry
const ALL_EXECS = ['cso', 'cio', 'cfo', 'cto', 'coo', 'cgo', 'cho', 'clo', 'cro'];
// Note: 'ceo' and 'cso' naming conflict documented below
const EXEC_DOMAINS_MAP = {
    ceo: 'strategy', cto: 'technology', cfo: 'finance', coo: 'operations',
    cso: 'security', cio: 'intelligence', cgo: 'governance', cho: 'health',
    clo: 'legal', cro: 'risk',
};

const UNIQUE_MARKER = `P17-${Date.now()}`;

async function pg(sql, params = []) {
    const r = await pgPool.query(sql, params); return r.rows;
}

async function testExec(entityId) {
    const domain = EXEC_DOMAINS_MAP[entityId] || 'general';
    const lessonText = `${UNIQUE_MARKER} [${entityId.toUpperCase()}/${domain}] Phase-17 test: ${entityId} institutional memory validation at ${new Date().toISOString()}`;

    const result = { entityId, domain, stored: false, retrieved: false, exactSource: false, isolated: false, details: {} };

    try {
        // 1. STORE
        await domainMem.recordDomainLessons({
            question: `How should the ${entityId.toUpperCase()} optimize ${domain}?`,
            recommendation: lessonText,
            votes: [{ entityId, vote: 'approve', rationale: lessonText, confidence: 0.80 }],
            deliberationId: `p17-${entityId}-${Date.now()}`,
        });
        await new Promise(r => setTimeout(r, 600));

        // Verify stored in DB
        const rows = await pg(
            `SELECT memory_id, source FROM semantic_memory WHERE source=$1 AND fact LIKE $2 LIMIT 1`,
            [`executive.${entityId}`, `%${UNIQUE_MARKER}%`]
        );
        result.stored = rows.length > 0;
        result.details.storedId = rows[0]?.memory_id;

        // 2. RETRIEVE
        const ctx = await domainMem.getDomainContext(entityId, 5);
        const found = ctx.find(d => {
            const c = typeof d.content === 'string' ? d.content : JSON.stringify(d.content);
            return c.includes(UNIQUE_MARKER);
        });
        result.retrieved = !!found;

        // 3. EXACT-SOURCE PRIORITY
        const exactSrc = ctx.filter(d => d.source === `executive.${entityId}`);
        result.exactSource = exactSrc.length > 0;
        result.details.exactSourceCount = exactSrc.length;
        result.details.totalRetrieved = ctx.length;

        // 4. CROSS-DOMAIN ISOLATION — ensure NO other executives see THIS executive's specific lesson
        // Use entity-specific marker [ENTITYID/domain] to avoid false positives from other execs' lessons
        const entityMarker = `[${entityId.toUpperCase()}/${domain}]`;
        const isolationFailures = [];
        for (const otherId of ALL_EXECS) {
            if (otherId === entityId) continue;
            const otherCtx = await domainMem.getDomainContext(otherId, 10);
            const leak = otherCtx.find(d => {
                const c = typeof d.content === 'string' ? d.content : JSON.stringify(d.content);
                return c.includes(entityMarker); // Look for THIS executive's specific tag in other contexts
            });
            if (leak) isolationFailures.push(otherId);
        }
        result.isolated = isolationFailures.length === 0;
        result.details.isolationFailures = isolationFailures;

    } catch (e) {
        result.details.error = e.message;
    }

    return result;
}

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 17 — EXECUTIVE DOMAIN UNIVERSALITY AUDIT              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Note naming conflicts
    console.log('REGISTRY/DOMAIN MAPPING NOTE:');
    console.log('  Registry has 6 entities: cso (Strategy), cio (Intelligence), cfo, cto, coo, cgo (Growth)');
    console.log('  EXEC_DOMAINS has 10: ceo (Strategy), cso (Security), cio (Intelligence), cfo, cto, coo, cgo (Governance), cho, clo, cro');
    console.log('  CONFLICT: Registry "cso"=Chief Strategy Officer; EXEC_DOMAINS "cso"=Security.');
    console.log('  CONFLICT: Registry "cgo"=Chief Growth Officer; EXEC_DOMAINS "cgo"=Governance domain.');
    console.log('  Testing all EXEC_DOMAINS entities (10), noting which are in registry (6).\n');

    const REGISTRY_ENTITIES = new Set(['cso', 'cio', 'cfo', 'cto', 'coo', 'cgo']);
    const ALL_TO_TEST = ['cso', 'cio', 'cfo', 'cto', 'coo', 'cgo', 'cho', 'clo', 'cro'];

    console.log(`Testing ${ALL_TO_TEST.length} executive domains sequentially...\n`);

    const results = [];
    for (const entityId of ALL_TO_TEST) {
        process.stdout.write(`  Testing ${entityId.toUpperCase()}...`);
        const r = await testExec(entityId);
        results.push(r);
        const icon = (r.stored && r.retrieved && r.exactSource && r.isolated) ? '✓' : '✗';
        console.log(` ${icon} stored=${r.stored} retrieved=${r.retrieved} exactSrc=${r.exactSource} isolated=${r.isolated} ${r.details.error ? `ERROR:${r.details.error.slice(0,40)}` : ''}`);
    }

    // Matrix output
    console.log('\n═════════════════════════════════════════════════════════════════');
    console.log('RESULT MATRIX:');
    console.log('');
    console.log(`${'Entity'.padEnd(8)} ${'Domain'.padEnd(12)} ${'In Reg'.padEnd(7)} ${'Stored'.padEnd(8)} ${'Retrieved'.padEnd(10)} ${'ExactSrc'.padEnd(10)} ${'Isolated'.padEnd(10)} Status`);
    console.log('─'.repeat(80));
    for (const r of results) {
        const inRegistry = REGISTRY_ENTITIES.has(r.entityId) ? 'YES' : 'no';
        const allPass = r.stored && r.retrieved && r.exactSource && r.isolated;
        const status = r.details.error ? 'ERROR' : allPass ? '✓ PASS' : '✗ FAIL';
        console.log(`${r.entityId.toUpperCase().padEnd(8)} ${(r.domain || '?').padEnd(12)} ${inRegistry.padEnd(7)} ${String(r.stored).padEnd(8)} ${String(r.retrieved).padEnd(10)} ${String(r.exactSource).padEnd(10)} ${String(r.isolated).padEnd(10)} ${status}`);
        if (r.details.isolationFailures?.length > 0) {
            console.log(`         ^ ISOLATION FAILURES: leaked to ${r.details.isolationFailures.join(', ')}`);
        }
    }

    const passed = results.filter(r => r.stored && r.retrieved && r.exactSource && r.isolated).length;
    const total  = results.length;
    console.log('─'.repeat(80));
    console.log(`RESULT: ${passed}/${total} executive domains fully certified\n`);

    // Failures detail
    const failures = results.filter(r => !r.stored || !r.retrieved || !r.exactSource || !r.isolated || r.details.error);
    if (failures.length > 0) {
        console.log('FAILURES REQUIRING ATTENTION:');
        for (const f of failures) {
            console.log(`  ${f.entityId.toUpperCase()}: stored=${f.stored} retrieved=${f.retrieved} exactSrc=${f.exactSource} isolated=${f.isolated}`);
            if (f.details.error) console.log(`    Error: ${f.details.error}`);
            if (f.details.isolationFailures?.length > 0) console.log(`    Leaked to: ${f.details.isolationFailures.join(', ')}`);
        }
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 17 COMPLETE                                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    process.exit(failures.length > 0 ? 1 : 0);
}

run().catch(e => { console.error('PHASE 17 FAILED:', e.message); process.exit(1); });
