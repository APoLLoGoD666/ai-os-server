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

    case 'constraints': {
        const full = args.includes('--full');
        console.log(`\nEvaluating architectural constraints${full ? ' (full — includes computed rules)' : ''}…\n`);
        const result = constraints.check({ full });

        const SICON = { CRITICAL: '◈◈', ERROR: '✗', WARN: '!', PASS: '✓' };
        for (const r of result.results) {
            if (r.status === 'PASS') {
                console.log(`  ${SICON.PASS}  ${r.rule}`);
            } else {
                const icon = SICON[r.severity] || '?';
                console.log(`  ${icon}  ${r.rule}  [${r.severity}]  — ${r.violations.length} violation(s)`);
                for (const v of r.violations.slice(0, 10)) {
                    console.log(`       ${v.id || ''}  ${v.detail || ''}`);
                }
                if (r.violations.length > 10) console.log(`       … and ${r.violations.length - 10} more`);
            }
        }

        const s = result.summary;
        console.log(`\nResult: ${s.pass} pass  ${s.fail} fail  (${s.errors} error(s)  ${s.warnings} warning(s))  in ${result.duration_ms}ms`);
        if (!full) console.log('  Run with --full to include computed projection/impact rules.\n');
        else console.log('');
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
`);
}
