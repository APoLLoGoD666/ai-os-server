'use strict';

// Governance Reconciliation Engine V1 — Cross-Layer Event Consistency Verifier
// Compares bus, store, broker metadata, correlation engine, and node registry.
// Determines authoritative source and surfaces divergence per event / execution.
// Deterministic. Read-only. Never throws.

const bus         = require('./governance_event_bus');
const store       = require('./governance_event_store');
const correlation = require('./governance_event_correlation_engine');
const nodeReg     = require('./governance_node_registry');
const unified     = require('./governance_event_unified_model');

// ── _fieldConflicts ───────────────────────────────────────────────────────────
// Returns list of field names that differ across two normalized events.

function _fieldConflicts(a, b) {
    const COMPARE = ['event_type', 'execution_id', 'emitted_at', 'schema_status', 'fingerprint', 'broker_status'];
    const conflicts = [];
    for (const f of COMPARE) {
        if (a[f] != null && b[f] != null && a[f] !== b[f]) conflicts.push(f);
    }
    return conflicts;
}

// ── reconcile_event_across_layers ─────────────────────────────────────────────
// Looks up a single event by fingerprint in bus + store. Checks field alignment.

function reconcile_event_across_layers(fingerprint) {
    if (!fingerprint) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'missing_fingerprint' });
    }
    try {
        const busEvents   = bus.get_log().filter(e => e.fingerprint === fingerprint);
        const storeEvents = store.load_all().filter(e => e.fingerprint === fingerprint);

        const found_in_bus   = busEvents.length > 0;
        const found_in_store = storeEvents.length > 0;
        const missing_layers = [];
        if (!found_in_bus)   missing_layers.push('bus');
        if (!found_in_store) missing_layers.push('store');

        if (!found_in_bus && !found_in_store) {
            return Object.freeze({
                status:             'RECONCILIATION_COMPLETE',
                fingerprint,
                found_in_bus:       false,
                found_in_store:     false,
                missing_layers:     Object.freeze(missing_layers),
                conflicting_fields: Object.freeze([]),
                authoritative_source: null,
                divergence_type:    'CRITICAL',
                consistency_score:  0,
            });
        }

        // Normalize both sides and compare fields
        const busNorm   = found_in_bus   ? unified.normalize(busEvents[0])   : null;
        const storeNorm = found_in_store ? unified.normalize(storeEvents[0]) : null;

        let conflicting_fields = [];
        if (busNorm && storeNorm) {
            conflicting_fields = _fieldConflicts(busNorm, storeNorm);
        }

        const authoritative_source = found_in_bus ? 'bus' : 'store';
        const divergence_type =
            missing_layers.length === 0 && conflicting_fields.length === 0 ? 'NONE'    :
            conflicting_fields.length > 0                                   ? 'PARTIAL' : 'NONE';

        const consistency_score = parseFloat(
            (missing_layers.length === 0 && conflicting_fields.length === 0 ? 1.0 :
             missing_layers.length > 0 && !found_in_bus && !found_in_store  ? 0.0 :
             missing_layers.length > 0                                       ? 0.5 : 0.7).toFixed(3)
        );

        return Object.freeze({
            status:               'RECONCILIATION_COMPLETE',
            fingerprint,
            found_in_bus,
            found_in_store,
            missing_layers:       Object.freeze(missing_layers),
            conflicting_fields:   Object.freeze(conflicting_fields),
            authoritative_source,
            divergence_type,
            consistency_score,
        });

    } catch (_) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'reconcile_event_error', fingerprint });
    }
}

// ── reconcile_execution_across_layers ─────────────────────────────────────────
// Full cross-layer reconciliation for all events under one execution_id.

