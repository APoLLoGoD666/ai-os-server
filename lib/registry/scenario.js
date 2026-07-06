'use strict';
// lib/registry/scenario.js — Multi-Entity Scenario Simulation Engine
//
// Runs what-if scenarios across the full intelligence stack:
//   Entity health impact → Capability degradation → Constraint violations → Executive recommendation
//
// Unlike prediction.js (single-entity, deterministic), scenario.js handles:
//   - Multiple simultaneous entity changes
//   - Full capability degradation chain per change
//   - Aggregate constraint violation scan
//   - Executive recommendation with urgency and confidence score
//
// All outputs are tagged INFERENCE — do not drive policy from these results.

const URGENCY_RANK = { HALT: 4, REVIEW_REQUIRED: 3, PROCEED_WITH_CAUTION: 2, PROCEED: 1 };

// ── Health impact per entity change ──────────────────────────────────────────

function _entityImpact(entityId, proposed, graph) {
    const prediction = require('./prediction');
    const rels       = require('./relationships');
    const result     = prediction.simulateEntityChange(entityId, proposed, graph);
    if (!result.ok) return { entity_id: entityId, ok: false, error: result.error };

    // Build edge provenance index: dependent entity id → edge metadata
    const inEdges  = rels.reverseRelationsOf(entityId);
    const edgeIndex = {};
    for (const e of inEdges) edgeIndex[e.from] = e;

    const atRisk = (result.at_risk_dependents || []).map(dep => ({
        ...dep,
        evidence: edgeIndex[dep.id] ? [{
            source:       edgeIndex[dep.id].source       || 'manual',
            derived_from: edgeIndex[dep.id].derived_from || null,
            confidence:   edgeIndex[dep.id].confidence   || 1.0,
            strength:     edgeIndex[dep.id].strength     || null,
            observed_by:  edgeIndex[dep.id].observed_by  || null,
        }] : [],
    }));

    return {
        entity_id:          entityId,
        ok:                 true,
        name:               result.entity_name,
        family:             null,
        health_delta:       result.health?.delta ?? null,
        projection_changes: result.projection_changes || [],
        at_risk_count:      atRisk.length,
        at_risk:            atRisk,
    };
}

// ── Capability degradation from entity impacts ────────────────────────────────

// graph: ProjectedGraph — used to compute projected capability status alongside
// structural degradation analysis. degradationFrom() answers "which capabilities
// lose a dependency?"; fullReport(graph) answers "what will capability status
// actually be given the proposed entity states?"
function _capabilityImpacts(entityIds, graph) {
    const caps = require('./capabilities');
    const byCapability = {};

    // Build projected status map for all capabilities against the hypothetical graph
    const projectedReport = caps.fullReport(graph);
    const projectedStatus = {};
    for (const c of projectedReport.capabilities) projectedStatus[c.id] = c.status;

    for (const id of entityIds) {
        const result  = caps.degradationFrom(id);
        const degraded = result.affected || [];
        for (const d of degraded) {
            const prev = byCapability[d.capability_id];
            if (!prev || URGENCY_RANK[d.severity] > URGENCY_RANK[prev.severity || 'PROCEED']) {
                byCapability[d.capability_id] = { ...d };
                if (!byCapability[d.capability_id].affected_by) byCapability[d.capability_id].affected_by = [];
            }
            if (!byCapability[d.capability_id].affected_by.includes(id)) {
                byCapability[d.capability_id].affected_by = (byCapability[d.capability_id].affected_by || []).concat(id);
            }
            byCapability[d.capability_id].projected_status = projectedStatus[d.capability_id] || 'UNKNOWN';
        }
    }

    return Object.values(byCapability).sort((a, b) => {
        return (URGENCY_RANK[b.severity] || 0) - (URGENCY_RANK[a.severity] || 0);
    });
}

// ── Constraint violations from proposed entity states ─────────────────────────
// Uses ProjectedGraph — the live engine is never mutated.

function _constraintCheck(changes, graph) {
    const constraints = require('./constraints');

    // Evaluate constraints against the projected graph
    const result = constraints.check({ graph });

    // Annotate violations whose affected entity IDs overlap with the change set
    const changedIds = new Set(changes.map(c => c.entity_id));
    for (const r of result.results) {
        if (!r.ok) {
            r.scenario_related = (r.violations || []).some(v =>
                v.id && changedIds.has(v.id)
            );
        }
    }

    return result;
}

