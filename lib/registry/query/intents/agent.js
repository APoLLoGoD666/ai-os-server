'use strict';
module.exports = function registerAgentIntents(register) {
    register(
        'agent.list',
        'List all five APEX agents with status, domain, and capability summary',
        {},
        () => {
            const engine = require('../../engine');
            const agents = engine.find({ family: 'AGENT' });
            return {
                count: agents.length,
                agents: agents.map(a => ({
                    id:           a.id,
                    name:         a.name,
                    status:       a.status,
                    domain:       a._domain,
                    purpose:      a.purpose,
                    allowedAreas: a.allowedAreas || [],
                })),
            };
        }
    );

    register(
        'agent.status',
        'Status and capability summary for a specific agent',
        { id: 'AGT-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const engine = require('../../engine');
            const rels   = require('../../relationships');
            const a = engine.lookup(id);
            if (!a || a.family !== 'AGENT') throw new Error(`Agent not found: ${id}`);
            return {
                ...a,
                outgoing: rels.relationsOf(id),
                incoming: rels.reverseRelationsOf(id),
            };
        }
    );

    register(
        'agent.capabilities',
        'What each agent is allowed to do, grouped by domain',
        {},
        () => {
            const engine = require('../../engine');
            const agents = engine.find({ family: 'AGENT' });
            return agents.map(a => ({
                id:           a.id,
                name:         a.name,
                allowedAreas: a.allowedAreas || [],
                safetyLimits: a.safetyLimits || [],
                domain:       a._domain,
            }));
        }
    );
};
