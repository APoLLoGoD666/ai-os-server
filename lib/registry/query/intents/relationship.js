'use strict';
module.exports = function registerRelationshipIntents(register) {
    register(
        'relationship.graph',
        'BFS graph traversal from an entity (follows outgoing edges)',
        { id: 'ENT-NNNNNN (required)', depth: 'number (default 2, max 5)' },
        ({ id, depth = 2 }) => {
            if (!id) throw new Error('id is required');
            const engine = require('../../engine');
            const rels   = require('../../relationships');
            if (!engine.lookup(id)) throw new Error(`Not found: ${id}`);
            const { nodes, edges } = rels.graph(id, Math.min(parseInt(depth), 5));
            return { root: id, depth: parseInt(depth), nodes: nodes.map(n => ({ id: n, ...engine.lookup(n) })), edges };
        }
    );

    register(
        'relationship.of',
        'Get all outgoing and incoming edges for an entity',
        { id: 'ENT-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const rels = require('../../relationships');
            if (!require('../../engine').lookup(id)) throw new Error(`Not found: ${id}`);
            return { outgoing: rels.relationsOf(id), incoming: rels.reverseRelationsOf(id) };
        }
    );

    register(
        'relationship.mermaid',
        'Render a relationship subgraph as a Mermaid flowchart string',
        { id: 'ENT-NNNNNN (required)', depth: 'number (default 2, max 5)', limit: 'max nodes (default 60)' },
        ({ id, depth = 2, limit = 60 }) => {
            if (!id) throw new Error('id is required');
            const engine = require('../../engine');
            const rels   = require('../../relationships');
            if (!engine.lookup(id)) throw new Error(`Not found: ${id}`);
            const { nodes, edges } = rels.graph(id, Math.min(parseInt(depth), 5));
            const nodeObjs = nodes.map(n => ({ id: n, ...engine.lookup(n) }));
            return {
                mermaid: require('../../visualize').subgraphMermaid(nodeObjs, edges, { limit: parseInt(limit) }),
            };
        }
    );

    register(
        'relationship.discover',
        'Auto-discover candidate relationships from static analysis (JS imports, SQL DDL, migration headers)',
        { id: 'ENT-NNNNNN (optional — omit for all)', passes: 'comma-separated: js,sql,docs,migration-header' },
        ({ id, passes }) => {
            const disco       = require('../../relationship-discovery');
            const parsedPasses = passes ? passes.split(',').map(s => s.trim()) : undefined;
            const edges = id ? disco.discoverFor(id, parsedPasses) : disco.discover(parsedPasses);
            return { count: edges.length, edges };
        }
    );
};
