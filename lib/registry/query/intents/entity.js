'use strict';
module.exports = function registerEntityIntents(register) {
    register(
        'entity.lookup',
        'Get full record for a single entity by canonical ID',
        { id: 'ENT-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const e = require('../../engine').lookup(id);
            if (!e) throw new Error(`Not found: ${id}`);
            return e;
        }
    );

    register(
        'entity.search',
        'Full-text search across id, name, family, type, path, purpose, description',
        { q: 'string (required)', limit: 'number (default 25)' },
        ({ q, limit = 25 }) => {
            if (!q) throw new Error('q is required');
            return require('../../engine').search(q, parseInt(limit));
        }
    );

    register(
        'entity.find',
        'Filter entities by family, type, status, block, or owner',
        { family: 'string', type: 'string', status: 'string', block: 'number', owner: 'string' },
        ({ family, type, status, block, owner }) => {
            const engine = require('../../engine');
            if (owner) return engine.byOwner(owner);
            const filter = {};
            if (family !== undefined) filter.family = family;
            if (type   !== undefined) filter.type   = type;
            if (status !== undefined) filter.status = status;
            if (block  !== undefined) filter.block  = parseInt(block);
            return engine.find(filter);
        }
    );

    register(
        'entity.stats',
        'Aggregate counts by family, type, status, and block across all entities',
        {},
        () => {
            const engine = require('../../engine');
            const rels   = require('../../relationships');
            const all    = engine.all();
            const tally  = key => {
                const t = {};
                for (const x of all) { const k = x[key] || '(none)'; t[k] = (t[k] || 0) + 1; }
                return t;
            };
            return {
                total:         all.length,
                relationships: rels.all().length,
                byFamily:      tally('family'),
                byType:        tally('type'),
                byStatus:      tally('status'),
                byBlock:       tally('block'),
            };
        }
    );

    register(
        'validate.constraints',
        'Evaluate architectural constraint rules (static by default; add full=true for computed projection + impact rules)',
        { full: 'boolean (default false) — include computed rules (runs projections + impact analysis, ~5-30s)' },
        ({ full }) => require('../../constraints').check({ full })
    );

    register(
        'validate.registry',
        'Registry integrity check: duplicate IDs, broken refs, orphaned relationships, missing fields',
        {},
        () => {
            const findings = require('../../validator').validate();
            const errors   = findings.filter(f => f.severity === 'ERROR');
            const warns    = findings.filter(f => f.severity === 'WARN');
            const infos    = findings.filter(f => f.severity === 'INFO');
            return {
                valid:    errors.length === 0,
                summary:  { errors: errors.length, warnings: warns.length, info: infos.length },
                findings,
            };
        }
    );
};
