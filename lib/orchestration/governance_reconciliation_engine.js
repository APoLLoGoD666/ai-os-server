'use strict';

// Governance Reconciliation Engine V2 — Cross-Layer Event Consistency Verifier
// 4-layer reconciliation: BUS > STORE > BROKER > CORRELATION (priority order)
// Produces ReconciliationReport with field_level_diff per conflicting field.
// Deterministic. Read-only. Never throws.

const bus         = require('./governance_event_bus');
const store       = require('./governance_event_store');
const correlation = require('./governance_event_correlation_engine');
const nodeReg     = require('./governance_node_registry');
const unified     = require('./governance_event_unified_model');

// ── Priority chain ────────────────────────────────────────────────────────────
// BUS > STORE > BROKER > CORRELATION

function _selectAuthoritativeSource(foundBus, foundStore, foundBroker, foundCorrelation) {
    if (foundBus)         return 'BUS';
    if (foundStore)       return 'STORE';
    if (foundBroker)      return 'BROKER';
    if (foundCorrelation) return 'CORRELATION';
    return null;
}

// ── _fieldLevelDiff ───────────────────────────────────────────────────────────
// Compares per-layer normalized events. Returns:
//   { field: { BUS: val, STORE: val, BROKER: val, CORRELATION: val } }
// Only includes fields where at least two non-null layers differ.

const _DIFF_FIELDS = ['event_type', 'execution_id', 'emitted_at', 'schema_status', 'fingerprint', 'broker_status', 'node_id'];

function _fieldLevelDiff(layerNorms) {
    const diff = {};
    for (const field of _DIFF_FIELDS) {
        const values = {};
        for (const [layer, norm] of Object.entries(layerNorms)) {
            if (norm) values[layer] = norm[field] ?? null;
        }
        const nonNull  = Object.values(values).filter(v => v != null);
        const distinct = new Set(nonNull);
        if (distinct.size > 1) diff[field] = Object.freeze(values);
    }
    return Object.freeze(diff);
}

// ── reconcile_event_across_layers ─────────────────────────────────────────────
// 4-layer reconciliation per fingerprint.

function reconcile_event_across_layers(fingerprint) {
    if (!fingerprint) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'missing_fingerprint' });
    }
    try {
        // Layer 1: BUS
        const busMatches   = bus.get_log().filter(e => e.fingerprint === fingerprint);
        const found_in_bus = busMatches.length > 0;
        const busEvent     = found_in_bus ? busMatches[0] : null;

        // Layer 2: STORE
        const storeMatches   = store.load_all().filter(e => e.fingerprint === fingerprint);
        const found_in_store = storeMatches.length > 0;
        const storeEvent     = found_in_store ? storeMatches[0] : null;

        // Layer 3: BROKER — inferred from bus event's broker_status
        // Event reached broker if broker_status is BROKERED (not LOCAL_ONLY / BROKER_FAILED)
        const found_in_broker = found_in_bus && (busEvent.broker_status === 'BROKERED');

        // Layer 4: CORRELATION — run correlation engine on the execution's events
        const execId = busEvent?.payload?.execution_id ?? storeEvent?.payload?.execution_id ?? null;
        let found_in_correlation = false;
        let correlationRef = null;
        if (execId) {
            try {
                const allExecEvents = [
                    ...bus.get_log().filter(e => e.payload?.execution_id === execId),
                    ...store.load_all().filter(e => e.payload?.execution_id === execId),
                ];
                const correlResult = correlation.correlate_events(allExecEvents);
                // Correlation "found" means the execution was classifiable (not BROKEN)
                const summary = correlResult?.summary ?? correlResult;
                found_in_correlation = summary?.classification !== 'BROKEN' &&
                                       summary?.classification != null;
                correlationRef = summary?.classification ?? null;
            } catch (_) {}
        }

        // Build missing_layers list
        const missing_layers = [];
        if (!found_in_bus)         missing_layers.push('BUS');
        if (!found_in_store)       missing_layers.push('STORE');
        if (!found_in_broker)      missing_layers.push('BROKER');
        if (!found_in_correlation) missing_layers.push('CORRELATION');

        // Authoritative source (priority: BUS > STORE > BROKER > CORRELATION)
        const authoritative_source = _selectAuthoritativeSource(
            found_in_bus, found_in_store, found_in_broker, found_in_correlation
        );

        if (!found_in_bus && !found_in_store && !found_in_broker && !found_in_correlation) {
            return Object.freeze({
                status:               'RECONCILIATION_COMPLETE',
                fingerprint,
                found_in_bus:         false,
                found_in_store:       false,
                found_in_broker:      false,
                found_in_correlation: false,
                missing_layers:       Object.freeze(missing_layers),
                conflicting_fields:   Object.freeze([]),
                field_level_diff:     Object.freeze({}),
                authoritative_source: null,
                divergence_type:      'CRITICAL',
                consistency_score:    0,
            });
        }

        // Normalize per layer for comparison
        const busNorm   = busEvent   ? unified.normalize_event_strict(busEvent)   : null;
        const storeNorm = storeEvent ? unified.normalize_event_strict(storeEvent) : null;

        const layerNorms = {
            BUS:         busNorm,
            STORE:       storeNorm,
            BROKER:      found_in_broker ? busNorm : null,     // broker carries same event data
            CORRELATION: found_in_correlation ? busNorm : null, // ref only
        };

        const field_level_diff  = _fieldLevelDiff(layerNorms);
        const conflicting_fields = Object.freeze(Object.keys(field_level_diff));

        const layersPresent = [found_in_bus, found_in_store, found_in_broker, found_in_correlation].filter(Boolean).length;
        const consistency_score = parseFloat(
            (layersPresent === 4 && conflicting_fields.length === 0 ? 1.0 :
             layersPresent === 4 && conflicting_fields.length > 0   ? 0.70 :
             layersPresent >= 2 && conflicting_fields.length === 0  ? 0.75 :
             layersPresent >= 2 && conflicting_fields.length > 0    ? 0.45 :
             layersPresent === 1                                     ? 0.25 : 0.0).toFixed(3)
        );

        const divergence_type =
            consistency_score >= 0.90 ? 'NONE'    :
            consistency_score >= 0.40 ? 'PARTIAL' : 'CRITICAL';

        return Object.freeze({
            status:               'RECONCILIATION_COMPLETE',
            fingerprint,
            found_in_bus,
            found_in_store,
            found_in_broker,
            found_in_correlation,
            missing_layers:       Object.freeze(missing_layers),
            conflicting_fields,
            field_level_diff,
            authoritative_source,
            divergence_type,
            consistency_score,
            correlation_classification: correlationRef,
        });

    } catch (_) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'reconcile_event_error', fingerprint });
    }
}

