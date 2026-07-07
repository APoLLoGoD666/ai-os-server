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
};
