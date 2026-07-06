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

function _entityImpact(entityId, proposed) {
    const prediction = require('./prediction');
    const rels       = require('./relationships');
    const result     = prediction.simulateEntityChange(entityId, proposed);
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

function _capabilityImpacts(entityIds) {
    const caps = require('./capabilities');
    const byCapability = {};

    for (const id of entityIds) {
        const result  = caps.degradationFrom(id);
        const degraded = result.affected || [];
        for (const d of degraded) {
            const prev = byCapability[d.capability_id];
            if (!prev || URGENCY_RANK[d.severity] > URGENCY_RANK[prev.severity || 'PROCEED']) {
                byCapability[d.capability_id] = d;
                if (!byCapability[d.capability_id].affected_by) byCapability[d.capability_id].affected_by = [];
            }
            if (!byCapability[d.capability_id].affected_by.includes(id)) {
                byCapability[d.capability_id].affected_by = (byCapability[d.capability_id].affected_by || []).concat(id);
            }
        }
    }

    return Object.values(byCapability).sort((a, b) => {
        return (URGENCY_RANK[b.severity] || 0) - (URGENCY_RANK[a.severity] || 0);
    });
}

// ── Constraint violations from proposed entity states ─────────────────────────

function _constraintCheck(changes) {
    const constraints = require('./constraints');
    const engine      = require('./engine');

    // Temporarily patch entity states for constraint evaluation
    // constraints.check() reads engine.lookup() — we can't truly patch without mutating state,
    // so we pass the proposed changes as hints and run a live check, noting which entities change
    const changedIds  = changes.map(c => c.entity_id);
    const result      = constraints.check();

    // Annotate violations that involve changed entities with a scenario flag
    for (const r of result.results) {
        if (!r.ok) {
            r.scenario_related = r.evidence && r.evidence.some(ev =>
                changedIds.some(id => typeof ev === 'string' && ev.includes(id))
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

    // Step 1: Entity-level health impact per change
    const entityImpacts = changes.map(c => _entityImpact(c.entity_id, c.proposed));

    // Step 2: Capability degradation from all affected entities
    const affectedIds   = entityImpacts.filter(e => e.ok).map(e => e.entity_id);
    const capImpacts    = _capabilityImpacts(affectedIds);

    // Step 3: Constraint violations (live check + scenario annotation)
    const constraintResult = _constraintCheck(changes);

    // Step 4: Executive recommendation
    const urgency    = _computeUrgency(capImpacts, constraintResult);
    const confidence = _computeConfidence(entityImpacts, capImpacts);
    const rationale  = _buildRationale(urgency, entityImpacts, capImpacts, constraintResult);

    const executive = _buildExecutive(urgency, confidence, rationale, entityImpacts, capImpacts, constraintResult, changes);

    return {
        ok: true,
        scenario: {
            name,
            change_count:  changes.length,
            entity_ids:    changes.map(c => c.entity_id),
        },
        // Executive summary leads — capability-first, human-readable
        executive,
        // Detailed breakdown
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
}

module.exports = { runScenario };