// ── Urgency classification ────────────────────────────────────────────────────

function _computeUrgency(capImpacts, constraintResult) {
    const blockingFailures = constraintResult.results.filter(r => !r.ok && r.blocking).length;
    const criticalCaps     = capImpacts.filter(c => c.severity === 'CRITICAL').length;
    const highCaps         = capImpacts.filter(c => c.severity === 'HIGH').length;

    if (blockingFailures > 0 || criticalCaps > 0) return 'HALT';
    if (highCaps > 0 || constraintResult.summary.fail > 0) return 'REVIEW_REQUIRED';
    if (capImpacts.length > 0 || constraintResult.summary.warnings > 0) return 'PROCEED_WITH_CAUTION';
    return 'PROCEED';
}

// ── Confidence score ──────────────────────────────────────────────────────────

function _computeConfidence(entityImpacts, capImpacts) {
    // Base confidence: average of prediction confidence signals
    // Degrades if entities are unknown or have no projection data
    let score = 0.80; // inference layer baseline

    const unknownEntities = entityImpacts.filter(e => !e.ok).length;
    if (unknownEntities > 0) score -= 0.10 * unknownEntities;

    const noProjectionData = entityImpacts.filter(e => e.ok && e.projection_changes.length === 0).length;
    if (noProjectionData > 0) score -= 0.05 * noProjectionData;

    // More capability impacts = more certain the effect is real
    if (capImpacts.length > 0) score = Math.min(score + 0.05, 0.90);

    return Math.max(0.30, Math.min(0.90, score));
}

// ── Rationale builder ─────────────────────────────────────────────────────────

function _buildRationale(urgency, entityImpacts, capImpacts, constraintResult) {
    const parts = [];

    const failedEntities = entityImpacts.filter(e => !e.ok).map(e => e.entity_id);
    if (failedEntities.length) parts.push(`${failedEntities.length} entity/entities could not be simulated: ${failedEntities.join(', ')}.`);

    const criticalCaps = capImpacts.filter(c => c.severity === 'CRITICAL');
    if (criticalCaps.length) parts.push(`Critical capability degradation: ${criticalCaps.map(c => c.name || c.capability_id).join(', ')}.`);

    const highCaps = capImpacts.filter(c => c.severity === 'HIGH');
    if (highCaps.length) parts.push(`High-severity capability impact: ${highCaps.map(c => c.name || c.capability_id).join(', ')}.`);

    const blocking = constraintResult.results.filter(r => !r.ok && r.blocking);
    if (blocking.length) parts.push(`${blocking.length} blocking constraint(s) violated: ${blocking.map(r => r.rule).join(', ')}.`);

    const nonBlocking = constraintResult.results.filter(r => !r.ok && !r.blocking);
    if (nonBlocking.length) parts.push(`${nonBlocking.length} non-blocking constraint(s) failed.`);

    if (parts.length === 0) {
        parts.push('No capability degradation or constraint violations detected for this change set.');
    }

    return parts.join(' ');
}

// ── Executive summary ─────────────────────────────────────────────────────────
// Answers: what is the business impact of this change set?
// Leads with capabilities, not entity counts.

