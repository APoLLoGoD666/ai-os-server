'use strict';
// lib/registry/scenario/entity-impact.js — Health impact per entity change

function entityImpact(entityId, proposed, graph) {
    const prediction = require('../prediction');
    const rels       = require('../relationships');
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

module.exports = { entityImpact };
