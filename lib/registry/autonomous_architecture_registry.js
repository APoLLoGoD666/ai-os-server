'use strict';

// Autonomous Architecture Registry V1 — Structural Discoverability
// Indexes every architecture layer. Canonical read surface only.
// Describe only. NO execution. NO mutation. NO runtime influence.
// I3: same architecture → same registry always. Built once at require() time.

const crypto = require('crypto');

const REGISTRY_VERSION = '1.0.0';

// ── Task 1: Module definitions ────────────────────────────────────────────────
// Static metadata only. No imports from runtime execution modules.

const _DEFS = [
    {
        module_id:       'mod-execution',
        module_name:     'Execution Engine',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'server.js',
        upstream:        [],
        downstream:      ['mod-reality-loop'],
        authority_level: 'EXECUTE',
        immutability:    false,
        determinism:     'PROBABILISTIC',
        explainability:  'MEDIUM',
        runtime_access:  'READ_WRITE',
        description:     'Primary execution authority. Runs agent tasks, chat, and scheduled operations.',
    },
    {
        module_id:       'mod-reality-loop',
        module_name:     'Reality Loop',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/reality/reality_loop.js',
        upstream:        ['mod-execution'],
        downstream:      ['mod-truth-injection'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'APPEND_ONLY',
        description:     'Observational pipeline. Computes drift score and outcome attribution. CLASS 3.',
    },
    {
        module_id:       'mod-truth-injection',
        module_name:     'Truth Injection Contract',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/learning/truth_injection_contract.js',
        upstream:        ['mod-reality-loop'],
        downstream:      ['mod-system-snapshot'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'APPEND_ONLY',
        description:     'Deterministic transform from RealityLoopOutput to StructuredLearningSignal.',
    },
    {
        module_id:       'mod-system-snapshot',
        module_name:     'System Snapshot',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/state/system_snapshot.js',
        upstream:        ['mod-truth-injection'],
        downstream:      ['mod-state-replay'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Pure read model. Deterministic projection of caller-supplied subsystem states.',
    },
    {
        module_id:       'mod-state-replay',
        module_name:     'State Replay',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/state/state_replay.js',
        upstream:        ['mod-system-snapshot'],
        downstream:      ['mod-scenario-simulator'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Rebuilds historical SystemSnapshot from recorded event outputs. COMPLETE/PARTIAL/DEGRADED.',
    },
    {
        module_id:       'mod-scenario-simulator',
        module_name:     'Scenario Simulator',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/simulation/scenario_simulator.js',
        upstream:        ['mod-state-replay'],
        downstream:      ['mod-decision-ledger'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Counterfactual evaluation engine. Projects hypothetical inputs against baseline.',
    },
    {
        module_id:       'mod-decision-ledger',
        module_name:     'Decision Ledger',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/audit/decision_ledger.js',
        upstream:        ['mod-scenario-simulator'],
        downstream:      ['mod-evolution-contract'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'APPEND_ONLY',
        description:     'Immutable execution provenance. Append-only audit record created after execution.',
    },
    {
        module_id:       'mod-evolution-contract',
        module_name:     'Evolution Contract',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/evolution/evolution_contract.js',
        upstream:        ['mod-decision-ledger'],
        downstream:      ['mod-change-admission-gate'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Controlled architectural evolution evaluation. EVALUATED/REJECTED/INCOMPATIBLE/INVALID.',
    },
    {
        module_id:       'mod-change-admission-gate',
        module_name:     'Change Admission Gate',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/evolution/change_admission_gate.js',
        upstream:        ['mod-evolution-contract'],
        downstream:      ['mod-system-integrity-manifest'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Structural acceptance contract. ACCEPT/REVIEW/REJECT/INVALID across 5 dimensions.',
    },
    {
        module_id:       'mod-system-integrity-manifest',
        module_name:     'System Integrity Manifest',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/integrity/system_integrity_manifest.js',
        upstream:        ['mod-change-admission-gate'],
        downstream:      ['mod-execution-certification'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Architectural closure proof. Reproducible immutable 10-module system representation.',
    },
    {
        module_id:       'mod-execution-certification',
        module_name:     'Execution Certification Engine',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/certification/execution_certification_engine.js',
        upstream:        ['mod-system-integrity-manifest'],
        downstream:      ['mod-deployment-covenant'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Runtime certification across 7 dimensions. CERTIFIED/CONDITIONAL/UNCERTIFIED.',
    },
    {
        module_id:       'mod-deployment-covenant',
        module_name:     'Deployment Covenant',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/deployment/deployment_covenant.js',
        upstream:        ['mod-execution-certification'],
        downstream:      ['mod-architecture-registry'],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Deployment eligibility evaluation across 7 trust dimensions. DEPLOYABLE/CONDITIONAL/NOT_DEPLOYABLE.',
    },
    {
        module_id:       'mod-architecture-registry',
        module_name:     'Autonomous Architecture Registry',
        version:         '1.0.0',
        status:          'ACTIVE',
        file_path:       'lib/registry/autonomous_architecture_registry.js',
        upstream:        ['mod-deployment-covenant'],
        downstream:      [],
        authority_level: 'NONE',
        immutability:    true,
        determinism:     'FULL',
        explainability:  'HIGH',
        runtime_access:  'NONE',
        description:     'Canonical read surface. Indexes and exposes every architecture layer. Terminus.',
    },
];

const EXPECTED_COUNT = _DEFS.length; // 13

// ── Task 3: Registry hash ──────────────────────────────────────────────────────
// Timestamps excluded. Same architecture → same registry_hash always (I3).

function _computeRegistryHash(defs) {
    const ids      = defs.map(d => d.module_id).join('|');
    const versions = defs.map(d => d.version).join('|');
    const edges    = defs
        .flatMap(d => d.downstream.map(to => `${d.module_id}->${to}`))
        .sort()
        .join('|');
    const raw = [ids, versions, edges].join('::');
    return 'rh-' + crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Task 2: Graph construction ────────────────────────────────────────────────
// Forward-only. No cycles. Orphan detection via BFS.

function _buildGraph(defs) {
    const nodeMap = new Map(defs.map(d => [d.module_id, d]));
    const edges   = [];
    for (const d of defs) {
        for (const to of d.downstream) {
            edges.push(Object.freeze({ from: d.module_id, to }));
        }
    }

    // BFS from root (mod-execution) to detect reachable nodes
    const reachable = new Set();
    const queue     = ['mod-execution'];
    while (queue.length > 0) {
        const cur = queue.shift();
        if (reachable.has(cur)) continue;
        reachable.add(cur);
        const node = nodeMap.get(cur);
        if (node) for (const to of node.downstream) queue.push(to);
    }

    // Orphan: registered but not reachable from execution
    const orphans = defs.filter(d => !reachable.has(d.module_id)).map(d => d.module_id);

    // Graph health
    const graph_health =
        orphans.length === 0 && reachable.size === defs.length ? 'CONNECTED'
        : orphans.length <= 2                                   ? 'DEGRADED'
        : 'DISCONNECTED';

    return Object.freeze({
        nodes:        Object.freeze(defs.map(d => Object.freeze({ module_id: d.module_id, module_name: d.module_name }))),
        edges:        Object.freeze(edges),
        reachable:    Object.freeze([...reachable]),
        orphans:      Object.freeze(orphans),
        graph_health,
        edge_count:   edges.length,
        node_count:   defs.length,
    });
}

// ── Task 4: Structure health ──────────────────────────────────────────────────

function _structureHealth(registeredCount) {
    const ratio = registeredCount / EXPECTED_COUNT;
    if (ratio >= 1.0)  return { status: 'COMPLETE',    ratio: parseFloat(ratio.toFixed(3)) };
    if (ratio >= 0.80) return { status: 'PARTIAL',     ratio: parseFloat(ratio.toFixed(3)) };
    return              { status: 'FRAGMENTED', ratio: parseFloat(ratio.toFixed(3)) };
}

// ── Build registry (once at require() time) ───────────────────────────────────

function _buildRegistry() {
    const trace        = [];
    const anomalyFlags = [];

    try {
        trace.push('registry_initiated');

        const frozenDefs = Object.freeze(_DEFS.map(d => Object.freeze({
            ...d,
            upstream:   Object.freeze([...d.upstream]),
            downstream: Object.freeze([...d.downstream]),
        })));

        trace.push('module_definitions_loaded');

        const graph          = _buildGraph(frozenDefs);
        if (graph.orphans.length > 0) anomalyFlags.push(`ORPHAN_MODULES:${graph.orphans.join(',')}`);
        trace.push(`graph_built:nodes=${graph.node_count},edges=${graph.edge_count}`);

        const registryHash   = _computeRegistryHash(frozenDefs);
        const registryId     = 'reg-' + registryHash.slice(3, 19);
        trace.push('registry_hash_computed');

        const health         = _structureHealth(frozenDefs.length);
        trace.push(`structure_health:${health.status}`);

        // Ordered forward lineage (topological — pipeline is linear)
        const lineage = Object.freeze(frozenDefs.map((d, i) => Object.freeze({
            position:  i + 1,
            module_id: d.module_id,
            name:      d.module_name,
            upstream:  d.upstream,
            downstream: d.downstream,
        })));

        const registry = Object.freeze({
            registry_id:       registryId,
            registry_version:  REGISTRY_VERSION,
            registry_hash:     registryHash,
            structure_health:  health.status,
            coverage_ratio:    health.ratio,
            graph_health:      graph.graph_health,
            module_count:      frozenDefs.length,
            expected_count:    EXPECTED_COUNT,
            modules:           frozenDefs,
            graph,
            lineage,
            anomaly_flags:     Object.freeze([...anomalyFlags]),
            trace:             Object.freeze([...trace, 'registry_sealed']),
            confidence:        graph.graph_health === 'CONNECTED' && health.status === 'COMPLETE' ? 1.0 : 0.70,
        });

        // Task 7: Observability log — no behavioural effect
        console.log(
            `[AutonomousArchitectureRegistry] id=${registryId} hash=${registryHash.slice(0, 26)}...` +
            ` modules=${frozenDefs.length}/${EXPECTED_COUNT} health=${health.status}` +
            ` graph=${graph.graph_health} orphans=${graph.orphans.length}`
        );

        return registry;

    } catch (_) {
        // Task 6: failure contract — never halt, never retry
        const fallbackId = 'reg-' + crypto.createHash('sha256').update('REGISTRY_INCOMPLETE').digest('hex').slice(0, 16);
        const fallback = Object.freeze({
            registry_id:      fallbackId,
            registry_version: REGISTRY_VERSION,
            registry_hash:    null,
            structure_health: 'FRAGMENTED',
            coverage_ratio:   0,
            graph_health:     'DISCONNECTED',
            module_count:     0,
            expected_count:   EXPECTED_COUNT,
            modules:          Object.freeze([]),
            graph:            Object.freeze({ nodes: Object.freeze([]), edges: Object.freeze([]), orphans: Object.freeze([]), graph_health: 'DISCONNECTED', reachable: Object.freeze([]), edge_count: 0, node_count: 0 }),
            lineage:          Object.freeze([]),
            anomaly_flags:    Object.freeze(['REGISTRY_BUILD_FAILED']),
            trace:            Object.freeze(['registry_initiated', 'registry_incomplete']),
            confidence:       0.10,
        });
        console.log(`[AutonomousArchitectureRegistry] id=${fallbackId} state=REGISTRY_INCOMPLETE`);
        return fallback;
    }
}

// Built once at require() time — immutable thereafter (I3)
const _REGISTRY = _buildRegistry();

// ── Task 5: Query contract ─────────────────────────────────────────────────────
// Read-only. Frozen output. No mutation.

function get_registry() {
    return _REGISTRY;
}

function get_module(id) {
    if (!id) return null;
    return _REGISTRY.modules.find(m => m.module_id === id) ?? null;
}

function get_lineage() {
    return _REGISTRY.lineage;
}

function validate_registry() {
    const reg = _REGISTRY;
    if (!reg.registry_hash || !reg.registry_id) {
        return { status: 'INVALID', reason: 'missing_hash_or_id', registry_id: null };
    }

    // Recompute hash from current definitions (same source → same hash)
    const recomputed = _computeRegistryHash(reg.modules);
    if (recomputed !== reg.registry_hash) {
        return {
            status:    'INVALID',
            reason:    'hash_mismatch',
            expected:  recomputed.slice(0, 26) + '...',
            found:     reg.registry_hash.slice(0, 26) + '...',
        };
    }

    // Verify id derivation
    const expectedId = 'reg-' + reg.registry_hash.slice(3, 19);
    if (expectedId !== reg.registry_id) {
        return { status: 'INVALID', reason: 'id_mismatch', expected: expectedId, found: reg.registry_id };
    }

    const issues = [];
    if (reg.graph.orphans.length > 0) issues.push(`orphan_modules:${reg.graph.orphans.join(',')}`);
    if (reg.module_count < EXPECTED_COUNT) issues.push(`module_count_mismatch:${reg.module_count}/${EXPECTED_COUNT}`);
    if (reg.graph.graph_health !== 'CONNECTED') issues.push(`graph_degraded:${reg.graph.graph_health}`);

    return {
        status:            issues.length === 0 ? 'VALID' : 'PARTIAL',
        registry_id:       reg.registry_id,
        registry_hash:     reg.registry_hash,
        module_count:      reg.module_count,
        graph_health:      reg.graph.graph_health,
        structure_health:  reg.structure_health,
        issues,
    };
}

module.exports = { get_registry, get_module, get_lineage, validate_registry };
