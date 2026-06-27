'use strict';

// Governance Node Registry V1 — Cluster Awareness + Heartbeat Tracking
// In-memory registry of all known nodes. Stale detection via heartbeat timeout.
// Future DB-ready: replace _nodes Map with DB-backed persistence.
// Deterministic ordering. Never throws.

const os = require('os');

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const _nodeId    = process.env.APEX_NODE_ID    ?? os.hostname() ?? 'apex-node-0';
const _regionId  = process.env.APEX_REGION_ID  ?? null;
const _clusterId = process.env.APEX_CLUSTER_ID ?? 'apex-cluster-0';
const _role      = process.env.APEX_NODE_ROLE  ?? 'executor';

const _nodes = new Map(); // node_id → frozen node record

// ── register_node ─────────────────────────────────────────────────────────────

function register_node(node_info) {
    if (!node_info?.node_id) {
        return Object.freeze({ status: 'INVALID', reason: 'missing_node_id' });
    }
    try {
        const now      = new Date().toISOString();
        const existing = _nodes.get(node_info.node_id);
        const record   = Object.freeze({
            node_id:        node_info.node_id,
            region:         node_info.region     ?? null,
            role:           node_info.role        ?? 'observer',
            cluster_id:     node_info.cluster_id  ?? _clusterId,
            last_heartbeat: now,
            registered_at:  existing?.registered_at ?? now,
            metadata:       Object.freeze({ ...(node_info.metadata ?? {}) }),
        });
        _nodes.set(node_info.node_id, record);
        return Object.freeze({ status: 'REGISTERED', node_id: node_info.node_id });
    } catch (_) {
        return Object.freeze({ status: 'REGISTER_FAILED', node_id: node_info?.node_id ?? null });
    }
}

// ── heartbeat ─────────────────────────────────────────────────────────────────

function heartbeat(node_id) {
    if (!node_id || !_nodes.has(node_id)) return false;
    try {
        const existing = _nodes.get(node_id);
        _nodes.set(node_id, Object.freeze({ ...existing, last_heartbeat: new Date().toISOString() }));
        return true;
    } catch (_) {
        return false;
    }
}

// ── get_active_nodes ──────────────────────────────────────────────────────────

function get_active_nodes() {
    try {
        const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
        return Object.freeze(
            [..._nodes.values()]
                .filter(n => new Date(n.last_heartbeat).getTime() >= cutoff)
                .sort((a, b) => a.node_id.localeCompare(b.node_id))
        );
    } catch (_) {
        return Object.freeze([]);
    }
}

// ── get_node_metadata ─────────────────────────────────────────────────────────

function get_node_metadata(node_id) {
    if (!node_id) return null;
    return _nodes.get(node_id) ?? null;
}

// ── compute_cluster_topology ──────────────────────────────────────────────────

function compute_cluster_topology() {
    try {
        const all    = [..._nodes.values()];
        const active = get_active_nodes();
        const staleIds = all
            .filter(n => !active.find(a => a.node_id === n.node_id))
            .map(n => n.node_id)
            .sort();

        const roleCounts = {};
        for (const n of active) {
            roleCounts[n.role] = (roleCounts[n.role] ?? 0) + 1;
        }

        const regions = [...new Set(active.map(n => n.region).filter(Boolean))].sort();

        return Object.freeze({
            status:         'TOPOLOGY_COMPUTED',
            total_nodes:    all.length,
            active_nodes:   active.length,
            stale_nodes:    staleIds.length,
            role_counts:    Object.freeze(roleCounts),
            regions:        Object.freeze(regions),
            cluster_id:     _clusterId,
            stale_node_ids: Object.freeze(staleIds),
            topology_at:    new Date().toISOString(),
        });
    } catch (_) {
        return Object.freeze({ status: 'TOPOLOGY_INCOMPLETE', reason: 'compute_error' });
    }
}

// ── Auto-register this node at module load ────────────────────────────────────

register_node({ node_id: _nodeId, region: _regionId, role: _role, cluster_id: _clusterId });

module.exports = { register_node, heartbeat, get_active_nodes, get_node_metadata, compute_cluster_topology };
