'use strict';

function safeHealth(healthModule, entity) {
    try { return healthModule.compute(entity) || { score: 0, label: 'UNKNOWN', confidence: 0 }; }
    catch { return { score: 0, label: 'UNKNOWN', confidence: 0 }; }
}

module.exports = function registerDomainIntents(register) {
    register(
        'domain.list',
        'List all ten civilisation domains with health and entity counts',
        {},
        () => {
            const engine = require('../../engine');
            const health = require('../../health-score');
            const domains = engine.find({ family: 'DOMAIN' });
            return {
                count: domains.length,
                domains: domains.map(d => ({
                    id:          d.id,
                    name:        d.name,
                    criticality: d.criticality,
                    status:      d.status,
                    owner:       d.owner,
                    health:      safeHealth(health, d),
                })),
            };
        }
    );

    register(
        'domain.entity',
        'Get a specific domain with full health, relationships, and agent listing',
        { id: 'DOM-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const engine = require('../../engine');
            const rels   = require('../../relationships');
            const health = require('../../health-score');
            const d = engine.lookup(id);
            if (!d || d.family !== 'DOMAIN') throw new Error(`Domain not found: ${id}`);
            const agents = engine.find({ family: 'AGENT' }).filter(a => a._domain === id);
            return {
                ...d,
                health:   safeHealth(health, d),
                outgoing: rels.relationsOf(id),
                incoming: rels.reverseRelationsOf(id),
                agents:   agents.map(a => ({ id: a.id, name: a.name, status: a.status })),
            };
        }
    );

    register(
        'domain.health',
        'Health matrix for all ten domains — scores, trends, agent counts',
        {},
        () => {
            const engine   = require('../../engine');
            const health   = require('../../health-score');
            const temporal = require('../../temporal-cognition');
            const domains  = engine.find({ family: 'DOMAIN' });
            return {
                domains: domains.map(d => ({
                    id:     d.id,
                    name:   d.name,
                    health: safeHealth(health, d),
                    trend:  temporal.trend(d.id),
                })),
            };
        }
    );

    register(
        'domain.graph',
        'Relationship graph between the ten civilisation domains',
        {},
        () => {
            const engine  = require('../../engine');
            const rels    = require('../../relationships');
            const domains = engine.find({ family: 'DOMAIN' });
            const domIds  = new Set(domains.map(d => d.id));
            const edges   = [];
            const seen    = new Set();
            for (const d of domains) {
                for (const e of rels.relationsOf(d.id)) {
                    const key = `${e.from}:${e.to}:${e.type}`;
                    if (!seen.has(key) && domIds.has(e.to)) { seen.add(key); edges.push(e); }
                }
            }
            return { nodes: domains.map(d => ({ id: d.id, name: d.name, criticality: d.criticality })), edges };
        }
    );
};
