'use strict';
// lib/registry/universe/agent-entities.js — The five APEX agents as AGT-* entities.
//
// Agents are first-class citizens of the civilisation. Every graph query that
// works on ENT-* entities works on AGT-* too: impact analysis, health scoring,
// relationship traversal, capability mapping.

const { AGENT_PROFILES } = require('../../../agent-system/agents');

const AGENT_KEYS = ['system_agent', 'file_agent', 'uni_agent', 'finance_agent', 'business_agent'];

// Stable ID assignment — alphabetically sorted key, zero-padded
const _KEY_TO_ID = {};
const _ID_TO_KEY = {};
AGENT_KEYS.forEach((key, i) => {
    const id = `AGT-${String(i + 1).padStart(6, '0')}`;
    _KEY_TO_ID[key] = id;
    _ID_TO_KEY[id]  = key;
});

// Domain ownership: which domain each agent primarily serves
const AGENT_DOMAIN = {
    system_agent:   'DOM-000005',  // Infrastructure
    file_agent:     'DOM-000004',  // Memory
    uni_agent:      'DOM-000008',  // Knowledge
    finance_agent:  'DOM-000001',  // Civilisation
    business_agent: 'DOM-000001',  // Civilisation
};

function buildAgentEntities() {
    return AGENT_KEYS.map((key, i) => {
        const profile = AGENT_PROFILES[key];
        const id      = _KEY_TO_ID[key];
        return {
            id,
            name:        profile.displayName || profile.title,
            family:      'AGENT',
            type:        'AGENT',
            status:      'ACTIVE',
            criticality: 'HIGH',
            owner:       profile.displayName || profile.title,
            purpose:     profile.purpose,
            description: profile.purpose,
            allowedAreas:    profile.allowedAreas || [],
            safetyLimits:    profile.safetyLimits || [],
            path:        null,
            block:       null,
            confidence:  1.0,
            _synthetic:  true,
            _agent_key:  key,
            _domain:     AGENT_DOMAIN[key],
        };
    });
}

// Each agent belongs_to its primary domain
function buildAgentEdges() {
    return AGENT_KEYS.map(key => ({
        from:  _KEY_TO_ID[key],
        to:    AGENT_DOMAIN[key],
        type:  'belongs_to',
        label: `${AGENT_PROFILES[key].displayName} belongs to domain`,
    }));
}

function agentId(key)  { return _KEY_TO_ID[key] || null; }
function agentKey(id)  { return _ID_TO_KEY[id]  || null; }
function allAgentIds() { return Object.values(_KEY_TO_ID); }
function isAgentNode(id) { return typeof id === 'string' && id.startsWith('AGT-'); }

module.exports = { buildAgentEntities, buildAgentEdges, agentId, agentKey, allAgentIds, isAgentNode, AGENT_KEYS, _KEY_TO_ID };
