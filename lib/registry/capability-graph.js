'use strict';
// lib/registry/capability-graph.js — Capabilities as first-class graph nodes
//
// Promotes capabilities.json definitions into the live entity + relationship graph.
// On inject(), each capability becomes a CAP-NNNNNN entity in the engine, and
// implemented_by edges connect it to all its ENT-* dependencies.
//
// After injection, ALL existing graph operations work on capabilities for free:
//   engine.lookup('CAP-000001')               → capability entity
//   engine.find({ family: 'CAPABILITY' })      → all 8 capability nodes
//   impact.analyze('ENT-000388', ...)          → CAP-* appear in blast radius
//   relationships.graph('CAP-000001', 2)       → traverses to ENT-* deps
//   engine.search('constitutional governance') → finds CAP-000001
//
// CAP-* IDs are stable: sorted alphabetically by capability key, zero-padded.
// CAP-000001 = agent_system, CAP-000002 = ai_reasoning, ... (alphabetical)

const CAPS = require('./capabilities.json');

// ── Stable ID assignment ───────────────────────────────────────────────────────

const _CAP_KEYS  = Object.keys(CAPS).sort();
const _KEY_TO_ID = {};
const _ID_TO_KEY = {};

_CAP_KEYS.forEach((key, i) => {
    const id = `CAP-${String(i + 1).padStart(6, '0')}`;
    _KEY_TO_ID[key] = id;
    _ID_TO_KEY[id]  = key;
});

// ── Public helpers ─────────────────────────────────────────────────────────────

/** Return CAP-NNNNNN for a capability key (e.g. 'authentication' → 'CAP-000002') */
function capabilityId(capKey)  { return _KEY_TO_ID[capKey] || null; }

/** Return capability key for a CAP-NNNNNN ID */
function capabilityKey(capId)  { return _ID_TO_KEY[capId]  || null; }

/** Return all CAP-* IDs */
function allCapabilityIds()    { return Object.values(_KEY_TO_ID); }

/** Return true if id is a CAP-* synthetic node */
function isCapabilityNode(id)  { return typeof id === 'string' && id.startsWith('CAP-'); }

// ── Injection ─────────────────────────────────────────────────────────────────

let _injected = false;

/**
 * Inject CAP-* entities and implemented_by edges into the live graph.
 * Idempotent — runs only once per process.
 *
 * Called automatically from lib/registry/index.js after all modules load.
 */
function inject() {
    if (_injected) return;
    _injected = true;

    const engine = require('./engine');
    const rels   = require('./relationships');
    const caps   = require('./capabilities');

    // Build synthetic entity objects with full field parity to ENT-* entities
    const syntheticEntities = [];
    for (const [key, cap] of Object.entries(CAPS)) {
        const id     = _KEY_TO_ID[key];
        const status = caps.statusOf(key);
        syntheticEntities.push({
            id,
            name:        cap.name,
            family:      'CAPABILITY',
            type:        'CAPABILITY',
            criticality: cap.criticality,
            status:      status?.status || 'UNKNOWN',
            lifecycle:   cap.lifecycle  || 'ACTIVE',
            owner:       cap.owner      || null,
            description: cap.description,
            purpose:     cap.description,    // mirrors ENT-* purpose field for search compatibility
            arch_refs:   cap.arch_refs || [],
            path:        null,
            block:       null,
            confidence:  1.0,
            _synthetic:  true,
            _cap_key:    key,
        });
    }

    engine.inject(syntheticEntities);

    // Add implemented_by edges: CAP-* → ENT-*
    // These flow into impact._buildGraph() via rels.all() on first analyze() call.
    for (const [key, cap] of Object.entries(CAPS)) {
        const fromId = _KEY_TO_ID[key];
        if (!fromId) continue;
        for (const dep of cap.depends_on) {
            try {
                rels.add(
                    fromId,
                    dep.id,
                    'implemented_by',
                    `${cap.name} implemented by ${dep.id}`,
                    dep.strength,
                    dep.reason,
                );
            } catch (_) {}
        }
    }
}

module.exports = { capabilityId, capabilityKey, allCapabilityIds, isCapabilityNode, inject };
