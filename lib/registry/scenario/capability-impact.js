'use strict';
// lib/registry/scenario/capability-impact.js — Capability degradation from entity impacts

const { RegistryContext } = require('../context');

const URGENCY_RANK = { HALT: 4, REVIEW_REQUIRED: 3, PROCEED_WITH_CAUTION: 2, PROCEED: 1 };

// graph: ProjectedGraph — used to compute projected capability status alongside
// structural degradation analysis. degradationFrom() answers "which capabilities
// lose a dependency?"; fullReport(graph) answers "what will capability status
// actually be given the proposed entity states?"
function capabilityImpacts(entityIds, graph, ctx = RegistryContext) {
    const caps = ctx.capabilities;
    const byCapability = {};

    // Build projected status map for all capabilities against the hypothetical graph
    const projectedReport = caps.fullReport(graph, ctx);
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

module.exports = { URGENCY_RANK, capabilityImpacts };
