'use strict';
module.exports = function registerProjectionIntents(register) {
    register(
        'projection.check',
        'Check one or all projection planes for an entity',
        { id: 'ENT-NNNNNN (required)', type: 'projection type (optional — omit for all 8)' },
        ({ id, type }) => {
            if (!id) throw new Error('id is required');
            const engine = require('../../engine');
            const proj   = require('../../projections');
            const e = engine.lookup(id);
            if (!e) throw new Error(`Not found: ${id}`);
            return type ? proj.checkProjection(e, type) : proj.checkAllProjections(e);
        }
    );

    register(
        'projection.physical',
        'Physical drift report across all FILE/SQL/FOLDER entities',
        {},
        () => require('../../projections').checkAllPhysical()
    );

    register(
        'projection.rules',
        'List all projection rules (the declarative rule definitions)',
        {},
        () => require('../../projection-rules.json')
    );
};