function reconcile_execution_across_layers(execution_id) {
    if (!execution_id) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'missing_execution_id' });
    }
    try {
        const busEvents   = bus.get_log(execution_id)    ?? [];
        const storeEvents = store.load_events(execution_id) ?? [];

        // Dedup union by fingerprint
        const fpMap = new Map();
        for (const e of busEvents)   fpMap.set(e.fingerprint ?? `bus-${e.seq}`,   { bus: e, store: null });
        for (const e of storeEvents) {
            const key = e.fingerprint ?? `store-${e.emitted_at}`;
            if (fpMap.has(key)) fpMap.get(key).store = e;
            else fpMap.set(key, { bus: null, store: e });
        }

        let conflictCount = 0;
        let missingCount  = 0;
        const conflicting_fields_all = new Set();

        for (const { bus: b, store: s } of fpMap.values()) {
            if (!b || !s) { missingCount++; continue; }
            const conflicts = _fieldConflicts(unified.normalize(b), unified.normalize(s));
            if (conflicts.length > 0) {
                conflictCount++;
                conflicts.forEach(f => conflicting_fields_all.add(f));
            }
        }

        const total = fpMap.size;
        const clean = total - conflictCount - missingCount;
        const consistency_score = total > 0
            ? parseFloat(((clean + missingCount * 0.5) / total).toFixed(3))
            : 1.0;

        const divergence_type =
            consistency_score >= 0.95 ? 'NONE'     :
            consistency_score >= 0.60 ? 'PARTIAL'  : 'CRITICAL';

        // Cross-reference with active node topology
        const topology        = nodeReg.compute_cluster_topology();
        const known_node_ids  = nodeReg.get_active_nodes().map(n => n.node_id);
        const event_node_ids  = [...new Set(
            [...busEvents, ...storeEvents].map(e => e.node_id ?? e.broker_meta?.node_id ?? e.payload?._meta?.node_id).filter(Boolean)
        )];
        const unregistered_nodes = event_node_ids.filter(id => !known_node_ids.includes(id));

        // Correlation engine pass
        const allEvents      = [...new Set([...busEvents, ...storeEvents].map(e => JSON.stringify(e)))].map(s => JSON.parse(s));
        const correlReport   = correlation.correlate_events(allEvents);
        const execReport     = correlReport.per_execution?.get
            ? correlReport.per_execution.get(execution_id) ?? null
            : null;

        return Object.freeze({
            status:               'RECONCILIATION_COMPLETE',
            execution_id,
            bus_event_count:      busEvents.length,
            store_event_count:    storeEvents.length,
            unique_fingerprints:  total,
            conflicting_events:   conflictCount,
            missing_layer_events: missingCount,
            conflicting_fields:   Object.freeze([...conflicting_fields_all]),
            consistency_score,
            divergence_type,
            authoritative_source: busEvents.length >= storeEvents.length ? 'bus' : 'store',
            unregistered_nodes:   Object.freeze(unregistered_nodes),
            active_node_count:    topology.active_nodes,
            correlation_classification: execReport?.classification ?? correlReport?.summary?.classification ?? 'UNKNOWN',
        });

    } catch (_) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'reconcile_execution_error', execution_id });
    }
}

// ── detect_layer_divergence ───────────────────────────────────────────────────
// Scans all events across bus + store. Returns a divergence summary across the
// entire system — fingerprints present in one layer but not the other.

function detect_layer_divergence() {
    try {
        const busAll   = bus.get_log();
        const storeAll = store.load_all();

        const busFps   = new Set(busAll.map(e => e.fingerprint).filter(Boolean));
        const storeFps = new Set(storeAll.map(e => e.fingerprint).filter(Boolean));

        const only_in_bus   = [...busFps].filter(fp => !storeFps.has(fp));
        const only_in_store = [...storeFps].filter(fp => !busFps.has(fp));
        const in_both       = [...busFps].filter(fp => storeFps.has(fp));

        const totalUnion = busFps.size + storeFps.size - in_both.length;
        const consistency_score = totalUnion > 0
            ? parseFloat((in_both.length / totalUnion).toFixed(3))
            : 1.0;

        const divergence_type =
            consistency_score >= 0.95 ? 'NONE'     :
            consistency_score >= 0.60 ? 'PARTIAL'  : 'CRITICAL';

        // Broker failure cross-check
        const brokerFailed = busAll.filter(e => e.broker_status === 'BROKER_FAILED').length;
        const brokerFailRate = busAll.length > 0
            ? parseFloat((brokerFailed / busAll.length).toFixed(3))
            : 0;

        return Object.freeze({
            status:                'DIVERGENCE_DETECTED',
            total_bus_events:      busAll.length,
            total_store_events:    storeAll.length,
            fingerprints_in_bus:   busFps.size,
            fingerprints_in_store: storeFps.size,
            only_in_bus_count:     only_in_bus.length,
            only_in_store_count:   only_in_store.length,
            shared_count:          in_both.length,
            consistency_score,
            divergence_type,
            broker_failure_rate:   brokerFailRate,
            generated_at:          new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'detect_divergence_error' });
    }
}

module.exports = { reconcile_event_across_layers, reconcile_execution_across_layers, detect_layer_divergence };
