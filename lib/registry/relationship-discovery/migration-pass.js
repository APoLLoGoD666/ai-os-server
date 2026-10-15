'use strict';

const { PathIndex, RUN_TS } = require('./path-index');

function migrationHeaderPass(ctx) {
    PathIndex.ensureBuilt(ctx);
    const edges = [];
    const ml    = ctx.migrationLifecycle;

    for (const m of ml.scanMigrations()) {
        if (!m.governed || m.entRefs.length === 0) continue;
        const relPath = `migrations/${m.filename}`;
        const fromId  = PathIndex.get(relPath.toLowerCase());
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

const migrationHeaderPlugin = {
    name:        'migration-header',
    description: 'Reads @ent-refs declarations in APEX migration headers to emit produces edges',
    fileTypes:   ['sql'],
    confidence:  1.0,
    discover:    migrationHeaderPass,
    validate:    edge => !!(edge.from && edge.to && edge.type && edge.source),
};

module.exports = { migrationHeaderPass, migrationHeaderPlugin };
