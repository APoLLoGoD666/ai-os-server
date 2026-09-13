#!/usr/bin/env node
'use strict';
// registry-cli.js — APEX Registry command-line interface
//
// Usage:  node scripts/registry-cli.js <command> [args] [--flags]
//         npm run registry -- <command> [args]
//
// --json   Output raw JSON instead of formatted text
// --help   Show command help

const { query, queryAsync, capabilities: listIntents } = require('../lib/registry/query');

// ── ANSI colour helpers ───────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY;
const C = isTTY ? {
    reset:  '\x1b[0m',  bold:  '\x1b[1m',   dim:   '\x1b[2m',
    red:    '\x1b[31m', green: '\x1b[32m',  yellow: '\x1b[33m',
    blue:   '\x1b[34m', cyan:  '\x1b[36m',  gray:   '\x1b[90m',
} : Object.fromEntries(['reset','bold','dim','red','green','yellow','blue','cyan','gray'].map(k => [k, '']));

const col = (s, c)   => `${c}${s}${C.reset}`;
const bold  = s      => col(s, C.bold);
const dim   = s      => col(s, C.dim);
const cyan  = s      => col(s, C.cyan);
const gray  = s      => col(s, C.gray);
const risk_color = r => ({ CRITICAL: C.red, HIGH: C.yellow, MEDIUM: C.yellow, LOW: C.green, UNKNOWN: C.dim }[r] || C.reset);
const status_color = s => ({ OPERATIONAL: C.green, DEGRADED: C.yellow, DOWN: C.red, PASS: C.green, FAIL: C.red, WARN: C.yellow, ERROR: C.red }[s] || C.reset);

// ── Arg parser ────────────────────────────────────────────────────────────────

// Flags that are always boolean — never consume the next token as a value.
const BOOL_FLAGS = new Set(['json', 'full', 'help', 'record']);

function parseArgs(argv) {
    const raw = argv.slice(2);
    const opts = { _: [] };
    for (let i = 0; i < raw.length; i++) {
        const a = raw[i];
        if (a === '--') { opts._.push(...raw.slice(i + 1)); break; }
        if (a.startsWith('--')) {
            const key  = a.slice(2);
            const next = raw[i + 1];
            if (!BOOL_FLAGS.has(key) && next && !next.startsWith('--')) { opts[key] = next; i++; }
            else                                                          { opts[key] = true; }
        } else {
            opts._.push(a);
        }
    }
    return opts;
}

// ── Output helpers ────────────────────────────────────────────────────────────

function out(r, opts) {
    if (opts.json) { console.log(JSON.stringify(r, null, 2)); return; }
    if (!r.ok) { console.error(col(`Error: ${r.error}`, C.red)); process.exitCode = 1; return; }
    fmt(r.result, r.intent, opts);
}

