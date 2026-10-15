'use strict';
// lib/registry/facts.js — Explicit Fact / Inference Separation
//
// Every data type in the architecture has a distinct epistemic status.
// This module defines those types so consumers can distinguish ground truth
// from derived computation, and computation from probabilistic inference.
//
// Layer hierarchy (ascending order of inference):
//
//   CANONICAL_FACT    Registry catalogue (engine.js)
//                     — static ground truth, never computed, manually curated
//
//   OBSERVED_FACT     Projection checks, discovered relationships
//                     — read from real artifacts at process time
//
//   COMPUTED_STATE    Digital Twin, health scores, temporal history
//                     — deterministically derived from observations
//
//   GRAPH_TRAVERSAL   Impact analysis, blast radius
//                     — deterministic computation on the relationship graph
//
//   CAPABILITY        Capability model status
//                     — declarative definitions + computed entity health
//
//   POLICY            Constraint evaluation
//                     — rule-based judgement against observed state
//
//   INFERENCE         Scenario simulation, prediction
//                     — probabilistic reasoning about hypotheticals
//
// Rule: never treat a higher layer as a lower layer.
//   Impact reports must not be stored as canonical facts.
//   Scenario results must never drive constraint enforcement.
//   Inferred data must be explicitly marked before being surfaced.

const LAYERS = Object.freeze({
    CANONICAL_FACT:  { name: 'canonical_fact',  freshness: 'static',       confidence: 1.00, mutable: false, warning: null },
    OBSERVED_FACT:   { name: 'observed_fact',   freshness: 'process-time', confidence: 0.90, mutable: true,  warning: null },
    COMPUTED_STATE:  { name: 'computed_state',  freshness: 'on-demand',    confidence: 0.85, mutable: true,  warning: null },
    GRAPH_TRAVERSAL: { name: 'graph_traversal', freshness: 'on-demand',    confidence: 0.95, mutable: true,  warning: null },
    CAPABILITY:      { name: 'capability',      freshness: 'on-demand',    confidence: 0.90, mutable: true,  warning: null },
    POLICY:          { name: 'policy',          freshness: 'on-demand',    confidence: 1.00, mutable: false, warning: null },
    INFERENCE:       { name: 'inference',       freshness: 'on-demand',    confidence: 0.80, mutable: true,
                       warning: 'Probabilistic result. Do not treat as ground truth or use to drive policy.' },
});

// Maps every registered intent to its data layer.
// This is the authoritative source — query.js reads from here to tag responses.
const INTENT_LAYERS = {
    // entity.* — canonical registry data
    'entity.lookup':             'CANONICAL_FACT',
    'entity.search':             'CANONICAL_FACT',
    'entity.find':               'CANONICAL_FACT',
    'entity.stats':              'CANONICAL_FACT',

    // projection.* — observed from disk, git, and runtime artifacts
    'projection.check':          'OBSERVED_FACT',
    'projection.physical':       'OBSERVED_FACT',
    'projection.rules':          'CANONICAL_FACT',

    // relationship.* — observed from code, SQL, and docs
    'relationship.graph':        'OBSERVED_FACT',
    'relationship.of':           'OBSERVED_FACT',
    'relationship.discover':     'OBSERVED_FACT',

    // impact.* — deterministic graph traversal
    'impact.analyze':            'GRAPH_TRAVERSAL',
    'impact.quickrisk':          'GRAPH_TRAVERSAL',

    // twin.* — computed from observations
    'twin.state':                'COMPUTED_STATE',

    // temporal.* — computed from stored history
    'temporal.diff':             'COMPUTED_STATE',
    'temporal.timeline':         'COMPUTED_STATE',
    'temporal.trend':            'COMPUTED_STATE',

    // snapshot.* — computed from current state, stored for later diff
    'snapshot.take':             'COMPUTED_STATE',
    'snapshot.list':             'COMPUTED_STATE',
    'snapshot.get':              'COMPUTED_STATE',
    'snapshot.diff':             'COMPUTED_STATE',

    // capability.* — declarative definitions plus computed health
    'capability.list':           'CANONICAL_FACT',
    'capability.get':            'CAPABILITY',
    'capability.status':         'CAPABILITY',
    'capability.degradation':    'CAPABILITY',

    // migration.* — observed from filesystem
    'migration.compliance':      'OBSERVED_FACT',
    'migration.scan':            'OBSERVED_FACT',
    'migration.preflight':       'POLICY',

    // simulate.* — inference (deterministic but hypothetical)
    'simulate.entity_change':    'INFERENCE',
    'simulate.migration':        'INFERENCE',

    // scenario.* — inference (probabilistic, multi-entity)
    'scenario.run':              'INFERENCE',

    // validate.* — policy evaluation and registry integrity
    'validate.registry':         'OBSERVED_FACT',
    'validate.constraints':      'POLICY',

    // composite.* — computed from multiple layers
    'composite.entity_full':       'COMPUTED_STATE',
    'composite.system_health':     'COMPUTED_STATE',
    'composite.capability_health': 'CAPABILITY',
};

/**
 * Return the layer definition for a given intent.
 * Returns null if the intent is not mapped.
 */
function layerFor(intent) {
    const key = INTENT_LAYERS[intent];
    return key ? LAYERS[key] : null;
}

/**
 * Build the _meta object for a query response envelope.
 * Attached to every response so consumers know what kind of data they received.
 *
 * @param {string} intent
 * @param {number} [overrideConfidence]  — override (used by inference results)
 * @returns {{ data_type, freshness, confidence, mutable, warning } | null}
 */
function metaFor(intent, overrideConfidence) {
    const layer = layerFor(intent);
    if (!layer) return null;
    return {
        data_type:  layer.name,
        freshness:  layer.freshness,
        confidence: overrideConfidence != null ? overrideConfidence : layer.confidence,
        mutable:    layer.mutable,
        warning:    layer.warning,
    };
}

module.exports = { LAYERS, INTENT_LAYERS, layerFor, metaFor };
