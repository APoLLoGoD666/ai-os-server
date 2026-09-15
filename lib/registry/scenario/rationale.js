'use strict';
// lib/registry/scenario/rationale.js — Rationale builder

function buildRationale(urgency, entityImpacts, capImpacts, constraintResult) {
    const parts = [];

    const failedEntities = entityImpacts.filter(e => !e.ok).map(e => e.entity_id);
    if (failedEntities.length) parts.push(`${failedEntities.length} entity/entities could not be simulated: ${failedEntities.join(', ')}.`);

    const criticalCaps = capImpacts.filter(c => c.severity === 'CRITICAL');
    if (criticalCaps.length) parts.push(`Critical capability degradation: ${criticalCaps.map(c => c.name || c.capability_id).join(', ')}.`);

    const highCaps = capImpacts.filter(c => c.severity === 'HIGH');
    if (highCaps.length) parts.push(`High-severity capability impact: ${highCaps.map(c => c.name || c.capability_id).join(', ')}.`);

    const blocking = constraintResult.results.filter(r => r.status !== 'PASS' && r.blocking);
    if (blocking.length) parts.push(`${blocking.length} blocking constraint(s) violated: ${blocking.map(r => r.rule).join(', ')}.`);

    const nonBlocking = constraintResult.results.filter(r => r.status !== 'PASS' && !r.blocking);
    if (nonBlocking.length) parts.push(`${nonBlocking.length} non-blocking constraint(s) failed.`);

    if (parts.length === 0) {
        parts.push('No capability degradation or constraint violations detected for this change set.');
    }

    return parts.join(' ');
}

module.exports = { buildRationale };