function fmt(result, intent, opts) {
    const cmd = intent.split('.')[0];
    if (intent === 'entity.lookup'   || intent === 'composite.entity_full') return fmtEntity(result, opts);
    if (intent === 'entity.find'     || intent === 'entity.search')          return fmtEntityList(result);
    if (intent === 'entity.stats')                                            return fmtStats(result);
    if (intent === 'impact.analyze')                                          return fmtImpact(result);
    if (intent === 'impact.quickrisk')                                        return fmtRisk(result);
    if (intent === 'capability.list' || intent === 'capability.status')       return fmtCapabilities(result);
    if (intent === 'capability.get')                                          return fmtCapabilityDetail(result);
    if (intent === 'capability.degradation')                                  return fmtDegradation(result);
    if (intent === 'validate.constraints')                                    return fmtConstraints(result);
    if (intent === 'relationship.graph')                                      return fmtRelGraph(result);
    if (intent === 'twin.state')                                              return fmtTwin(result);
    if (intent === 'migration.scan')                                          return fmtMigrations(result);
    if (intent === 'scenario.run')                                            return fmtScenario(result);
    if (intent === 'composite.system_health')                                 return fmtSystemHealth(result);
    if (intent === 'composite.capability_health')                             return fmtCapabilities(result.report || result);
    // Fallback: compact JSON
    console.log(JSON.stringify(result, null, 2));
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtEntity(e) {
    if (!e) { console.error(col('Entity not found.', C.red)); process.exitCode = 1; return; }
    const entity = e.entity || e;
    console.log(`\n${bold(cyan(entity.id))}  ${bold(entity.name)}`);
    const rows = [
        ['Family',      entity.family      || '—'],
        ['Type',        entity.type        || '—'],
        ['Status',      entity.status      || '—'],
        ['Criticality', entity.criticality || '—'],
        ['Lifecycle',   entity.lifecycle   || '—'],
        ['Owner',       entity.owner       || '—'],
        ['Block',       entity.block       || '—'],
        ['Path',        entity.path        || '—'],
    ];
    for (const [k, v] of rows) console.log(`  ${gray(k.padEnd(14))} ${v}`);
    if (entity.description) console.log(`\n  ${dim(entity.description)}`);
    if (e.impact) {
        const b = e.impact.blast_radius;
        console.log(`\n  ${bold('Impact')}  risk=${col(e.impact.risk_level, risk_color(e.impact.risk_level))}  direct=${b.direct}  transitive=${b.transitive}`);
    }
    console.log('');
}

function fmtEntityList(result) {
    const list = Array.isArray(result) ? result : (result.results || result.entities || []);
    if (!list.length) { console.log(dim('  No results.')); return; }
    console.log('');
    for (const e of list) {
        console.log(`  ${cyan(e.id)}  ${e.name.padEnd(45)}  ${gray(e.family || '')}/${gray(e.type || '')}  ${e.status || ''}`);
    }
    console.log(dim(`\n  ${list.length} result(s)`));
}

function fmtStats(r) {
    console.log(`\n  Total: ${bold(r.total)}  |  Families: ${Object.keys(r.by_family || {}).length}  |  Types: ${Object.keys(r.by_type || {}).length}\n`);
}

function fmtImpact(r) {
    if (!r) { console.error(col('Entity not found.', C.red)); process.exitCode = 1; return; }
    const b = r.blast_radius;
    const rc = risk_color(r.risk_level);
    console.log(`\n${bold('Impact Analysis:')} ${cyan(r.root)}  ${dim(r.root_name || '')}`);
    console.log(`  Risk:     ${col(bold(r.risk_level), rc)}    Confidence: ${r.impact_confidence}`);
    console.log(`  Radius:   ${bold(b.direct)} direct   ${bold(b.transitive)} transitive   ${bold(b.total)} total`);
    if (r.affected.direct.length) {
        console.log(`\n  ${bold('Direct dependents')} (${r.affected.direct.length}):`);
        for (const d of r.affected.direct.slice(0, 15)) {
            console.log(`    ${cyan(d.id)}  ${(d.name || '').padEnd(40)}  ${gray(d.rel_type || '')}`);
        }
        if (r.affected.direct.length > 15) console.log(dim(`    … and ${r.affected.direct.length - 15} more`));
    }
    if (r.capabilities?.affected_count > 0) {
        console.log(`\n  ${bold('Capabilities affected')} (${r.capabilities.affected_count}):`);
        for (const c of r.capabilities.affected) {
            console.log(`    ${c.name.padEnd(35)}  ${col(c.severity, risk_color(c.severity))}  ${gray(c.strength)}`);
        }
    }
    if (r.affected.migrations?.length) {
        console.log(`\n  ${bold('Migrations at risk:')} ${r.affected.migrations.map(m => m.filename).join(', ')}`);
    }
    console.log('');
}

function fmtRisk(r) {
    const rc = risk_color(r.risk_level);
    console.log(`\n  ${cyan(r.id)}  risk = ${col(bold(r.risk_level), rc)}\n`);
}

function fmtCapabilities(r) {
    const caps = Array.isArray(r) ? r : (r.capabilities || []);
    const summary = r.summary || {};
    console.log(`\n  ${bold('Capability Health')}  ${dim(`${summary.total || caps.length} total`)}`);
    if (summary.total) {
        console.log(`  ${col(summary.operational + ' operational', C.green)}  ${col(summary.degraded + ' degraded', C.yellow)}  ${col(summary.down + ' down', C.red)}\n`);
    }
    const NAME_W = 32;
    console.log(`  ${'NAME'.padEnd(NAME_W)}  ${'STATUS'.padEnd(14)}  CRITICALITY   ISSUES`);
    console.log(`  ${'─'.repeat(NAME_W)}  ${'─'.repeat(14)}  ${'─'.repeat(12)}  ${'─'.repeat(6)}`);
    for (const c of caps) {
        const sc = status_color(c.status);
        console.log(`  ${(c.name || c.id).padEnd(NAME_W)}  ${col((c.status || '').padEnd(14), sc)}  ${(c.criticality || '').padEnd(12)}  ${c.issues?.length ?? 0}`);
    }
    console.log('');
}

function fmtCapabilityDetail(r) {
    if (!r) { console.error(col('Capability not found.', C.red)); process.exitCode = 1; return; }
    const cap = r.status || r;
    console.log(`\n${bold(cap.name || cap.id)}  ${col(cap.status, status_color(cap.status))}`);
    console.log(`  Criticality: ${cap.criticality}   Confidence: ${cap.confidence}   Entities: ${cap.entity_count}`);
    if (cap.issues?.length) {
        console.log(`\n  ${bold('Issues')} (${cap.issues.length}):`);
        for (const i of cap.issues) {
            console.log(`    ${cyan(i.id)}  ${(i.name || '').padEnd(35)}  ${gray(i.health)}  ${gray(i.strength)}`);
        }
    }
    console.log('');
}

function fmtDegradation(r) {
    console.log(`\n  ${bold('Capability degradation from')} ${cyan(r.entity_id)}`);
    if (!r.affected_count) { console.log(dim('  No capabilities affected.')); console.log(''); return; }
    console.log(`  Worst severity: ${col(r.worst_severity, risk_color(r.worst_severity))}\n`);
    for (const c of r.affected) {
        console.log(`  ${col(c.severity.padEnd(10), risk_color(c.severity))} ${c.name.padEnd(35)} ${gray(c.strength)}`);
    }
    console.log('');
}

function fmtConstraints(r) {
    const { summary, results } = r;
    const ok = summary.fail === 0;
    console.log(`\n  ${bold('Constraints')}  ${r.full ? 'full' : 'static only'}`);
    console.log(`  ${col(summary.pass + ' pass', C.green)}  ${col(summary.fail + ' fail', summary.fail ? C.red : C.green)}  ${summary.errors ? col(summary.errors + ' errors', C.red) : ''}\n`);
    for (const res of results) {
        const sc = status_color(res.status);
        const mark = res.status === 'PASS' ? col('✓', C.green) : col('✗', C.red);
        console.log(`  ${mark} ${col(res.rule, res.status === 'PASS' ? C.dim : C.reset)}`);
        if (res.violations?.length) {
            for (const v of res.violations.slice(0, 3)) {
                console.log(`      ${gray(v.id || '')}  ${dim(v.detail || '')}`);
            }
            if (res.violations.length > 3) console.log(gray(`      … ${res.violations.length - 3} more violations`));
        }
    }
    console.log('');
}

function fmtRelGraph(r) {
    console.log(`\n  ${bold('Relationships:')} ${cyan(r.id || '')}  depth=${r.depth}`);
    console.log(`  Nodes: ${r.node_count}   Edges: ${r.edge_count}\n`);
    for (const e of (r.edges || []).slice(0, 30)) {
        console.log(`  ${cyan(e.from)}  ${gray('─' + e.type + '→')}  ${cyan(e.to)}  ${dim(e.label || '')}`);
    }
    if ((r.edges || []).length > 30) console.log(dim(`  … and ${r.edges.length - 30} more edges`));
    console.log('');
}

function fmtTwin(r) {
    const s = r.state || r;
    console.log(`\n  ${bold('Twin:')} ${cyan(s.id || s.entity_id || '')}  health=${bold(s.health_label || '?')}  score=${s.health_score ?? '?'}`);
    if (s.projection_planes?.length) {
        console.log(`\n  ${bold('Projection planes:')}`);
        for (const p of s.projection_planes) {
            const sc = status_color(p.status);
            console.log(`    ${col(p.status.padEnd(8), sc)}  ${p.projection}`);
        }
    }
    console.log('');
}

function fmtMigrations(r) {
    const migs = r.migrations || [];
    console.log(`\n  ${bold('Migrations')}  (${migs.length} governed)\n`);
    for (const m of migs.filter(m => m.governed)) {
        const sc = { APPROVED: C.green, VERIFIED: C.green, EXECUTED: C.green, PENDING: C.yellow }[m.status] || C.dim;
        console.log(`  ${col((m.status || '').padEnd(12), sc)}  ${m.filename}`);
    }
    console.log('');
}

function fmtScenario(r) {
    const ex = r.executive;
    const rc = risk_color(ex.urgency);
    console.log(`\n  ${bold('Scenario')} — ${r.scenario.name}`);
    console.log(`  ${bold('Urgency:')} ${col(bold(ex.urgency), rc)}   Risk: ${col(ex.risk, rc)}   Confidence: ${ex.confidence?.toFixed(2) || '?'}`);
    console.log(`\n  ${bold('Rationale:')} ${dim(ex.rationale || '—')}`);
    if (ex.capability_impacts?.length) {
        console.log(`\n  ${bold('Capability impacts:')}`);
        for (const c of ex.capability_impacts) {
            console.log(`    ${col(c.severity.padEnd(10), risk_color(c.severity))}  ${c.capability}`);
        }
    }
    if (r.constraint_check?.failures?.length) {
        console.log(`\n  ${bold('Constraint failures:')} ${r.constraint_check.failures.map(f => f.rule).join(', ')}`);
    }
    if (ex.migrations_at_risk?.length) {
        console.log(`\n  ${bold('Migrations at risk:')} ${ex.migrations_at_risk.join(', ')}`);
    }
    if (r._inference) console.log(`\n  ${dim('⚠ INFERENCE — probabilistic, do not drive policy from this result')}`);
    console.log('');
}

function fmtSystemHealth(r) {
    const h = r.health || r;
    console.log(`\n  ${bold('System Health')}`);
    if (h.overall_status) console.log(`  Status: ${col(bold(h.overall_status), status_color(h.overall_status))}`);
    if (h.entity_count)   console.log(`  Entities: ${h.entity_count}   Active: ${h.active_count || '?'}`);
    if (h.capabilities)   fmtCapabilities(h.capabilities);
    console.log('');
}

// ── Commands ──────────────────────────────────────────────────────────────────

const COMMANDS = {
    lookup:      (args, opts) => out(query('entity.lookup',    { id: args[0] }), opts),
    find:        (_,    opts) => out(query('entity.find',      { family: opts.family, type: opts.type, status: opts.status, block: opts.block }), opts),
    search:      (args, opts) => out(query('entity.search',    { q: args[0], limit: opts.limit || 20 }), opts),
    stats:       (_,    opts) => out(query('entity.stats',     {}), opts),
    impact:      (args, opts) => out(query('impact.analyze',   { id: args[0], depth: opts.depth || 3, direction: opts.direction || 'upstream' }), opts),
    risk:        (args, opts) => out(query('impact.quickrisk', { id: args[0] }), opts),
    relationships:(args, opts) => out(query('relationship.graph', { id: args[0], depth: opts.depth || 2 }), opts),
    discover:    (args, opts) => out(query('relationship.discover', { id: args[0], passes: opts.passes }), opts),
    capabilities:(_,    opts) => out(query('capability.status', {}), opts),
    capability:  (args, opts) => out(query('capability.get',   { id: args[0] }), opts),
    degradation: (args, opts) => out(query('capability.degradation', { id: args[0] }), opts),
    constraints: (_,    opts) => out(query('validate.constraints', { full: !!opts.full }), opts),
    twin:        (args, opts) => out(query('twin.state',       { id: args[0] }), opts),
    migrations:  (_,    opts) => out(query('migration.scan',   {}), opts),
    preflight:   (args, opts) => out(query('migration.preflight', { filename: args[0] }), opts),
    intents:     (_,    opts) => {
        if (opts.json) { console.log(JSON.stringify(listIntents(), null, 2)); return; }
        console.log('');
        for (const { intent, description } of listIntents()) {
            console.log(`  ${cyan(intent.padEnd(35))}  ${dim(description || '')}`);
        }
        console.log('');
    },
    full:        (args, opts) => out(query('composite.entity_full', { id: args[0], impact_depth: opts.depth || 3 }), opts),
    health:      (_,    opts) => out(query('composite.system_health', {}), opts),

    simulate: (args, opts) => {
        const sub = args[0];
        if (sub === 'entity') {
            const proposed = {};
            if (opts.status)  proposed.status  = opts.status;
            if (opts.family)  proposed.family  = opts.family;
            if (opts.type)    proposed.type    = opts.type;
            return out(query('simulate.entity_change', { id: args[1], ...proposed }), opts);
        }
        if (sub === 'migration') return out(query('simulate.migration', { filename: args[1] }), opts);
        console.error(`Unknown simulate subcommand: ${sub}. Use: simulate entity <id> | simulate migration <file>`);
        process.exitCode = 1;
    },

    snapshot: async (args, opts) => {
        const sub = args[0];
        if (sub === 'take') return out(await queryAsync('snapshot.take', { label: opts.label || args[1] }), opts);
        if (sub === 'list') return out(await queryAsync('snapshot.list', { limit: opts.limit || 10 }), opts);
        if (sub === 'get')  return out(await queryAsync('snapshot.get',  { id: args[1] }), opts);
        if (sub === 'diff') return out(await queryAsync('snapshot.diff', { id1: args[1], id2: args[2] }), opts);
        console.error(`Unknown snapshot subcommand: ${sub}. Use: snapshot take|list|get|diff`);
        process.exitCode = 1;
    },

    scenario: (args, opts) => {
        let changes;
        try {
            changes = JSON.parse(opts.changes || '[]');
        } catch (_) {
            console.error(col('--changes must be valid JSON, e.g. \'[{"entity_id":"ENT-000388","proposed":{"status":"INACTIVE"}}]\'', C.red));
            process.exitCode = 1; return;
        }
        out(query('scenario.run', { name: opts.name, changes, record_decision: !!opts.record }), opts);
    },
};

// ── Help ──────────────────────────────────────────────────────────────────────

const USAGE = `
${bold('APEX Registry CLI')}

  ${cyan('node scripts/registry-cli.js')} <command> [args] [options]

${bold('Entity')}
  lookup <id>                       Look up entity by ID
  find [--family F] [--type T]      Filter entities
  search <query> [--limit N]        Full-text search
  stats                             Registry statistics
  full <id> [--depth N]             Full entity profile with impact

${bold('Impact & Risk')}
  impact <id> [--depth N] [--direction upstream|downstream|both]
  risk <id>                         Quick risk level check
  relationships <id> [--depth N]    Relationship graph
  discover [<id>] [--passes js,sql,migration-header]

${bold('Capabilities')}
  capabilities                      Full capability health report
  capability <key>                  Single capability status
  degradation <id>                  Capabilities degraded if entity fails

${bold('Validation')}
  constraints [--full]              Constraint checks (add --full for computed)
  health                            System health overview

${bold('Simulation')}
  simulate entity <id> [--status S] [--family F] [--type T]
  simulate migration <filename>
  scenario --changes <json>         Multi-entity what-if
             [--name label] [--record]

${bold('Data')}
  twin <id>                         Digital twin state
  migrations                        Governed migration list
  preflight <filename>              Migration preflight check
  snapshot take [--label L]         Take architecture snapshot
  snapshot list [--limit N]
  snapshot get <id>
  snapshot diff <id1> <id2>

${bold('Meta')}
  intents                           List all query intents

${bold('Options')}
  --json                            Machine-readable JSON output
  --help                            Show this help
`;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const opts = parseArgs(process.argv);
    const cmd  = opts._[0];
    const args = opts._.slice(1);

    if (!cmd || opts.help || cmd === 'help') { console.log(USAGE); return; }

    const handler = COMMANDS[cmd];
    if (!handler) {
        console.error(col(`Unknown command: ${cmd}`, C.red));
        console.error(`Run ${cyan('node scripts/registry-cli.js --help')} to see available commands.`);
        process.exitCode = 1;
        return;
    }

    await handler(args, opts);
}

main().catch(e => {
    console.error(col(`Fatal: ${e.message}`, C.red));
    process.exitCode = 1;
});
