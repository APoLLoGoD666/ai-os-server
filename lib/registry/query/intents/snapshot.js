'use strict';
module.exports = function registerSnapshotIntents(register) {
    register(
        'snapshot.take',
        'Capture a full architecture snapshot and persist to DB for later diff queries',
        { label: 'string (optional) — human-readable label for this snapshot' },
        async ({ label }) => require('../../snapshot').takeSnapshot({ label })
    );

    register(
        'snapshot.list',
        'List recent architecture snapshots, newest first',
        { limit: 'number (default 20, max 100)' },
        async ({ limit }) => require('../../snapshot').listSnapshots({ limit })
    );

    register(
        'snapshot.get',
        'Get a single architecture snapshot by ID',
        { id: 'number (required) — snapshot ID' },
        async ({ id }) => {
            if (!id) throw new Error('id is required');
            return require('../../snapshot').getSnapshot(id);
        }
    );

    register(
        'snapshot.diff',
        'Diff two architecture snapshots: entity delta, capability health changes, risk changes',
        { id1: 'number (required) — earlier snapshot ID', id2: 'number (required) — later snapshot ID' },
        async ({ id1, id2 }) => {
            if (!id1 || !id2) throw new Error('id1 and id2 are required');
            return require('../../snapshot').diffSnapshots(id1, id2);
        }
    );
};
