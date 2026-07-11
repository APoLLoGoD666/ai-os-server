#!/usr/bin/env node
'use strict';
// scripts/registry.js — APEX Registry CLI
// Usage: node scripts/registry.js <command> [args]

require('dotenv').config();
const reg    = require('../lib/registry');
const eng    = reg.engine;
const rels   = reg.relationships;
const val    = reg.validator;
const proj   = reg.projections;
const disco  = reg.discovery;
const twin   = reg.twin;
const impact = reg.impact;
const qry         = reg.query;
const constraints = reg.constraints;
const prediction  = reg.prediction;
const temporal    = reg.temporal;
const caps        = reg.capabilities;
const snap        = reg.snapshot;
const scenario    = reg.scenario;

const [,, cmd, ...args] = process.argv;

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtEntity(e, short = false) {
    if (!e) return '  (not found)';
    const lines = [`${e.id}  ${e.name}`];
    if (!short) {
        lines.push(`  Family: ${e.family || '—'}  Type: ${e.type || '—'}  Status: ${e.status || '—'}  Confidence: ${e.confidence || '—'}`);
        lines.push(`  Block:  ${e.block != null ? e.block : '—'}`);
        lines.push(`  Path:   ${e.path || '—'}`);
        if (e.owner)       lines.push(`  Owner:  ${e.owner}`);
        if (e.purpose)     lines.push(`  Purpose: ${e.purpose}`);
        if (e.description) lines.push(`  Desc:   ${e.description.slice(0, 120)}${e.description.length > 120 ? '…' : ''}`);
    }
    return lines.join('\n');
}

function tally(arr, key) {
    const t = {};
    for (const x of arr) { const k = x[key] || '(none)'; t[k] = (t[k] || 0) + 1; }
    return Object.entries(t).sort((a, b) => b[1] - a[1]);
}

// ── Commands ──────────────────────────────────────────────────────────────────