function _buildExecutive(urgency, confidence, rationale, entityImpacts, capImpacts, constraintResult, changes) {
    const engine = require('./engine');
    const ml     = require('./migration-lifecycle');

    // Collect all at-risk entity IDs across all entity impacts
    const atRiskIds = new Set();
    for (const ei of entityImpacts) {
        if (!ei.ok) continue;
        for (const dep of (ei.at_risk || [])) atRiskIds.add(dep.id);
    }

    // Runtime unavailable: at-risk entities of service/runtime type
    const RUNTIME_TYPES = new Set(['SERVICE', 'MIDDLEWARE', 'API', 'ROUTE', 'FUNCTION', 'HANDLER']);
    const runtimeUnavailable = [...atRiskIds].filter(id => {
        const e = engine.lookup(id);
        return e && RUNTIME_TYPES.has(e.type);
    }).length;

    // Documentation drift: projection changes going to DRIFT on documentation plane
    let docDrift = 0;
    for (const ei of entityImpacts) {
        if (!ei.ok) continue;
        for (const pc of (ei.projection_changes || [])) {
            if (pc.projection === 'documentation' && pc.to === 'DRIFT') docDrift++;
        }
    }

    // Migrations at risk: reference any changed or at-risk entity
    const allAffectedIds = new Set([...changes.map(c => c.entity_id), ...atRiskIds]);
    const migrationsAtRisk = ml.scanMigrations()
        .filter(m => m.governed && m.entRefs.some(id => allAffectedIds.has(id)))
        .map(m => m.filename);

    const RISK_MAP = { HALT: 'CRITICAL', REVIEW_REQUIRED: 'HIGH', PROCEED_WITH_CAUTION: 'MEDIUM', PROCEED: 'LOW' };

    return {
        risk:                RISK_MAP[urgency] || 'UNKNOWN',
        urgency,
        confidence,
        rationale,
        capability_impacts:  capImpacts.map(c => ({
            capability:  c.name || c.capability_id,
            severity:    c.severity,
            criticality: c.criticality,
            affected_by: c.affected_by || changes.map(ch => ch.entity_id),
        })),
        runtime_unavailable:  runtimeUnavailable,
        documentation_drift:  docDrift,
        constraints_violated: constraintResult.summary.fail,
        migrations_at_risk:   migrationsAtRisk,
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run a multi-entity scenario simulation.
 *
 * @param {{ name?: string, changes: Array<{ entity_id: string, proposed: object }> }} opts
 * @returns {{ ok, scenario, entity_impacts, capability_impacts, constraint_check, recommendation, _inference }}
 *
 * Result is tagged INFERENCE — probabilistic. Do not use to drive policy.
 */
function runScenario(opts = {}) {
    const t0      = Date.now();
    const changes  = opts.changes || [];
    const name     = opts.name || `scenario-${Date.now()}`;

    if (!changes.length) {
        return { ok: false, error: 'No changes provided. Specify at least one { entity_id, proposed } change.' };
    }

    // Build projected graph once — immutable overlay, no engine mutation.
    // All subsystems that accept a graph context evaluate against this.
    const { ProjectedGraph } = require('./projected-graph');
    const graph = new ProjectedGraph(changes);

    // Step 1: Entity-level health impact — each simulation is aware of sibling changes
    const entityImpacts = changes.map(c => _entityImpact(c.entity_id, c.proposed, graph));

    // Step 2: Capability degradation + projected capability status
    const affectedIds   = entityImpacts.filter(e => e.ok).map(e => e.entity_id);
    const capImpacts    = _capabilityImpacts(affectedIds, graph);

    // Step 3: Constraint violations against the projected graph
    const constraintResult = _constraintCheck(changes, graph);

    // Step 4: Executive recommendation
    const urgency    = _computeUrgency(capImpacts, constraintResult);
    const confidence = _computeConfidence(entityImpacts, capImpacts);
    const rationale  = _buildRationale(urgency, entityImpacts, capImpacts, constraintResult);

    const executive = _buildExecutive(urgency, confidence, rationale, entityImpacts, capImpacts, constraintResult, changes);

    const result = {
        ok: true,
        scenario: {
            name,
            change_count:  changes.length,
            entity_ids:    changes.map(c => c.entity_id),
        },
        executive,
        entity_impacts:    entityImpacts,
        capability_impacts: capImpacts,
        constraint_check: {
            summary:  constraintResult.summary,
            failures: constraintResult.results.filter(r => !r.ok),
        },
        _inference: {
            warning:    'Probabilistic result. Do not treat as ground truth or use to drive policy.',
            data_type:  'inference',
            confidence,
        },
        duration_ms: Date.now() - t0,
    };

    // Persist to decision memory when urgency warrants review (fire-and-forget).
    // Only runs when opts.record_decision is explicitly set — never automatic.
    if (opts.record_decision && (urgency === 'HALT' || urgency === 'REVIEW_REQUIRED')) {
        setImmediate(async () => {
            try {
                const dm = require('../memory/decision-memory');
                await dm.storeDecision(
                    `Registry scenario: ${name} — ${urgency}`,
                    'architectural',
                    {
                        source:       'registry_scenario',
                        confidence,
                        rationale,
                        context: {
                            entity_ids:           changes.map(c => c.entity_id),
                            capability_impacts:   capImpacts.map(c => ({ id: c.capability_id, severity: c.severity, projected: c.projected_status })),
                            constraints_violated: constraintResult.summary.fail,
                            migrations_at_risk:   executive.migrations_at_risk,
                        },
                        alternatives: changes.map(c => `Keep ${c.entity_id} at current state`),
                    }
                );
            } catch (_) {}
        });
    }

    return result;
}

module.exports = { runScenario };
