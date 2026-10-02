'use strict';
// lib/registry/scenario/executive.js — Executive summary
// Answers: what is the business impact of this change set?
// Leads with capabilities, not entity counts.

const { RegistryContext } = require('../context');

function buildExecutive(urgency, confidence, rationale, entityImpacts, capImpacts, constraintResult, changes, ctx = RegistryContext) {
    const engine = ctx.engine;
    const ml     = ctx.migrationLifecycle;

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

module.exports = { buildExecutive };
