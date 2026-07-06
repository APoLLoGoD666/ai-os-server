'use strict';
// lib/registry/constraints.js — Architectural Constraint Enforcement
//
// Evaluates declarative constraint rules against the Registry.
//   Static rules:   cheap — no projection or impact analysis required.
//   Computed rules: expensive — run projections and/or impact analysis per entity.
//
// Usage:
//   const { check } = require('./lib/registry/constraints');
//   check()               — static rules only (fast)
//   check({ full: true }) — static + computed rules (may take several seconds)

const RULES = require('./constraint-rules.json');

// ── Result builders ───────────────────────────────────────────────────────────

function _pass(rule) {
    return { rule, status: 'PASS', violations: [] };
}

function _fail(rule, severity, violations) {
    return { rule, status: 'FAIL', severity, violations };
}

// ── Static evaluators ─────────────────────────────────────────────────────────

function constitutional_gate_healthy() {
    const engine = require('./engine');
    const gate   = engine.lookup('ENT-000388');
    if (!gate) {
        return _fail('CONSTITUTIONAL_GATE_HEALTHY', 'CRITICAL', [
            { id: 'ENT-000388', detail: 'Entity not registered in the Registry' },
        ]);
    }
    if (gate.status !== 'ACTIVE') {
        return _fail('CONSTITUTIONAL_GATE_HEALTHY', 'CRITICAL', [
            { id: 'ENT-000388', name: gate.name, detail: `status is "${gate.status}", expected ACTIVE` },
        ]);
    }
    return _pass('CONSTITUTIONAL_GATE_HEALTHY');
}

function no_orphaned_relationships() {
    const engine     = require('./engine');
    const rels       = require('./relationships');
    const violations = [];
    for (const r of rels.all()) {
        if (!engine.lookup(r.from)) {
            violations.push({ id: r.from, detail: `Source of [${r.type}] edge to ${r.to} is not registered` });
        }
        if (!engine.lookup(r.to)) {
            violations.push({ id: r.to, detail: `Target of [${r.type}] edge from ${r.from} is not registered` });
        }
    }
    return violations.length
        ? _fail('NO_ORPHANED_RELATIONSHIPS', 'ERROR', violations)
        : _pass('NO_ORPHANED_RELATIONSHIPS');
}

function governed_migration_approved() {
    const ml       = require('./migration-lifecycle');
    const TERMINAL = new Set(['APPROVED', 'EXECUTING', 'EXECUTED', 'VERIFIED']);
    const violations = ml.scanMigrations()
        .filter(m => m.governed && !TERMINAL.has(m.status))
        .map(m => ({ id: m.filename, detail: `Governed migration stuck at status "${m.status || '(none)'}"` }));
    return violations.length
        ? _fail('GOVERNED_MIGRATION_APPROVED', 'WARN', violations)
        : _pass('GOVERNED_MIGRATION_APPROVED');
}

// ── Computed evaluators ───────────────────────────────────────────────────────

function active_service_monitored() {
    const engine       = require('./engine');
    const proj         = require('./projections');
    const TARGET_TYPES = new Set(['SERVICE', 'MIDDLEWARE', 'API']);
    const violations   = [];
    for (const e of engine.all()) {
        if (e.status !== 'ACTIVE' || !TARGET_TYPES.has(e.type)) continue;
        const p = proj.checkProjection(e, 'monitoring');
        if (p.status === 'DRIFT') {
            violations.push({ id: e.id, name: e.name, type: e.type, detail: p.detail || 'monitoring projection DRIFT' });
        }
    }
    return violations.length
        ? _fail('ACTIVE_SERVICE_MONITORED', 'ERROR', violations)
        : _pass('ACTIVE_SERVICE_MONITORED');
}

function gov_entity_documented() {
    const engine     = require('./engine');
    const proj       = require('./projections');
    const violations = [];
    for (const e of engine.all()) {
        if (e.family !== 'GOV') continue;
        const p = proj.checkProjection(e, 'documentation');
        if (p.status === 'DRIFT') {
            violations.push({ id: e.id, name: e.name, detail: p.detail || 'documentation projection DRIFT' });
        }
    }
    return violations.length
        ? _fail('GOV_ENTITY_DOCUMENTED', 'WARN', violations)
        : _pass('GOV_ENTITY_DOCUMENTED');
}

