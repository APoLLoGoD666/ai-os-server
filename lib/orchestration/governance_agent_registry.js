'use strict';

// Governance Agent Registry v2
// Universal contract-enforcing registry for any agent type.
// Enforces AgentContract at registration. Trust level is system-assigned.
// NEVER throws. All outputs frozen.

const obs = require('./governance_observability');

// Capability risk tiers for trust level assignment
const _HIGH_RISK_CAPS   = Object.freeze(['system.execute', 'finance.compute', 'network.request']);
const _MEDIUM_RISK_CAPS = Object.freeze(['file.write', 'reasoning.heavy']);

function _assign_trust_level(capabilities) {
    if (!Array.isArray(capabilities) || capabilities.includes('untrusted.generic')) return 'UNTRUSTED';
    if (capabilities.some(c => _HIGH_RISK_CAPS.includes(c)))   return 'HIGH';
    if (capabilities.some(c => _MEDIUM_RISK_CAPS.includes(c))) return 'MEDIUM';
    return 'LOW';
}

// AgentContract: required fields
function _validate(def) {
    if (!def || typeof def !== 'object')                        return 'definition must be an object';
    if (!def.agent_id || typeof def.agent_id !== 'string')     return 'agent_id (string) is required';
    if (!Array.isArray(def.capabilities))                      return 'capabilities (string[]) is required';
    if (def.capabilities.length === 0)                         return 'capabilities must not be empty';
    return null;
}

// _store[agent_id] = { definition: frozen, state: {}, _fn: Function|null }
const _store = new Map();

// register_agent(definition, execute_fn?)
// definition may include execute_fn inline; second param takes precedence if both provided.
// trust_level is always system-assigned; any caller-provided value is overwritten.
function register_agent(agent_definition, execute_fn = null) {
    try {
        const err = _validate(agent_definition);
        if (err) return Object.freeze({ success: false, reason: err });

        const id       = agent_definition.agent_id;
        const existing = _store.get(id);

        // Resolve fn: explicit second param > inline execute_fn in definition > existing
        const resolved_fn =
            typeof execute_fn === 'function'                  ? execute_fn :
            typeof agent_definition.execute_fn === 'function' ? agent_definition.execute_fn :
            (existing?._fn ?? null);

        const capabilities = Object.freeze([...agent_definition.capabilities]);
        const trust_level  = _assign_trust_level(agent_definition.capabilities);

        const frozen_def = Object.freeze({
            agent_id:     id,
            name:         agent_definition.name         ?? id,
            type:         agent_definition.type         ?? 'generic',
            capabilities,
            trust_level,
            metadata:     Object.freeze({ ...(agent_definition.metadata ?? {}) }),
            version:      agent_definition.version ?? null,
            runtime_context: Object.freeze({ ...(agent_definition.runtime_context ?? {}) }),
        });

        _store.set(id, {
            definition: frozen_def,
            state:      existing ? { ...existing.state } : {},
            _fn:        resolved_fn,
        });

        obs.emit(obs.EVENT_TYPES.AGENT_REGISTRATION, {
            agent_id:    id,
            trust_level,
            capabilities: [...capabilities],
            has_fn:      resolved_fn !== null,
        });

        return Object.freeze({ success: true, agent_id: id, trust_level });
    } catch (_) {
        return Object.freeze({ success: false, reason: 'REGISTRY_ERROR' });
    }
}

function get_agent(agent_id) {
    try {
        const entry = _store.get(agent_id);
        if (!entry) return null;
        return Object.freeze({
            definition: entry.definition,
            state:      Object.freeze({ ...entry.state }),
            has_fn:     entry._fn !== null,
        });
    } catch (_) {
        return null;
    }
}

// Internal only — returns raw entry including live _fn reference
function _get_internal(agent_id) {
    return _store.get(agent_id) ?? null;
}

function list_agents() {
    try {
        const agents = [];
        for (const [id, entry] of _store) {
            agents.push(Object.freeze({
                agent_id:    id,
                name:        entry.definition.name,
                type:        entry.definition.type,
                trust_level: entry.definition.trust_level,
                has_fn:      entry._fn !== null,
                state:       Object.freeze({ ...entry.state }),
            }));
        }
        return Object.freeze(agents);
    } catch (_) {
        return Object.freeze([]);
    }
}

function update_agent_state(agent_id, patch) {
    try {
        const entry = _store.get(agent_id);
        if (!entry) return Object.freeze({ success: false, reason: 'AGENT_NOT_FOUND' });
        if (!patch || typeof patch !== 'object') return Object.freeze({ success: false, reason: 'INVALID_PATCH' });
        entry.state = { ...entry.state, ...patch };
        return Object.freeze({ success: true, agent_id });
    } catch (_) {
        return Object.freeze({ success: false, reason: 'STATE_UPDATE_ERROR' });
    }
}

module.exports = Object.freeze({
    register_agent,
    get_agent,
    list_agents,
    update_agent_state,
    _get_internal,
});