// ── reconcile_execution_across_layers ─────────────────────────────────────────

function reconcile_execution_across_layers(execution_id) {
    if (!execution_id) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'missing_execution_id' });
    }
    try {
        const busEvents   = bus.get_log().filter(e => e.payload?.execution_id === execution_id);
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
            const busNorm   = unified.normalize_event_strict(b);
            const storeNorm = unified.normalize_event_strict(s);
            const diff      = _fieldLevelDiff({ BUS: busNorm, STORE: storeNorm });
            if (Object.keys(diff).length > 0) {
                conflictCount++;
                Object.keys(diff).forEach(f => conflicting_fields_all.add(f));
            }
        }

        const total = fpMap.size;
        const clean = total - conflictCount - missingCount;
        const consistency_score = total > 0
            ? parseFloat(((clean + missingCount * 0.5) / total).toFixed(3))
            : 1.0;

        const divergence_type =
            consistency_score >= 0.95 ? 'NONE'    :
            consistency_score >= 0.60 ? 'PARTIAL' : 'CRITICAL';

        // Authoritative: BUS unless it has fewer events than STORE
        const authoritative_source = busEvents.length >= storeEvents.length ? 'BUS' : 'STORE';

        const topology           = nodeReg.compute_cluster_topology();
        const known_node_ids     = nodeReg.get_active_nodes().map(n => n.node_id);
        const event_node_ids     = [...new Set(
            [...busEvents, ...storeEvents]
                .map(e => e.node_id ?? e.broker_meta?.node_id ?? e.payload?._meta?.node_id)
                .filter(Boolean)
        )];
        const unregistered_nodes = event_node_ids.filter(id => !known_node_ids.includes(id));

        // Correlation pass
        const allEvents    = [...new Map([...busEvents, ...storeEvents].map(e => [e.fingerprint ?? e.emitted_at, e])).values()];
        const correlResult = correlation.correlate_events(allEvents);
        const summary      = correlResult?.summary ?? correlResult;

        return Object.freeze({
            status:                     'RECONCILIATION_COMPLETE',
            execution_id,
            bus_event_count:            busEvents.length,
            store_event_count:          storeEvents.length,
            unique_fingerprints:        total,
            conflicting_events:         conflictCount,
            missing_layer_events:       missingCount,
            conflicting_fields:         Object.freeze([...conflicting_fields_all]),
            consistency_score,
            divergence_type,
            authoritative_source,
            unregistered_nodes:         Object.freeze(unregistered_nodes),
            active_node_count:          topology.active_nodes,
            correlation_classification: summary?.classification ?? 'UNKNOWN',
        });

    } catch (_) {
        return Object.freeze({ status: 'RECONCILIATION_INCOMPLETE', reason: 'reconcile_execution_error', execution_id });
    }
}

// ── detect_layer_divergence ───────────────────────────────────────────────────

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
            consistency_score >= 0.95 ? 'NONE'    :
            consistency_score >= 0.60 ? 'PARTIAL' : 'CRITICAL';

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
