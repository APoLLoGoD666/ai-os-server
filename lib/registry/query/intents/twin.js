'use strict';
module.exports = function registerTwinIntents(register) {
    register(
        'twin.state',
        'Compute live Digital Twin state: health score, projections, git provenance, relationships',
        { id: 'ENT-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const e = require('../../engine').lookup(id);
            if (!e) throw new Error(`Not found: ${id}`);
            return require('../../twin').computeState(e);
        }
    );
};
