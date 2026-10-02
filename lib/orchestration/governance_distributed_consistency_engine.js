'use strict';

// Governance Distributed Consistency Engine V1 — Cross-Node Event Comparison
// Compares event streams across nodes. Detects divergence, missing events,
// conflicting fingerprints, ordering violations.
// Deterministic. Read-only. No mutation. Never throws.

// ── compute_consistency_state ─────────────────────────────────────────────────
// node_event_sets: { [node_id]: event[] }
// Returns: frozen ConsistencyReport

function compute_consistency_state(node_event_sets) {
    if (!node_event_sets || typeof node_event_sets !== 'object' || Array.isArray(node_event_sets)) {
        return Object.freeze({
            status:                   'CONSISTENCY_INCOMPLETE',
            reason:                   'invalid_input',
            global_consistency_score: 0,
            node_consistency_map:     Object.freeze({}),
            divergence_clusters:      Object.freeze([]),
            conflicting_fingerprints: Object.freeze([]),
            anomaly_type:             'CRITICAL',
        });
    }

    try {
        const nodeIds = Object.keys(node_event_sets).sort();

        if (nodeIds.length === 0) {
            return Object.freeze({
                status:                   'CONSISTENCY_TRIVIAL',
                global_consistency_score: 1.0,
                node_consistency_map:     Object.freeze({}),
                divergence_clusters:      Object.freeze([]),
                conflicting_fingerprints: Object.freeze([]),
                anomaly_type:             'NONE',
            });
        }

        if (nodeIds.length === 1) {
            const [nodeId] = nodeIds;
            const events   = node_event_sets[nodeId] ?? [];
            return Object.freeze({
                status:                   'SINGLE_NODE',
                global_consistency_score: 1.0,
                node_consistency_map:     Object.freeze({
                    [nodeId]: Object.freeze({ event_count: events.length, missing_events: 0, divergence_ratio: 0 }),
                }),
                divergence_clusters:      Object.freeze([]),
                conflicting_fingerprints: Object.freeze([]),
                anomaly_type:             'NONE',
                node_count:               1,
            });
        }

        // ── Build per-node fingerprint + execution-id sets ────────────────────
        const nodeMeta = {};
        for (const nodeId of nodeIds) {
            const events = node_event_sets[nodeId] ?? [];
            nodeMeta[nodeId] = {
                events,
                fingerprints: new Set(events.map(e => e.fingerprint).filter(Boolean)),
                execIds:      new Set(events.map(e => e.payload?.execution_id).filter(Boolean)),
            };
        }

        // Global fingerprint union
        const allFingerprints = new Set();
        for (const { fingerprints } of Object.values(nodeMeta)) {
            for (const fp of fingerprints) allFingerprints.add(fp);
        }

        // ── Per-node divergence ───────────────────────────────────────────────
        const node_consistency_map = {};
        let   totalDivergence = 0;

        for (const [nodeId, { events, fingerprints }] of Object.entries(nodeMeta)) {
            const missing        = Math.max(0, allFingerprints.size - fingerprints.size);
            const divergenceRatio = allFingerprints.size > 0 ? missing / allFingerprints.size : 0;

            // Out-of-order detection: check local_seq monotonicity per execution_id
            const seqViolations = _countSeqViolations(events);

            node_consistency_map[nodeId] = Object.freeze({
                event_count:      events.length,
                unique_fps:       fingerprints.size,
                missing_events:   missing,
                divergence_ratio: parseFloat(divergenceRatio.toFixed(3)),
                seq_violations:   seqViolations,
            });
            totalDivergence += divergenceRatio;
        }

        const global_consistency_score = parseFloat(
            Math.max(0, 1 - totalDivergence / nodeIds.length).toFixed(3)
        );

        // ── Divergence clusters (execution_ids present on some nodes but not all) ─
        const allExecIds = new Set();
        for (const { execIds } of Object.values(nodeMeta)) {
            for (const id of execIds) allExecIds.add(id);
        }

        const divergence_clusters = [];
        for (const execId of [...allExecIds].sort()) {
            const presentOn = nodeIds.filter(nid => nodeMeta[nid].execIds.has(execId));
            const missingOn = nodeIds.filter(nid => !nodeMeta[nid].execIds.has(execId));
            if (missingOn.length > 0) {
                divergence_clusters.push(Object.freeze({
                    execution_id: execId,
                    present_on:   Object.freeze(presentOn),
                    missing_on:   Object.freeze(missingOn),
                }));
            }
        }

        // ── Conflicting fingerprints (same event_type + execution_id, different fp) ─
        const conflicting_fingerprints = [];
        for (const execId of [...allExecIds].sort()) {
            const byType = {};
            for (const [nodeId, { events }] of Object.entries(nodeMeta)) {
                for (const e of events.filter(ev => ev.payload?.execution_id === execId)) {
                    if (!e.fingerprint) continue;
                    const key = e.event_type;
                    if (!byType[key]) byType[key] = new Set();
                    byType[key].add(e.fingerprint);
                }
            }
            for (const [eventType, fps] of Object.entries(byType)) {
                if (fps.size > 1) {
                    conflicting_fingerprints.push(Object.freeze({
                        execution_id:      execId,
                        event_type:        eventType,
                        fingerprint_count: fps.size,
                    }));
                }
            }
        }

        const anomaly_type =
            global_consistency_score >= 0.95 ? 'NONE'     :
            global_consistency_score >= 0.80 ? 'MINOR'    :
            global_consistency_score >= 0.50 ? 'MAJOR'    : 'CRITICAL';

        return Object.freeze({
            status:                   'CONSISTENCY_COMPUTED',
            global_consistency_score,
            node_consistency_map:     Object.freeze(node_consistency_map),
            divergence_clusters:      Object.freeze(divergence_clusters),
            conflicting_fingerprints: Object.freeze(conflicting_fingerprints),
            anomaly_type,
            node_count:               nodeIds.length,
        });

    } catch (_) {
        return Object.freeze({
            status:                   'CONSISTENCY_INCOMPLETE',
            reason:                   'compute_error',
            global_consistency_score: 0,
            node_consistency_map:     Object.freeze({}),
            divergence_clusters:      Object.freeze([]),
            conflicting_fingerprints: Object.freeze([]),
            anomaly_type:             'CRITICAL',
        });
    }
}

// ── Sequence violation counter ────────────────────────────────────────────────
// Checks local_seq monotonicity per execution_id within a single node's events.

function _countSeqViolations(events) {
    try {
        const byExec = {};
        for (const e of events) {
            const execId = e.payload?.execution_id;
            const seq    = e.payload?._meta?.local_seq;
            if (!execId || seq == null) continue;
            if (!byExec[execId]) byExec[execId] = [];
            byExec[execId].push(seq);
        }
        let violations = 0;
        for (const seqs of Object.values(byExec)) {
            for (let i = 1; i < seqs.length; i++) {
                if (seqs[i] <= seqs[i - 1]) violations++;
            }
        }
        return violations;
    } catch (_) {
        return 0;
    }
}

module.exports = { compute_consistency_state };
