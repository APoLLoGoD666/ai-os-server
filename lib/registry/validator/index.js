'use strict';
// lib/registry/validator.js — Registry integrity checks.
// Detects: duplicate IDs, missing paths, broken file refs, orphaned relationships,
// missing status/name, invalid relationship references.

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../..');

function _toAbsolute(registeredPath) {
    // Normalize Windows-style vault paths to local relative paths
    const p = (registeredPath || '')
        .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
        .replace(/\//g, path.sep)
        .replace(/\\/g, path.sep);
    return p ? path.join(SCRIPTS_ROOT, p) : null;
}

function _isSkippable(rawPath) {
    if (!rawPath) return true;
    const p = rawPath.trim();
    return (
        p === '' ||
        p.startsWith('UNKNOWN') ||
        p.startsWith('EXTERNAL') ||
        p.startsWith('Supabase') ||
        p.startsWith('http') ||
        p === 'NONE' ||
        p === 'SELF'
    );
}

function validate() {
    const engine = require('../engine');
    const rels   = require('../relationships');
    const entities = engine.all();
    const allIds   = new Set(entities.map(e => e.id));
    const findings = [];

    const push = (severity, rule, entity, detail) => findings.push({ severity, rule, entity, detail });

    // ── ID integrity ────────────────────────────────────────────────────────
    const seen = new Set();
    for (const e of entities) {
        if (seen.has(e.id)) push('ERROR', 'DUPLICATE_ID', e.id, 'ID appears more than once in registry');
        seen.add(e.id);
    }

    // ── Required fields ─────────────────────────────────────────────────────
    for (const e of entities) {
        if (!e.name || !e.name.trim()) push('WARN', 'MISSING_NAME', e.id, 'Entity has no name');
        if (!e.status)                 push('INFO',  'MISSING_STATUS', e.id, 'No lifecycle status recorded');
        if (!e.family)                 push('INFO',  'MISSING_FAMILY', e.id, 'No family classification recorded');
    }

    // ── Physical file references ─────────────────────────────────────────────
    for (const e of entities) {
        if (!['FILE', 'SQL', 'SEED_SCRIPT'].includes(e.type)) continue;
        if (_isSkippable(e.path)) continue;
        const abs = _toAbsolute(e.path);
        if (!abs) continue;
        if (!fs.existsSync(abs)) {
            push('WARN', 'BROKEN_FILE_REF', e.id, `Not found on disk: ${e.path}`);
        }
    }

    // ── Orphaned relationship references ────────────────────────────────────
    for (const rel of rels.all()) {
        if (!allIds.has(rel.from)) push('ERROR', 'ORPHANED_REL_SOURCE', rel.from, `Relationship source not in registry (→ ${rel.to} [${rel.type}])`);
        if (!allIds.has(rel.to))   push('ERROR', 'ORPHANED_REL_TARGET', rel.to,   `Relationship target not in registry (← ${rel.from} [${rel.type}])`);
    }

    // ── Architectural invariant: TABLE entities should have Supabase paths ──
    for (const e of entities) {
        if (e.type !== 'TABLE') continue;
        if (e.path && !e.path.startsWith('Supabase')) {
            push('INFO', 'TABLE_PATH_FORMAT', e.id, `TABLE entity path should start with 'Supabase —': ${e.path}`);
        }
    }

    return findings;
}

module.exports = { validate };
