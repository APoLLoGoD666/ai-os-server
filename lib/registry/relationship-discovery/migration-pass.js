'use strict';

const { RUN_TS, buildPathIndex } = require('./path-index');

function migrationHeaderPass() {
    const edges     = [];
    const pathIndex = buildPathIndex();
    const ml        = require('../migration-lifecycle');

    for (const m of ml.scanMigrations()) {
        if (!m.governed || m.entRefs.length === 0) continue;
        const relPath = `migrations/${m.filename}`;
        const fromId  = pathIndex.get(relPath.toLowerCase());
        if (!fromId) continue;

        for (const toId of m.entRefs) {
            edges.push({
                from: fromId, to: toId, type: 'produces',
                label:        `Migration ${m.filename} declares ${toId}`,
                confidence:   1.0, source: 'migration-header', observed_by: 'migration-header-scan',
                derived_from: relPath, strength: 'required',
                reason: 'schema', first_seen: RUN_TS, last_seen: RUN_TS,
            });
        }
    }

    return edges;
}

module.exports = { migrationHeaderPass };
