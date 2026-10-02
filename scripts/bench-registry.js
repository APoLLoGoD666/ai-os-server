'use strict';
// Baseline benchmark — run before and after Phase 4 changes to measure regression/gain.

const { query }  = require('../lib/registry/query');
const impact     = require('../lib/registry/impact');
const caps       = require('../lib/registry/capabilities');
const constraints = require('../lib/registry/constraints');

function bench(label, fn, runs = 3) {
    // warmup
    fn();
    const times = [];
    for (let i = 0; i < runs; i++) {
        const t0 = process.hrtime.bigint();
        fn();
        times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }
    const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
    const min = Math.min(...times).toFixed(1);
    console.log(`  ${label.padEnd(40)} avg ${avg}ms  min ${min}ms`);
    return parseFloat(avg);
}

console.log('\n── Registry Performance Benchmark ──────────────────');

// ── Cold-start already happened (module load). Measure first-call costs. ──────
const t0 = Date.now();
require('../lib/registry');
console.log(`  ${'registry require()'.padEnd(40)} ${Date.now() - t0}ms (cold, includes cache build)`);

console.log('\n── Query layer ──────────────────────────────────────');
bench('entity.lookup (ENT-000388)',        () => query('entity.lookup', { id: 'ENT-000388' }));
bench('entity.find (family=GOV)',          () => query('entity.find', { family: 'GOV' }));
bench('entity.search ("auth")',            () => query('entity.search', { q: 'auth', limit: 20 }));

console.log('\n── Impact analysis ──────────────────────────────────');
bench('impact.analyze depth=3 upstream',   () => impact.analyze('ENT-000388', { depth: 3 }));
bench('impact.analyze depth=5 upstream',   () => impact.analyze('ENT-000388', { depth: 5 }));
bench('impact.analyze depth=5 both',       () => impact.analyze('ENT-000388', { depth: 5, direction: 'both' }));
bench('impact.quickRisk',                  () => impact.quickRisk('ENT-000388'));

console.log('\n── Capabilities ─────────────────────────────────────');
bench('capabilities.statusOf(agent_system)', () => caps.statusOf('agent_system'));
bench('capabilities.fullReport()',           () => caps.fullReport());
bench('capabilities.degradationFrom(ENT-000388)', () => caps.degradationFrom('ENT-000388'));

console.log('\n── Constraints ──────────────────────────────────────');
bench('constraints.check() static only',   () => constraints.check());
bench('constraints.check() full',          () => constraints.check({ full: true }), 2);

console.log('\n── Batch query ──────────────────────────────────────');
bench('query: composite.entity_full',      () => query('composite.entity_full', { id: 'ENT-000388', impact_depth: 3 }));

console.log('');
