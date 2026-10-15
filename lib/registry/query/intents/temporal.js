'use strict';
module.exports = function registerTemporalIntents(register) {
    register(
        'temporal.diff',
        'Which entities changed health label in the last N days? Requires entity_state_history table.',
        { days: 'number (default 7)' },
        async ({ days }) => require('../../temporal').diff({ days })
    );

    register(
        'temporal.timeline',
        'Full health history for one entity, newest first. Requires entity_state_history table.',
        { id: 'ENT-NNNNNN (required)', limit: 'number (default 50, max 200)' },
        async ({ id, limit }) => {
            if (!id) throw new Error('id is required');
            return require('../../temporal').timeline(id, { limit });
        }
    );

    register(
        'temporal.trend',
        'Score trend direction for one entity over its last N snapshots (rising/falling/stable)',
        { id: 'ENT-NNNNNN (required)', snapshots: 'number (default 30, max 100)' },
        async ({ id, snapshots }) => {
            if (!id) throw new Error('id is required');
            return require('../../temporal').trend(id, { snapshots });
        }
    );
};
