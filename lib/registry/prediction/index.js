'use strict';
// lib/registry/prediction.js — Simulation & Predictive Analysis (Phase C)
//
// simulateEntityChange(entityId, proposedChanges, graph, ctx)
//   — What breaks if entity X transitions to a new status/family/type?
//
// simulateMigration(filename, ctx)
//   — Full pre-flight extended with Registry simulation.

const { RegistryContext } = require('../context');
const impact              = require('../impact');
const health              = require('../health-score');

// ── simulateEntityChange ───────────────────────────────────────────────────────

/**
 * Simulate the effect of changing one or more fields on a registry entity.
 *
 * @param {string} entityId
 * @param {object} proposedChanges — e.g. { status: 'DEPRECATED' }
 * @param {ProjectedGraph} [graph] — optional projected graph for multi-entity scenario context
 * @param {RegistryContext} [ctx]
 * @returns simulation report
 */
function simulateEntityChange(entityId, proposedChanges = {}, graph, ctx = RegistryContext) {
    const t0   = Date.now();
    const proj = ctx.projections;
    const rels = ctx.relationships;

    const _lookup = graph ? id => graph.lookup(id) : ctx.engine.lookup.bind(ctx.engine);

    const entity = _lookup(entityId);
    if (!entity) {
        return { ok: false, error: `Not found: ${entityId}`, duration_ms: Date.now() - t0 };
    }

    const proposed = { ...entity, ...proposedChanges };

    const currentProjections  = proj.checkAllProjections(entity);
    const currentHealth       = health.compute(entity, currentProjections);
    const currentRisk         = impact.quickRisk(entityId, graph, ctx);
    const proposedProjections = proj.checkAllProjections(proposed);
    const proposedHealth      = health.compute(proposed, proposedProjections);

    const projectionChanges = [];
    for (let i = 0; i < currentProjections.length; i++) {
        const cur = currentProjections[i];
        const nxt = proposedProjections[i];
        if (cur && nxt && cur.status !== nxt.status) {
            projectionChanges.push({ projection: cur.projection, from: cur.status, to: nxt.status });
        }
    }

    const outgoing = rels.relationsOf(entityId);
    const incoming = rels.reverseRelationsOf(entityId);

    const willBecomeInactive = ['DEPRECATED', 'REMOVED', 'INACTIVE', 'DECOMMISSIONED']
        .includes((proposedChanges.status || '').toUpperCase());

    const atriskDependents = willBecomeInactive ? incoming.map(r => {
        const src = _lookup(r.from);
        return { id: r.from, name: src?.name || null, rel_type: r.type, risk: 'Depends on entity being deactivated' };
    }) : [];

    const blastReport = impact.analyze(entityId, { depth: 3, direction: 'upstream', graph }, ctx);
    const blastRadius = blastReport?.blast_radius || { direct: 0, transitive: 0, total: 0 };

    const newViolations = [];
    if (entityId === 'ENT-000388' && proposedChanges.status && proposedChanges.status !== 'ACTIVE') {
        newViolations.push({
            rule: 'CONSTITUTIONAL_GATE_HEALTHY', severity: 'CRITICAL',
            detail: `Changing ENT-000388 status to "${proposedChanges.status}" will trigger CONSTITUTIONAL_GATE_HEALTHY constraint violation`,
        });
    }
    if (willBecomeInactive && (currentRisk === 'CRITICAL' || currentRisk === 'HIGH')) {
        newViolations.push({
            rule: 'HIGH_IMPACT_ENTITY_DOCUMENTED', severity: 'WARN',
            detail: `Deactivating a ${currentRisk}-risk entity — ensure documentation is updated before proceeding`,
        });
    }

    const scoreDelta  = proposedHealth.score - currentHealth.score;
    const labelChange = currentHealth.label !== proposedHealth.label
        ? { from: currentHealth.label, to: proposedHealth.label }
        : null;

    return {
        ok: true,
        entity_id:        entityId,
        entity_name:      entity.name,
        proposed_changes: proposedChanges,
        health: {
            current:  { score: currentHealth.score,  label: currentHealth.label,  confidence: currentHealth.confidence },
            proposed: { score: proposedHealth.score, label: proposedHealth.label, confidence: proposedHealth.confidence },
            delta:    scoreDelta,
            label_change: labelChange,
        },
        projection_changes: projectionChanges,
        blast_radius:       blastRadius,
        current_risk:       currentRisk,
        at_risk_dependents: atriskDependents,
        new_constraint_violations: newViolations,
        relationship_counts: { outgoing: outgoing.length, incoming: incoming.length },
        duration_ms: Date.now() - t0,
    };
}

// ── simulateMigration ─────────────────────────────────────────────────────────

/**
 * Simulate the impact of applying a migration file.
 *
 * @param {string} filename
 * @param {RegistryContext} [ctx]
 * @returns simulation report
 */
function simulateMigration(filename, ctx = RegistryContext) {
    const t0 = Date.now();
    const ml = ctx.migrationLifecycle;

    const preflight = ml.preflight(filename);
    if (!preflight.governed) {
        return {
            ok: false, governed: false, filename,
            error: 'Migration is not Registry-governed — add @apex-migration header before simulating',
            preflight, duration_ms: Date.now() - t0,
        };
    }

    const entitySimulations = [];
    for (const entId of (preflight.header?.entRefs || [])) {
        const entity = ctx.engine.lookup(entId);
        if (!entity) {
            entitySimulations.push({ id: entId, error: 'Not registered in Registry' });
            continue;
        }
        const projections = ctx.projections.checkAllProjections(entity);
        const h           = health.compute(entity, projections);
        const risk        = impact.quickRisk(entId, null, ctx);
        const blast       = impact.analyze(entId, { depth: 2, direction: 'upstream' }, ctx);
        entitySimulations.push({
            id: entId, name: entity.name, family: entity.family, type: entity.type, status: entity.status,
            health: { score: h.score, label: h.label, confidence: h.confidence },
            risk, blast_radius: blast?.blast_radius || null,
        });
    }

    const risks       = entitySimulations.map(e => e.risk).filter(Boolean);
    const overallRisk = risks.includes('CRITICAL') ? 'CRITICAL'
                      : risks.includes('HIGH')     ? 'HIGH'
                      : risks.includes('MEDIUM')   ? 'MEDIUM'
                      : 'LOW';

    const warnings = [];
    if (!preflight.ok) warnings.push(`Preflight failed — ${preflight.errors} error(s). Resolve before applying.`);
    if (overallRisk === 'CRITICAL' || overallRisk === 'HIGH') {
        warnings.push(`Migration touches ${overallRisk}-risk entities — ensure approval chain is complete`);
    }
    const unapproved = (preflight.header?.status || '') !== 'APPROVED'
        && (preflight.header?.status || '') !== 'EXECUTING';
    if (unapproved) {
        warnings.push(`Migration status is "${preflight.header?.status || '(none)'}" — must reach APPROVED before applying`);
    }

    return {
        ok: preflight.ok && !unapproved, filename, governed: true,
        preflight_ok: preflight.ok, header: preflight.header,
        overall_risk: overallRisk, entity_simulations: entitySimulations,
        warnings, duration_ms: Date.now() - t0,
    };
}

module.exports = { simulateEntityChange, simulateMigration };