switch (cmd) {

    case 'entity': {
        const id = args[0];
        if (!id) { console.error('Usage: registry entity ENT-NNNNNN'); process.exit(1); }
        const e = eng.lookup(id);
        if (!e) { console.error(`Not found: ${id}`); process.exit(1); }
        console.log('\n' + fmtEntity(e));
        const out = rels.relationsOf(id);
        const inn = rels.reverseRelationsOf(id);
        if (out.length) {
            console.log('\n  Relationships (outgoing):');
            for (const r of out) {
                const target = eng.lookup(r.to);
                console.log(`    → ${r.to}  ${target ? target.name : '(unknown)'}  [${r.type}]${r.label ? '  // ' + r.label : ''}`);
            }
        }
        if (inn.length) {
            console.log('\n  Referenced by (incoming):');
            for (const r of inn) {
                const source = eng.lookup(r.to);
                console.log(`    ← ${r.to}  ${source ? source.name : '(unknown)'}  [${r.type}]`);
            }
        }
        console.log('');
        break;
    }

    case 'search': {
        const q = args.join(' ');
        if (!q) { console.error('Usage: registry search <query>'); process.exit(1); }
        const results = eng.search(q);
        console.log(`\n${results.length} result(s) for "${q}":\n`);
        for (const e of results.slice(0, 25)) console.log(fmtEntity(e, false) + '\n');
        if (results.length > 25) console.log(`  … and ${results.length - 25} more`);
        break;
    }

    case 'owner': {
        const owner = args[0];
        if (!owner) { console.error('Usage: registry owner <OWNER>'); process.exit(1); }
        const results = eng.byOwner(owner);
        console.log(`\n${results.length} entit(ies) owned by "${owner}":\n`);
        for (const e of results) console.log(`  ${e.id}  ${e.name}  [${e.type}]`);
        console.log('');
        break;
    }

    case 'list': {
        const flag  = args[0];
        const value = args[1];
        let results;
        if      (flag === '--type')   results = eng.find({ type: value });
        else if (flag === '--family') results = eng.find({ family: value });
        else if (flag === '--block')  results = eng.find({ block: parseInt(value) });
        else if (flag === '--status') results = eng.find({ status: value });
        else                          results = eng.all();
        console.log(`\n${results.length} entit(ies)${flag ? ` (${flag} ${value})` : ''}:\n`);
        for (const e of results) console.log(`  ${e.id}  ${e.name}  [${e.type || '—'}]  ${e.status || ''}`);
        console.log('');
        break;
    }

    case 'validate': {
        console.log('\nRunning registry validation…\n');
        const findings = val.validate();
        if (!findings.length) {
            console.log('✓  Registry valid — no issues detected.\n');
            break;
        }
        const errors = findings.filter(f => f.severity === 'ERROR');
        const warns  = findings.filter(f => f.severity === 'WARN');
        const infos  = findings.filter(f => f.severity === 'INFO');
        console.log(`Result: ${errors.length} error(s)  ${warns.length} warning(s)  ${infos.length} info(s)\n`);
        for (const f of findings) {
            const icon = { ERROR: '✗', WARN: '!', INFO: 'i' }[f.severity] || '?';
            console.log(`  ${icon}  [${f.rule}]  ${f.entity}  ${f.detail}`);
        }
        console.log('');
        if (errors.length) process.exit(1);
        break;
    }

    case 'graph': {
        const id    = args[0];
        const depth = parseInt(args[1] || '2');
        if (!id) { console.error('Usage: registry graph ENT-NNNNNN [depth]'); process.exit(1); }
        const root = eng.lookup(id);
        console.log(`\nGraph from ${id}${root ? ' — ' + root.name : ''}  (depth: ${depth})\n`);
        const { nodes, edges } = rels.graph(id, depth);
        console.log(`Nodes (${nodes.length}):`);
        for (const n of nodes) {
            const e = eng.lookup(n);
            console.log(`  ${n}  ${e ? e.name : '(unregistered)'}`);
        }
        console.log(`\nEdges (${edges.length}):`);
        for (const edge of edges) {
            const f = eng.lookup(edge.from);
            const t = eng.lookup(edge.to);
            console.log(`  ${edge.from} (${f?.name || '?'})  →[${edge.type}]→  ${edge.to} (${t?.name || '?'})`);
        }
        console.log('');
        break;
    }

    case 'stats': {
        const all = eng.all();
        console.log(`\nRegistry Statistics\n${'─'.repeat(40)}`);
        console.log(`Total entities: ${all.length}\n`);
        console.log('By Family:');
        for (const [k, v] of tally(all, 'family')) console.log(`  ${k.padEnd(16)} ${v}`);
        console.log('\nBy Type:');
        for (const [k, v] of tally(all, 'type'))   console.log(`  ${k.padEnd(16)} ${v}`);
        console.log('\nBy Status:');
        for (const [k, v] of tally(all, 'status'))  console.log(`  ${k.padEnd(16)} ${v}`);
        console.log(`\nRelationships defined: ${rels.all().length}`);
        console.log('');
        break;
    }

    case 'projection': {
        const sub = args[0];
        if (sub === 'check' || sub === 'physical') {
            console.log('\nChecking physical projection…\n');
            const report = proj.checkAllPhysical();
            console.log(`  Sync:   ${report.sync.length}`);
            console.log(`  Drift:  ${report.drift.length}`);
            console.log(`  Skip:   ${report.skip.length}\n`);
            if (report.drift.length) {
                console.log('Drift (registered path not found on disk):');
                for (const d of report.drift) {
                    console.log(`  ${d.id}  ${d.name}`);
                    console.log(`    Expected: ${d.expected}`);
                }
                console.log('');
            }
        } else if (sub === 'entity') {
            const id = args[1];
            if (!id) { console.error('Usage: registry projection entity ENT-NNNNNN'); process.exit(1); }
            const e = eng.lookup(id);
            if (!e) { console.error(`Not found: ${id}`); process.exit(1); }
            console.log(`\nProjections for ${id} — ${e.name}\n`);
            for (const r of proj.checkAllProjections(e)) {
                const icon = { SYNC: '✓', DRIFT: '✗', SKIP: '·', NOT_IMPLEMENTED: '○' }[r.status] || '?';
                console.log(`  ${icon}  ${r.projection.padEnd(14)} ${r.status}${r.detail ? '  // ' + r.detail : ''}${r.path ? '  ' + r.path : ''}`);
            }
            console.log('');
        } else {
            console.log('Usage:\n  registry projection check           — physical drift report\n  registry projection entity ENT-NNNNNN — all projections for one entity\n');
        }
        break;
    }

    case 'impact': {
        const id        = args[0];
        const depthArg  = args.indexOf('--depth');
        const dirArg    = args.indexOf('--direction');
        const depth     = depthArg >= 0 ? parseInt(args[depthArg + 1]) : 5;
        const direction = dirArg   >= 0 ? args[dirArg + 1] : 'upstream';

        if (!id) { console.error('Usage: registry impact ENT-NNNNNN [--depth N] [--direction upstream|downstream|both]'); process.exit(1); }
        const e = eng.lookup(id);
        if (!e) { console.error(`Not found: ${id}`); process.exit(1); }

        console.log(`\nAnalysing impact… (this may take a moment on first run)`);
        const report = impact.analyze(id, { depth, direction });

        const RISK_ICON = { CRITICAL: '◈◈', HIGH: '◈', MEDIUM: '!', LOW: '·' };
        console.log(`\nImpact Analysis — ${id}  ${e.name}`);
        console.log(`${'─'.repeat(55)}`);
        console.log(`  Direction:  ${direction}`);
        console.log(`  Depth:      ${depth} hops`);
        console.log(`  Risk:       ${RISK_ICON[report.risk_level] || '?'}  ${report.risk_level}`);
        console.log(`\nBlast Radius:`);
        console.log(`  Direct:     ${report.blast_radius.direct}`);
        console.log(`  Transitive: ${report.blast_radius.transitive}`);
        console.log(`  Total:      ${report.blast_radius.total}`);

        if (Object.keys(report.affected.by_family).length) {
            console.log('\nAffected by Family:');
            for (const [fam, ids] of Object.entries(report.affected.by_family).sort((a,b) => b[1].length - a[1].length)) {
                console.log(`  ${fam.padEnd(10)} ${ids.length}`);
            }
        }

        if (Object.keys(report.affected.by_type).length) {
            console.log('\nAffected by Type:');
            for (const [typ, ids] of Object.entries(report.affected.by_type).sort((a,b) => b[1].length - a[1].length)) {
                console.log(`  ${typ.padEnd(14)} ${ids.length}`);
            }
        }

        if (report.affected.direct.length) {
            console.log('\nDirect Dependents (depth 1):');
            for (const d of report.affected.direct.slice(0, 20)) {
                console.log(`  ${d.id}  ${(d.name || '').slice(0, 40).padEnd(42)}  [${d.family || '—'}]  ${d.rel_type || ''}`);
            }
            if (report.affected.direct.length > 20) console.log(`  … and ${report.affected.direct.length - 20} more`);
        }

        if (report.affected.migrations.length) {
            console.log('\nMigrations touching affected entities:');
            for (const m of report.affected.migrations) {
                console.log(`  ● ${m.filename.padEnd(42)} [${m.status}]`);
            }
        }

        if (report.affected.docs.length) {
            console.log('\nDocs referencing affected entities:');
            for (const d of report.affected.docs.slice(0, 10)) console.log(`  ${d}`);
            if (report.affected.docs.length > 10) console.log(`  … and ${report.affected.docs.length - 10} more`);
        }

        console.log('');
        break;
    }

    case 'twin': {
        const id = args[0];
        if (!id) { console.error('Usage: registry twin ENT-NNNNNN'); process.exit(1); }
        const e = eng.lookup(id);
        if (!e) { console.error(`Not found: ${id}`); process.exit(1); }
        const state = twin.computeState(e);
        const HEALTH_ICON = { active: '●', inactive: '○', missing: '✗', external: '⊙', present: '◎', degraded: '!', unknown: '?' };
        const scoreStr = state.health_score != null
            ? `  score=${state.health_score}  confidence=${state.confidence}`
            : '';
        console.log(`\nDigital Twin — ${id}  ${e.name}`);
        console.log(`${'─'.repeat(50)}`);
        console.log(`  Health:     ${HEALTH_ICON[state.health] || '?'}  ${state.health.toUpperCase()}${scoreStr}`);
        console.log(`  Physical:   ${state.physical || '—'}`);
        console.log(`  Runtime:    ${state.runtime_loaded || '—'}`);
        console.log(`  Documented: ${state.documented || '—'}`);
        if (state.last_git_commit) {
            console.log(`  Last commit: ${state.last_git_commit.slice(0, 8)}  ${state.last_git_date || ''}`);
        }
        if (state.evidence && state.evidence.length) {
            console.log(`\n  Evidence:`);
            for (const s of state.evidence) {
                const bar = '█'.repeat(Math.round(s.value * 8)) + '░'.repeat(8 - Math.round(s.value * 8));
                console.log(`    ${s.source.padEnd(14)} [${bar}]  ${(s.value * 100).toFixed(0)}%  w=${s.weight}`);
            }
        }
        console.log(`\n  Projections:`);
        for (const p of state.projections) {
            const icon = { SYNC: '✓', DRIFT: '✗', SKIP: '·', NOT_IMPLEMENTED: '○' }[p.status] || '?';
            const detail = p.detail || p.reason || p.path || '';
            console.log(`    ${icon}  ${p.projection.padEnd(14)} ${p.status}${detail ? '  // ' + detail.slice(0, 70) : ''}`);
        }
        console.log(`\n  Relationships: ${state.relationships.outgoing.length} out  ${state.relationships.incoming.length} in`);
        console.log(`  Checked:    ${state.last_checked}\n`);
        break;
    }

    case 'discover': {
        const sub = args[0];
        if (sub === 'merge') {
            console.log('\nMerging discovered relationships into graph…');
            const added = disco.mergeIntoGraph();
            console.log(`  Added: ${added} new relationship(s)\n`);
        } else {
            const id = sub;
            let edges;
            if (id && /^ENT-\d{6}$/.test(id)) {
                edges = disco.discoverFor(id);
                console.log(`\nDiscovered relationships for ${id}  (${edges.length}):\n`);
            } else {
                edges = disco.discover();
                console.log(`\nAll discovered relationships  (${edges.length}):\n`);
            }
            for (const e of edges.slice(0, 50)) {
                console.log(`  ${e.from}  →[${e.type}]→  ${e.to}  // ${e.label || ''}`);
            }
            if (edges.length > 50) console.log(`  … and ${edges.length - 50} more`);
            console.log('');
        }
        break;
    }

    case 'capability': {
        const sub = args[0];

        if (!sub || sub === 'status') {
            // System-wide capability status report
            console.log('\nCapability Status Report\n' + '─'.repeat(55));
            const report = caps.fullReport();
            const s = report.summary;
            console.log(`  Operational: ${s.operational}  Degraded: ${s.degraded}  Down: ${s.down}  Total: ${s.total}\n`);
            const STATUS_ICON = { OPERATIONAL: '●', DEGRADED: '!', DOWN: '✗', UNKNOWN: '?' };
            const CRIT_COLOR  = { CRITICAL: '◈◈', HIGH: '◈', MEDIUM: '!', LOW: '·', MINIMAL: '·' };
            for (const c of report.capabilities) {
                const icon = STATUS_ICON[c.status] || '?';
                const crit = CRIT_COLOR[c.criticality] || '';
                console.log(`  ${icon}  ${c.name.padEnd(28)} [${c.criticality}${crit ? ' ' + crit : ''}]  ${c.status}`);
                if (c.issues.length) {
                    for (const iss of c.issues.slice(0, 3)) {
                        console.log(`       ${iss.id}  ${(iss.name || '').slice(0,30)}  [${iss.strength}]  ${iss.health}`);
                    }
                }
            }
            console.log('');

        } else if (sub === 'degradation') {
            const id = args[1];
            if (!id) { console.error('Usage: registry capability degradation ENT-NNNNNN'); process.exit(1); }
            const entity = eng.lookup(id);
            console.log(`\nCapability Degradation — ${id}  ${entity ? entity.name : '(unknown)'}\n`);
            const result = caps.degradationFrom(id);
            if (!result.affected.length) {
                console.log('  No capabilities are affected by this entity.\n');
            } else {
                const SEV_ICON = { CRITICAL: '◈◈', HIGH: '◈', MEDIUM: '!', LOW: '·', MINIMAL: '·' };
                console.log(`  Worst severity: ${result.worst_severity}  |  ${result.affected_count} capability(ies) affected\n`);
                for (const a of result.affected) {
                    const icon = SEV_ICON[a.severity] || '?';
                    console.log(`  ${icon}  ${a.name.padEnd(30)} [${a.criticality}]  →  Severity: ${a.severity}  [${a.strength} dep]`);
                    console.log(`       Reason: ${a.reason}`);
                }
                console.log('');
            }

        } else if (sub === 'list') {
            console.log('\nDefined Capabilities:\n');
            for (const c of caps.all()) {
                const CRIT = { CRITICAL: '◈◈', HIGH: '◈', MEDIUM: '!', LOW: '·' };
                console.log(`  ${(CRIT[c.criticality] || ' ').padEnd(3)} ${c.name.padEnd(28)} [${c.criticality}]  ${c.entity_count} entities  — ${c.id}`);
            }
            console.log('');

        } else {
            // Treat sub as a capability id
            const capDef = caps.getCapability(sub);
            if (!capDef) {
                console.error(`Unknown capability: "${sub}". Run: registry capability list`);
                process.exit(1);
            }
            const status = caps.statusOf(sub);
            const STATUS_ICON = { OPERATIONAL: '●', DEGRADED: '!', DOWN: '✗', UNKNOWN: '?' };
            console.log(`\nCapability: ${capDef.name}  [${capDef.criticality}]\n${'─'.repeat(50)}`);
            console.log(`  Status:   ${STATUS_ICON[status.status] || '?'}  ${status.status}`);
            console.log(`  Entities: ${status.entity_count}  (${status.healthy_deps} healthy)`);
            console.log(`  Desc:     ${capDef.description}`);
            if (status.issues.length) {
                console.log('\n  Issues:');
                for (const iss of status.issues) {
                    const icon = iss.health === 'down' ? '✗' : '!';
                    console.log(`    ${icon}  ${iss.id}  ${(iss.name || '').slice(0, 35).padEnd(36)} [${iss.strength}]  ${iss.health}`);
                    if (iss.detail) console.log(`       ${iss.detail}`);
                }
            }
            console.log(`\n  Dependencies:`);
            for (const dep of capDef.depends_on) {
                const entity = eng.lookup(dep.id);
                const name   = entity ? entity.name : '(not found)';
                const icon   = dep.strength === 'required' ? '◈' : dep.strength === 'fallback' ? '◇' : '○';
                console.log(`    ${icon}  ${dep.id}  ${name.slice(0, 35).padEnd(36)} [${dep.strength}]  ${dep.reason}`);
            }
            console.log('');
        }
        break;
    }

    case 'temporal': {
        const sub = args[0];
        if (sub === 'diff') {
            const days = args[1] || '7';
            console.log(`\nHealth changes in the last ${days} day(s)…\n`);
            temporal.diff({ days }).then(r => {
                if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
                console.log(`  Since:   ${r.since}`);
                console.log(`  Changes: ${r.total_changes}\n`);
                for (const c of r.changes) {
                    console.log(`  ${c.entity_id}  ${(c.entity_name || '').slice(0, 35)}`);
                    for (const t of c.transitions) {
                        const delta = t.score_delta > 0 ? `+${t.score_delta}` : String(t.score_delta);
                        console.log(`    ${t.from.padEnd(10)} → ${t.to.padEnd(10)} (Δ${delta})  ${t.recorded_at}`);
                    }
                }
                console.log('');
            });
        } else if (sub === 'timeline') {
            const id    = args[1];
            const limit = args[2] || '20';
            if (!id) { console.error('Usage: registry temporal timeline ENT-NNNNNN [limit]'); process.exit(1); }
            temporal.timeline(id, { limit }).then(r => {
                if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
                console.log(`\nHealth timeline for ${id}  ${r.entity_name || ''}  (${r.total} snapshots)\n`);
                for (const h of r.history) {
                    const score = h.health_score != null ? `score=${h.health_score}` : '';
                    console.log(`  ${h.recorded_at}  ${h.health_label.padEnd(10)} ${score}`);
                }
                console.log('');
            });
        } else if (sub === 'trend') {
            const id = args[1];
            if (!id) { console.error('Usage: registry temporal trend ENT-NNNNNN'); process.exit(1); }
            temporal.trend(id).then(r => {
                if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
                console.log(`\nTrend for ${id}:  ${r.trend}  (slope=${r.slope}, ${r.snapshots} snapshots)\n`);
                if (r.score_range) {
                    console.log(`  Score range: ${r.score_range.min} – ${r.score_range.max}  latest: ${r.score_range.latest}`);
                }
                console.log('');
            });
        } else {
            console.log('Usage:\n  registry temporal diff [days]          — health label changes\n  registry temporal timeline ENT-NNNNNN  — full history\n  registry temporal trend ENT-NNNNNN     — rising/falling/stable\n');
        }
        break;
    }

    case 'simulate': {
        const sub = args[0];
        if (sub === 'migration') {
            const filename = args[1];
            if (!filename) { console.error('Usage: registry simulate migration <filename.sql>'); process.exit(1); }
            console.log(`\nSimulating migration: ${filename}\n`);
            const r = prediction.simulateMigration(filename);
            console.log(`  Governed:     ${r.governed}`);
            console.log(`  Preflight:    ${r.preflight_ok ? '✓ pass' : '✗ fail'}`);
            console.log(`  Overall Risk: ${r.overall_risk}`);
            console.log(`  Status:       ${r.header?.status || '—'}`);
            if (r.warnings.length) {
                console.log('\n  Warnings:');
                for (const w of r.warnings) console.log(`    !  ${w}`);
            }
            if (r.entity_simulations?.length) {
                console.log('\n  Entity Impact:');
                for (const e of r.entity_simulations) {
                    if (e.error) { console.log(`    ? ${e.id}  ${e.error}`); continue; }
                    const blast = e.blast_radius ? `blast=${e.blast_radius.total}` : '';
                    console.log(`    ${e.id}  ${(e.name || '').slice(0, 35).padEnd(36)} [${e.risk}]  health=${e.health?.score}  ${blast}`);
                }
            }
            console.log(`\n  (${r.duration_ms}ms)\n`);
            if (!r.ok) process.exit(1);
        } else if (sub === 'entity') {
            const id = args[1];
            if (!id) { console.error('Usage: registry simulate entity ENT-NNNNNN [--status VALUE] [--family VALUE]'); process.exit(1); }
            const changes = {};
            for (let i = 2; i < args.length; i += 2) {
                if (args[i] && args[i].startsWith('--')) changes[args[i].slice(2)] = args[i + 1];
            }
            if (!Object.keys(changes).length) { console.error('Specify at least one proposed change, e.g. --status DEPRECATED'); process.exit(1); }
            console.log(`\nSimulating entity change: ${id}  ${JSON.stringify(changes)}\n`);
            const r = prediction.simulateEntityChange(id, changes);
            if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
            console.log(`  Entity:  ${r.entity_id}  ${r.entity_name}`);
            console.log(`  Health:  ${r.health.current.score} (${r.health.current.label})  →  ${r.health.proposed.score} (${r.health.proposed.label})  Δ${r.health.delta > 0 ? '+' : ''}${r.health.delta}`);
            console.log(`  Risk:    ${r.current_risk}`);
            console.log(`  Blast:   ${r.blast_radius.total} total (${r.blast_radius.direct} direct)`);
            if (r.projection_changes.length) {
                console.log('\n  Projection Changes:');
                for (const p of r.projection_changes) console.log(`    ${p.projection.padEnd(14)} ${p.from}  →  ${p.to}`);
            }
            if (r.at_risk_dependents.length) {
                console.log('\n  At-Risk Dependents:');
                for (const d of r.at_risk_dependents.slice(0, 10)) console.log(`    ${d.id}  ${(d.name || '').slice(0, 35)}  [${d.rel_type}]`);
                if (r.at_risk_dependents.length > 10) console.log(`    … and ${r.at_risk_dependents.length - 10} more`);
            }
            if (r.new_constraint_violations.length) {
                console.log('\n  New Constraint Violations:');
                for (const v of r.new_constraint_violations) console.log(`    ✗  [${v.severity}]  ${v.rule}  ${v.detail}`);
            }
            console.log(`\n  (${r.duration_ms}ms)\n`);
        } else {
            console.log('Usage:\n  registry simulate entity ENT-NNNNNN [--status VALUE] [--family VALUE]\n  registry simulate migration <filename.sql>\n');
        }
        break;
    }

    case 'constraints': {
        const full    = args.includes('--full');
        const verbose = args.includes('--verbose') || args.includes('-v');
        console.log(`\nEvaluating architectural constraints${full ? ' (full — includes computed rules)' : ''}…\n`);
        const result = constraints.check({ full });

        const SICON = { CRITICAL: '◈◈', ERROR: '✗', WARN: '!', PASS: '✓' };
        for (const r of result.results) {
            if (r.status === 'PASS') {
                console.log(`  ${SICON.PASS}  ${r.rule}${r.owner ? '  [' + r.owner + ']' : ''}`);
            } else {
                const icon     = SICON[r.severity] || '?';
                const blocking = r.blocking ? '  ⊘ BLOCKING' : '';
                const archRef  = r.arch_ref ? `  [${r.arch_ref}]` : '';
                console.log(`  ${icon}  ${r.rule}  [${r.severity}]${blocking}${archRef}  — ${r.violations.length} violation(s)`);
                if (r.owner) console.log(`       Owner: ${r.owner}`);
                for (const v of r.violations.slice(0, 10)) {
                    console.log(`       ${v.id || ''}  ${v.detail || ''}`);
                }
                if (r.violations.length > 10) console.log(`       … and ${r.violations.length - 10} more`);
                if (verbose && r.remediation) {
                    console.log(`\n       Remediation:`);
                    for (const line of r.remediation.split('. ').filter(Boolean)) {
                        console.log(`         ${line.trim()}.`);
                    }
                    console.log('');
                }
            }
        }

        const s = result.summary;
        console.log(`\nResult: ${s.pass} pass  ${s.fail} fail  (${s.errors} error(s)  ${s.warnings} warning(s)  ${s.blocking} blocking)  in ${result.duration_ms}ms`);
        if (s.blocking) console.log(`  ⊘  ${s.blocking} blocking constraint(s) — resolve before deploying.`);
        if (!full) console.log('  Run with --full to include computed projection/impact rules.');
        if (!verbose && result.results.some(r => r.status !== 'PASS')) console.log('  Run with --verbose to see remediation steps.');
        console.log('');
        if (!result.ok) process.exit(1);
        break;
    }

    case 'query': {
        const intent = args[0];
        if (!intent || intent === 'capabilities') {
            const caps = qry.capabilities();
            console.log(`\nRegistered intents (${caps.length}):\n`);
            for (const c of caps) {
                console.log(`  ${c.intent.padEnd(32)} ${c.description}`);
                const ps = Object.entries(c.params || {});
                if (ps.length) {
                    for (const [k, v] of ps) console.log(`    ${('--' + k).padEnd(20)} ${v}`);
                }
            }
            console.log('');
            break;
        }
        // Parse --key value pairs from remaining args
        const params = {};
        for (let i = 1; i < args.length; i += 2) {
            if (args[i] && args[i].startsWith('--')) {
                params[args[i].slice(2)] = args[i + 1];
            }
        }
        const resp = qry.query(intent, params);
        if (!resp.ok) {
            console.error(`\nError: ${resp.error}`);
            if (resp.hint) console.error(`Hint:  ${resp.hint}`);
            process.exit(1);
        }
        console.log(JSON.stringify(resp.result, null, 2));
        console.log(`\n(${resp.duration_ms}ms)`);
        break;
    }

    case 'snapshot': {
        const sub = args[0];
        if (!sub || sub === 'list') {
            const limit = args[1] || '20';
            snap.listSnapshots({ limit }).then(r => {
                if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
                console.log(`\nArchitecture Snapshots  (${r.count} of ${limit})\n${'─'.repeat(55)}`);
                for (const s of r.snapshots) {
                    const label = s.label ? `  "${s.label}"` : '';
                    const caps  = s.snapshot_data?.capability_summary
                        ? `  [${s.snapshot_data.capability_summary.operational || 0}✓ ${s.snapshot_data.capability_summary.degraded || 0}! ${s.snapshot_data.capability_summary.down || 0}✗]`
                        : '';
                    console.log(`  #${String(s.id).padEnd(6)} ${s.created_at}  entities=${s.entity_count}  rels=${s.relationship_count}${caps}${label}`);
                }
                console.log('');
            });
        } else if (sub === 'take') {
            const label = args.slice(1).join(' ') || null;
            console.log('\nTaking architecture snapshot…');
            snap.takeSnapshot({ label }).then(r => {
                if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
                console.log(`  ID:         #${r.id}`);
                console.log(`  Created:    ${r.created_at}`);
                if (r.label) console.log(`  Label:      ${r.label}`);
                console.log(`  Entities:   ${r.summary.entity_count}`);
                console.log(`  Relations:  ${r.summary.relationship_count}`);
                const cs = r.summary.capability_summary;
                if (cs) console.log(`  Capability: ${cs.operational || 0} operational  ${cs.degraded || 0} degraded  ${cs.down || 0} down`);
                console.log(`  (${r.duration_ms}ms)\n`);
            });
        } else if (sub === 'get') {
            const id = args[1];
            if (!id) { console.error('Usage: registry snapshot get <id>'); process.exit(1); }
            snap.getSnapshot(id).then(r => {
                if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
                console.log(JSON.stringify(r.snapshot, null, 2));
            });
        } else if (sub === 'diff') {
            const id1 = args[1];
            const id2 = args[2];
            if (!id1 || !id2) { console.error('Usage: registry snapshot diff <id1> <id2>'); process.exit(1); }
            snap.diffSnapshots(id1, id2).then(r => {
                if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }
                console.log(`\nSnapshot Diff  #${r.from.id} → #${r.to.id}`);
                console.log(`${'─'.repeat(55)}`);
                console.log(`  From: ${r.from.created_at}${r.from.label ? ' "' + r.from.label + '"' : ''}`);
                console.log(`  To:   ${r.to.created_at}${r.to.label ? ' "' + r.to.label + '"' : ''}`);
                console.log(`\nDeltas:`);
                const ed = r.deltas.entities;
                const rd = r.deltas.relationships;
                console.log(`  Entities:      ${ed.before} → ${ed.after}  (${ed.delta >= 0 ? '+' : ''}${ed.delta})`);
                console.log(`  Relationships: ${rd.before} → ${rd.after}  (${rd.delta >= 0 ? '+' : ''}${rd.delta})`);
                if (r.capability_changes.length) {
                    console.log(`\nCapability Changes (${r.capability_changes.length}):`);
                    for (const c of r.capability_changes) {
                        console.log(`  ${c.name.padEnd(28)} ${c.change}: ${c.before || '—'} → ${c.after || '—'}`);
                    }
                }
                if (r.health_changes.length) {
                    console.log(`\nHealth Distribution Changes:`);
                    for (const h of r.health_changes) {
                        const d = h.delta >= 0 ? `+${h.delta}` : String(h.delta);
                        console.log(`  ${h.status.padEnd(12)} ${h.before} → ${h.after}  (${d})`);
                    }
                }
                if (r.risk_changes.newly_high_risk.length) {
                    console.log(`\nNewly High-Risk (${r.risk_changes.newly_high_risk.length}):`);
                    for (const e of r.risk_changes.newly_high_risk) {
                        console.log(`  ◈  ${e.id}  ${(e.name || '').slice(0, 35)}  [${e.risk_level}]`);
                    }
                }
                if (r.risk_changes.resolved.length) {
                    console.log(`\nResolved Risk (${r.risk_changes.resolved.length}):`);
                    for (const e of r.risk_changes.resolved) {
                        console.log(`  ✓  ${e.id}  ${(e.name || '').slice(0, 35)}  [was ${e.risk_level}]`);
                    }
                }
                if (!r.has_changes) console.log('\n  No architectural changes detected between these snapshots.');
                console.log(`\n  (${r.duration_ms}ms)\n`);
            });
        } else {
            console.log('Usage:\n  registry snapshot take [label]         — capture snapshot\n  registry snapshot list [limit]          — list recent snapshots\n  registry snapshot get <id>              — full snapshot JSON\n  registry snapshot diff <id1> <id2>     — architectural diff\n');
        }
        break;
    }

    case 'scenario': {
        // registry scenario --entity ENT-000001 --status DEPRECATED --entity ENT-000002 --status INACTIVE --name "decommission batch"
        const name    = (() => { const i = args.indexOf('--name'); return i >= 0 ? args[i + 1] : null; })();
        const changes = [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--entity' && args[i + 1]) {
                const entityId = args[i + 1];
                const proposed = {};
                let j = i + 2;
                while (j < args.length && args[j] !== '--entity' && args[j] !== '--name') {
                    if (args[j].startsWith('--')) { proposed[args[j].slice(2)] = args[j + 1]; j += 2; }
                    else break;
                }
                changes.push({ entity_id: entityId, proposed });
            }
        }
        if (!changes.length) {
            console.log('Usage:\n  registry scenario --entity ENT-NNNNNN [--status VALUE] [--entity ENT-NNNNNN --status VALUE] [--name "label"]\n');
            break;
        }

        console.log(`\nRunning scenario${name ? ' "' + name + '"' : ''}: ${changes.length} entity change(s)…\n`);
        const r = scenario.runScenario({ name, changes });

        if (!r.ok) { console.error(`  Error: ${r.error}`); process.exit(1); }

        const ex = r.executive;
        const SEV_ICON = { CRITICAL: '◈◈', HIGH: '◈', MEDIUM: '!', LOW: '·', MINIMAL: '·' };
        const URGENCY_ICON = { HALT: '⊘', REVIEW_REQUIRED: '!', PROCEED_WITH_CAUTION: '~', PROCEED: '✓' };

        console.log(`Executive Summary\n${'─'.repeat(55)}`);
        console.log(`  Risk:          ${ex.risk}`);
        console.log(`  Urgency:       ${URGENCY_ICON[ex.urgency] || '?'}  ${ex.urgency}`);
        console.log(`  Confidence:    ${(ex.confidence * 100).toFixed(0)}%`);

        if (ex.capability_impacts.length) {
            console.log(`\nCapability Impact:`);
            for (const c of ex.capability_impacts) {
                const icon = SEV_ICON[c.severity] || '?';
                console.log(`  ${icon}  ${c.capability.padEnd(30)} [${c.criticality}]  →  ${c.severity}`);
            }
        }

        console.log(`\nRuntime:         ${ex.runtime_unavailable} service(s) unavailable`);
        console.log(`Documentation:   ${ex.documentation_drift} drift`);
        console.log(`Constraints:     ${ex.constraints_violated} violated`);
        if (ex.migrations_at_risk.length) {
            console.log(`Migrations:      ${ex.migrations_at_risk.join(', ')}`);
        }

        console.log(`\nRationale: ${ex.rationale}`);

        if (r.entity_impacts.length) {
            console.log(`\nEntity Details (${r.entity_impacts.length}):`);
            for (const e of r.entity_impacts) {
                if (!e.ok) { console.log(`  ?  ${e.entity_id}  error: ${e.error}`); continue; }
                const hd = e.health_delta != null ? `  Δhealth=${e.health_delta > 0 ? '+' : ''}${e.health_delta}` : '';
                console.log(`  ${e.entity_id}  ${(e.name || '').slice(0, 35).padEnd(36)} at_risk=${e.at_risk_count}${hd}`);
            }
        }

        if (r.constraint_check.failures.length) {
            console.log(`\nConstraint Failures:`);
            for (const f of r.constraint_check.failures) {
                const blocking = f.blocking ? '  ⊘ BLOCKING' : '';
                console.log(`  ✗  ${f.rule}  [${f.severity}]${blocking}`);
            }
        }

        console.log(`\n(${r.duration_ms}ms)\n`);
        break;
    }

    default:
        console.log(`
APEX Registry CLI  (${eng.count()} entities loaded)

Commands:
  entity <ENT-NNNNNN>                  Full record + relationships
  search <query>                        Full-text search
  owner <OWNER>                         Entities by owner
  list [--type|--family|--block|--status <value>]  Filter entities
  validate                              Integrity check
  graph <ENT-NNNNNN> [depth]           Relationship graph traversal
  stats                                 Registry statistics
  projection check                      Physical projection drift report
  projection entity <ENT-NNNNNN>       All projections for one entity
  twin <ENT-NNNNNN>                    Digital Twin — live operational state
  discover [ENT-NNNNNN|merge]          Auto-discover relationships from code
  impact <ENT-NNNNNN> [--depth N] [--direction upstream|downstream|both]
  query capabilities                    List all registered intents
  query <intent> [--key value ...]     Execute a query intent
  constraints [--full]                  Architectural constraint check (--full for computed rules)
  simulate entity ENT-NNNNNN [--status VALUE]  Predict impact of entity field changes
  simulate migration <filename.sql>    Simulate migration: preflight + entity health predictions
  temporal diff [days]                  Health label changes in the last N days (default 7)
  temporal timeline ENT-NNNNNN [limit] Full health history for one entity
  temporal trend ENT-NNNNNN            Score trend: rising / falling / stable
  capability [status]                   System-wide capability health report
  capability list                       List all defined capabilities
  capability <id>                       Status and dependencies for one capability
  capability degradation ENT-NNNNNN    Which capabilities degrade if this entity fails?
  snapshot take [label]                 Capture full architecture snapshot to DB
  snapshot list [limit]                 List recent snapshots (newest first)
  snapshot get <id>                     Retrieve a snapshot by ID
  snapshot diff <id1> <id2>            Architectural diff between two snapshots
  scenario --entity ENT-NNNNNN [--status VALUE] [--entity ...]  Multi-entity what-if simulation
`);
}
