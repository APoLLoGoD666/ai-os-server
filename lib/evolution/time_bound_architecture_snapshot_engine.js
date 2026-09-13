'use strict';

// Time-Bound Architecture Snapshot Engine V1 — Temporal Architecture Determinism
// Generates deterministic historical architecture snapshots. Enables temporal diffing
// and evolution traceability across deployments.
// NO execution authority. NO mutation of architecture. NO runtime side effects.
// I3: same architecture + same time bucket → same snapshot always.

const crypto = require('crypto');

const ENGINE_VERSION = '1.0.0';

// In-memory snapshot store — keyed by timestamp_bucket.
// Not DB-backed by design: no mutation of architecture state (I2).
const _store = new Map();

// ── Sub-hashes ────────────────────────────────────────────────────────────────

function _moduleSetHash(modules) {
    const raw = (modules ?? [])
        .map(m => `${m.module_id}:${m.version}:${m.status}`)
        .sort()
        .join('|');
    return 'msh-' + crypto.createHash('sha256').update(raw).digest('hex');
}

function _graphHash(edges) {
    const raw = (edges ?? [])
        .map(e => `${e.from}->${e.to}`)
        .sort()
        .join('|');
    return 'gh-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 3: Temporal hash ─────────────────────────────────────────────────────
// time_bucket is coarse-grained only (hour-aligned). No wall-clock ms. (I3)

function _temporalHash(registryHash, moduleSetHash, graphHash, changeVector, timeBucket) {
    const cvStr = [
        (changeVector.added_modules    ?? []).slice().sort().join(','),
        (changeVector.removed_modules  ?? []).slice().sort().join(','),
        (changeVector.modified_modules ?? []).slice().sort().join(','),
        (changeVector.edge_diff?.added_edges   ?? []).slice().sort().join(','),
        (changeVector.edge_diff?.removed_edges ?? []).slice().sort().join(','),
    ].join('|');
    const raw = [registryHash ?? '', moduleSetHash ?? '', graphHash ?? '', cvStr, timeBucket ?? ''].join('::');
    return 'th-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 2: Change vector computation ────────────────────────────────────────
// Deterministic diff. Sorted arrays. No order ambiguity.
// Missing previous snapshot → INITIAL_STATE.

function _computeChangeVector(prevSnap, currModules, currEdges) {
    if (!prevSnap) {
        return Object.freeze({
            type:             'INITIAL_STATE',
            added_modules:    Object.freeze(currModules.map(m => m.module_id).sort()),
            removed_modules:  Object.freeze([]),
            modified_modules: Object.freeze([]),
            edge_diff:        Object.freeze({
                added_edges:   Object.freeze(currEdges.map(e => `${e.from}->${e.to}`).sort()),
                removed_edges: Object.freeze([]),
            }),
        });
    }

    const prevModMap = new Map((prevSnap.modules ?? []).map(m => [m.module_id, m]));
    const currModMap = new Map(currModules.map(m => [m.module_id, m]));

    const added_modules   = [...currModMap.keys()].filter(id => !prevModMap.has(id)).sort();
    const removed_modules = [...prevModMap.keys()].filter(id => !currModMap.has(id)).sort();
    const modified_modules = [...currModMap.entries()]
        .filter(([id, m]) => { const p = prevModMap.get(id); return p && (p.version !== m.version || p.status !== m.status); })
        .map(([id]) => id)
        .sort();

    const prevEdgeSet = new Set((prevSnap.edges ?? []).map(e => `${e.from}->${e.to}`));
    const currEdgeSet = new Set(currEdges.map(e => `${e.from}->${e.to}`));
    const added_edges   = [...currEdgeSet].filter(e => !prevEdgeSet.has(e)).sort();
    const removed_edges = [...prevEdgeSet].filter(e => !currEdgeSet.has(e)).sort();

    return Object.freeze({
        type:             'DELTA',
        added_modules:    Object.freeze(added_modules),
        removed_modules:  Object.freeze(removed_modules),
        modified_modules: Object.freeze(modified_modules),
        edge_diff:        Object.freeze({ added_edges: Object.freeze(added_edges), removed_edges: Object.freeze(removed_edges) }),
    });
}

// ── Time bucket (hour-aligned) ────────────────────────────────────────────────
// Coarse-grained only: YYYY-MM-DDTHH:00 — minutes/seconds never enter hash logic.

function _timeBucket(override) {
    return (override ?? new Date().toISOString()).slice(0, 13) + ':00';
}

// ── Compatibility state ───────────────────────────────────────────────────────

function _compatibilityState(registry) {
    if (!registry)                                                 return 'UNKNOWN';
    if (registry.structure_health === 'FRAGMENTED' ||
        registry.graph_health     === 'DISCONNECTED')              return 'INCOMPATIBLE';
    if (registry.structure_health === 'COMPLETE' &&
        registry.graph_health     === 'CONNECTED')                 return 'COMPATIBLE';
    return 'PARTIAL';
}

// ── Change magnitude ──────────────────────────────────────────────────────────

function _magnitude(cv) {
    return (cv?.added_modules?.length   ?? 0) +
           (cv?.removed_modules?.length ?? 0) +
           (cv?.modified_modules?.length ?? 0) +
           (cv?.edge_diff?.added_edges?.length   ?? 0) +
           (cv?.edge_diff?.removed_edges?.length ?? 0);
}

// ── Task 4: Snapshot generation flow ─────────────────────────────────────────

function create_snapshot(input) {
    const trace        = [];
    const anomalyFlags = [];

    try {
        const registry     = input?.registry          ?? null;
        const prevSnapshot = input?.previous_snapshot ?? null;
        const bucket       = _timeBucket(input?.timestamp_override);

        // Task 6: no registry → TEMPORAL_SNAPSHOT_INCOMPLETE
        if (!registry || !registry.registry_hash) {
            anomalyFlags.push('MISSING_REGISTRY');
            const sid = 'ts-' + crypto.createHash('sha256').update(bucket + 'INCOMPLETE').digest('hex').slice(0, 16);
            const rec = Object.freeze({
                snapshot_id:         sid,
                timestamp_bucket:    bucket,
                registry_hash:       null,
                module_set_hash:     null,
                graph_hash:          null,
                temporal_hash:       null,
                compatibility_state: 'UNKNOWN',
                coverage:            Object.freeze({ present: 0, expected: 0, ratio: 0 }),
                health:              'FRAGMENTED',
                change_vector:       null,
                modules:             Object.freeze([]),
                edges:               Object.freeze([]),
                anomaly_flags:       Object.freeze([...anomalyFlags]),
                trace:               Object.freeze(['snapshot_initiated', 'missing_registry']),
                confidence:          0.10,
                change_magnitude:    0,
                engine_version:      ENGINE_VERSION,
                status:              'TEMPORAL_SNAPSHOT_INCOMPLETE',
            });
            console.log(`[TemporalSnapshotEngine] id=${sid} status=TEMPORAL_SNAPSHOT_INCOMPLETE`);
            return rec;
        }

        trace.push('snapshot_initiated');

        // Extract stable module + edge data (Task 4: graph extraction)
        const currModules = (registry.modules ?? []).map(m => ({ module_id: m.module_id, version: m.version, status: m.status }));
        const currEdges   = (registry.graph?.edges ?? []).map(e => ({ from: e.from, to: e.to }));
        trace.push('registry_data_extracted');

        // Task 2: Change vector (deterministic diff)
        const changeVector = _computeChangeVector(prevSnapshot, currModules, currEdges);
        trace.push(`change_vector_computed:type=${changeVector.type}`);

        // Sub-hashes (Task 3)
        const moduleSetHash = _moduleSetHash(currModules);
        const graphHash     = _graphHash(currEdges);
        trace.push('sub_hashes_computed');

        // Task 3: Temporal hash (coarse bucket only — I3)
        const temporalHash = _temporalHash(registry.registry_hash, moduleSetHash, graphHash, changeVector, bucket);
        const snapshotId   = 'ts-' + temporalHash.slice(3, 19);
        trace.push('temporal_hash_computed');

        const compat    = _compatibilityState(registry);
        const coverage  = Object.freeze({
            present:  registry.module_count   ?? 0,
            expected: registry.expected_count ?? 0,
            ratio:    parseFloat(((registry.module_count ?? 0) / Math.max(registry.expected_count ?? 1, 1)).toFixed(3)),
        });
        const health    = registry.structure_health ?? 'FRAGMENTED';
        const magnitude = _magnitude(changeVector);

        if (registry.graph?.orphans?.length > 0) anomalyFlags.push(`ORPHAN_MODULES:${registry.graph.orphans.join(',')}`);
        if (changeVector.removed_modules.length > 0) anomalyFlags.push('MODULES_REMOVED');

        const confidence = compat === 'COMPATIBLE' ? 1.0 : compat === 'PARTIAL' ? 0.70 : 0.30;

        const snapshot = Object.freeze({
            snapshot_id:         snapshotId,
            timestamp_bucket:    bucket,
            registry_hash:       registry.registry_hash,
            module_set_hash:     moduleSetHash,
            graph_hash:          graphHash,
            temporal_hash:       temporalHash,
            compatibility_state: compat,
            coverage,
            health,
            change_vector:       changeVector,
            modules:             Object.freeze(currModules.map(m => Object.freeze({ ...m }))),
            edges:               Object.freeze(currEdges.map(e => Object.freeze({ ...e }))),
            anomaly_flags:       Object.freeze([...anomalyFlags]),
            trace:               Object.freeze([...trace, 'snapshot_sealed']),
            confidence,
            change_magnitude:    magnitude,
            engine_version:      ENGINE_VERSION,
            status:              'TEMPORAL_SNAPSHOT_COMPLETE',
        });

        // Store by bucket — overwriting with same deterministic result for same architecture + bucket (I3)
        _store.set(bucket, snapshot);

        // Task 7: Observability log — no behavioural effect
        console.log(
            `[TemporalSnapshotEngine] id=${snapshotId} bucket=${bucket}` +
            ` hash=${registry.registry_hash.slice(0, 22)}... coverage=${coverage.ratio}` +
            ` change_magnitude=${magnitude} compat=${compat}`
        );

        return snapshot;

    } catch (_) {
        // Task 6: catch-all — never halt, never retry
        anomalyFlags.push('SNAPSHOT_PROJECTION_FAILED');
        const bucket  = _timeBucket(input?.timestamp_override);
        const sid     = 'ts-' + crypto.createHash('sha256').update(bucket + 'FAILED').digest('hex').slice(0, 16);
        const fallback = Object.freeze({
            snapshot_id:         sid,
            timestamp_bucket:    bucket,
            registry_hash:       null,
            module_set_hash:     null,
            graph_hash:          null,
            temporal_hash:       null,
            compatibility_state: 'UNKNOWN',
            coverage:            Object.freeze({ present: 0, expected: 0, ratio: 0 }),
            health:              'FRAGMENTED',
            change_vector:       null,
            modules:             Object.freeze([]),
            edges:               Object.freeze([]),
            anomaly_flags:       Object.freeze([...anomalyFlags]),
            trace:               Object.freeze([...trace, 'snapshot_incomplete']),
            confidence:          0.10,
            change_magnitude:    0,
            engine_version:      ENGINE_VERSION,
            status:              'TEMPORAL_SNAPSHOT_INCOMPLETE',
        });
        console.log(`[TemporalSnapshotEngine] id=${sid} status=TEMPORAL_SNAPSHOT_INCOMPLETE reason=projection_failed`);
        return fallback;
    }
}

// ── Task 5: Temporal query API ────────────────────────────────────────────────
// Read-only. Frozen output. No mutation of stored snapshots.

function get_snapshot(bucket) {
    if (!bucket) return null;
    return _store.get(bucket) ?? null;
}

function get_latest_snapshot() {
    if (_store.size === 0) return null;
    // Lexicographic sort on bucket strings is chronological (ISO hour format)
    let latestBucket = '';
    for (const bucket of _store.keys()) {
        if (bucket > latestBucket) latestBucket = bucket;
    }
    return _store.get(latestBucket) ?? null;
}

function diff_snapshots(a, b) {
    const snapA = typeof a === 'string' ? _store.get(a) : a;
    const snapB = typeof b === 'string' ? _store.get(b) : b;
    if (!snapA || !snapB) {
        const reason = !snapA ? 'snapshot_a_not_found' : 'snapshot_b_not_found';
        return Object.freeze({ status: 'DIFF_INCOMPLETE', reason, change_vector: null });
    }

    const cv        = _computeChangeVector(snapA, snapB.modules ?? [], snapB.edges ?? []);
    const magnitude = _magnitude(cv);

    return Object.freeze({
        status:                'DIFF_COMPLETE',
        from_bucket:           snapA.timestamp_bucket,
        to_bucket:             snapB.timestamp_bucket,
        from_snapshot_id:      snapA.snapshot_id,
        to_snapshot_id:        snapB.snapshot_id,
        change_vector:         cv,
        change_magnitude:      magnitude,
        registry_hash_changed: snapA.registry_hash !== snapB.registry_hash,
        graph_hash_changed:    snapA.graph_hash    !== snapB.graph_hash,
        module_set_changed:    snapA.module_set_hash !== snapB.module_set_hash,
    });
}

function reconstruct_timeline(start, end) {
    if (!start || !end) {
        return Object.freeze({ status: 'TIMELINE_INCOMPLETE', reason: 'missing_bounds', snapshots: Object.freeze([]) });
    }

    const snapshots = [];
    for (const [bucket, snap] of _store) {
        if (bucket >= start && bucket <= end) snapshots.push(snap);
    }
    snapshots.sort((a, b) => a.timestamp_bucket.localeCompare(b.timestamp_bucket));

    return Object.freeze({
        status:         snapshots.length > 0 ? 'TIMELINE_COMPLETE' : 'TIMELINE_EMPTY',
        start_bucket:   start,
        end_bucket:     end,
        snapshot_count: snapshots.length,
        snapshots:      Object.freeze(snapshots),
    });
}

module.exports = { create_snapshot, get_snapshot, get_latest_snapshot, diff_snapshots, reconstruct_timeline };
