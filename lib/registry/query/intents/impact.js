'use strict';
module.exports = function registerImpactIntents(register) {
    register(
        'impact.analyze',
        'Full blast radius analysis — what is affected if entity X changes?',
        {
            id:        'ENT-NNNNNN (required)',
            depth:     'number (default 5, max 8)',
            direction: 'upstream | downstream | both (default upstream)',
        },
        ({ id, depth = 5, direction = 'upstream' }) => {
            if (!id) throw new Error('id is required');
            if (!require('../../engine').lookup(id)) throw new Error(`Not found: ${id}`);
            const report = require('../../impact').analyze(id, { depth: parseInt(depth), direction });
            if (!report) throw new Error(`Analysis failed for ${id}`);
            return report;
        }
    );

    register(
        'impact.quickrisk',
        'Depth-1 risk classification without full traversal',
        { id: 'ENT-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            return { id, risk_level: require('../../impact').quickRisk(id) };
        }
    );

    register(
        'impact.articulation_points',
        'Find nodes whose removal disconnects the registry graph (critical infrastructure)',
        {},
        () => {
            const { GraphCache }           = require('../../impact/graph');
            const { articulationPoints }   = require('../../graph-traversal');
            const fwd = GraphCache.forward();
            if (!fwd) {
                require('../../impact').analyze('ENT-000388', { depth: 1 });
            }
            const adj = GraphCache.forward() || new Map();
            const aps = articulationPoints(adj);
            const engine = require('../../engine');
            const nodes  = [...aps].map(id => {
                const e = engine.lookup(id);
                return e ? { id, name: e.name, family: e.family, type: e.type } : { id };
            });
            return { count: nodes.length, articulation_points: nodes };
        }
    );

    register(
        'impact.cycles',
        'Detect circular dependencies (strongly connected components with size > 1)',
        {},
        () => {
            const { GraphCache }                  = require('../../impact/graph');
            const { stronglyConnectedComponents } = require('../../graph-traversal');
            if (!GraphCache.forward()) {
                require('../../impact').analyze('ENT-000388', { depth: 1 });
            }
            const adj  = GraphCache.forward() || new Map();
            const sccs = stronglyConnectedComponents(adj).filter(s => s.length > 1);
            const engine = require('../../engine');
            const cycles = sccs.map(scc => ({
                size:  scc.length,
                nodes: scc.map(id => {
                    const e = engine.lookup(id);
                    return e ? { id, name: e.name } : { id };
                }),
            }));
            return { cycle_count: cycles.length, cycles };
        }
    );

    register(
        'impact.mermaid',
        'Render an impact report as a Mermaid flowchart string',
        { id: 'ENT-NNNNNN (required)', depth: 'number (default 3)', limit: 'max nodes shown (default 40)' },
        ({ id, depth = 3, limit = 40 }) => {
            if (!id) throw new Error('id is required');
            const report = require('../../impact').analyze(id, { depth: parseInt(depth) });
            if (!report) throw new Error(`Analysis failed for ${id}`);
            return { mermaid: require('../../visualize').toMermaid(report, { limit: parseInt(limit) }) };
        }
    );

    register(
        'impact.dot',
        'Render an impact report as a Graphviz DOT digraph string',
        { id: 'ENT-NNNNNN (required)', depth: 'number (default 3)', limit: 'max nodes shown (default 40)' },
        ({ id, depth = 3, limit = 40 }) => {
            if (!id) throw new Error('id is required');
            const report = require('../../impact').analyze(id, { depth: parseInt(depth) });
            if (!report) throw new Error(`Analysis failed for ${id}`);
            return { dot: require('../../visualize').toDot(report, { limit: parseInt(limit) }) };
        }
    );
};