function active_file_in_repo() {
    const engine       = require('./engine');
    const proj         = require('./projections');
    const TARGET_TYPES = new Set(['FILE', 'ROUTE', 'MIDDLEWARE']);
    const violations   = [];
    for (const e of engine.all()) {
        if (e.status !== 'ACTIVE' || !TARGET_TYPES.has(e.type)) continue;
        const p = proj.checkProjection(e, 'repository');
        if (p.status === 'DRIFT') {
            violations.push({ id: e.id, name: e.name, type: e.type, detail: p.detail || 'repository projection DRIFT — not git-tracked' });
        }
    }
    return violations.length
        ? _fail('ACTIVE_FILE_IN_REPO', 'WARN', violations)
        : _pass('ACTIVE_FILE_IN_REPO');
}

function high_impact_entity_documented() {
    const engine     = require('./engine');
    const proj       = require('./projections');
    const impact     = require('./impact');
    const HIGH_RISK  = new Set(['CRITICAL', 'HIGH']);
    const violations = [];
    for (const e of engine.all()) {
        const risk = impact.quickRisk(e.id);
        if (!HIGH_RISK.has(risk)) continue;
        const p = proj.checkProjection(e, 'documentation');
        if (p.status === 'DRIFT') {
            violations.push({ id: e.id, name: e.name, risk, detail: p.detail || 'documentation projection DRIFT on high-impact entity' });
        }
    }
    return violations.length
        ? _fail('HIGH_IMPACT_ENTITY_DOCUMENTED', 'WARN', violations)
        : _pass('HIGH_IMPACT_ENTITY_DOCUMENTED');
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

const EVALUATORS = {
    constitutional_gate_healthy,
    no_orphaned_relationships,
    governed_migration_approved,
    active_service_monitored,
    gov_entity_documented,
    active_file_in_repo,
    high_impact_entity_documented,
};

/**
 * Evaluate all (or static-only) constraint rules.
 *
 * @param {{ full?: boolean }} opts  — full=true includes computed rules
 * @returns {{ ok, full, summary, results, duration_ms }}
 */
function check(opts = {}) {
    const t0   = Date.now();
    const full = opts.full === true || opts.full === 'true';
    const results = [];

    for (const [name, rule] of Object.entries(RULES)) {
        if (!full && rule.type === 'computed') continue;
        const fn = EVALUATORS[rule.check];
        if (!fn) {
            results.push({
                rule: name, status: 'ERROR', severity: 'ERROR',
                description: rule.description, type: rule.type,
                violations: [{ detail: `No evaluator registered for check "${rule.check}"` }],
            });
            continue;
        }
        try {
            const res = fn();
            results.push({
                ...res,
                description:  rule.description,
                type:         rule.type,
                owner:        rule.owner        || null,
                rationale:    rule.rationale    || null,
                remediation:  res.status === 'FAIL' ? (rule.remediation || null) : null,
                arch_ref:     rule.arch_ref     || null,
                blocking:     rule.blocking     || false,
                auto_fix:     rule.auto_fix     || false,
                evidence:     rule.evidence     || [],
            });
        } catch (e) {
            results.push({
                rule: name, status: 'ERROR', severity: 'ERROR',
                description: rule.description, type: rule.type,
                owner: rule.owner || null, arch_ref: rule.arch_ref || null,
                blocking: rule.blocking || false, auto_fix: false, evidence: [],
                violations: [{ detail: e.message }],
                remediation: rule.remediation || null,
            });
        }
    }

    const passCount     = results.filter(r => r.status === 'PASS').length;
    const failCount     = results.filter(r => r.status === 'FAIL').length;
    const errorCount    = results.filter(r => r.status !== 'PASS' && (r.severity === 'CRITICAL' || r.severity === 'ERROR')).length;
    const blockingCount = results.filter(r => r.status !== 'PASS' && r.blocking).length;

    return {
        ok:      errorCount === 0,
        full,
        summary: {
            pass:     passCount,
            fail:     failCount,
            errors:   errorCount,
            warnings: failCount - errorCount,
            blocking: blockingCount,
            total:    results.length,
        },
        results,
        duration_ms: Date.now() - t0,
    };
}

module.exports = { check };
