'use strict';
// lib/registry/projections.js — Declarative Projection Engine
//
// Rules are defined in projection-rules.json (data).
// Validators are implemented in projection-validators.js (behaviour).
// This module is a thin executor: load rule → determine eligibility → call validator.
//
// Adding a new projection plane:
//   1. Add an entry to projection-rules.json
//   2. Add or reuse a validator in projection-validators.js
//   That is all.

const rules      = require('./projection-rules.json');
const validators = require('./projection-validators');

const PROJECTION_TYPES = Object.keys(rules);

// ── Eligibility ──────────────────────────────────────────────────────────────
// An entity is eligible for a projection if it belongs to any of the rule's
// scoped families or types. If no scope is defined, all entities are eligible.

function _isEligible(entity, rule) {
    const scope = rule.scope || {};
    const hasFamilyScope = scope.families && scope.families.length > 0;
    const hasTypeScope   = scope.types    && scope.types.length   > 0;

    if (!hasFamilyScope && !hasTypeScope) return true;

    if (hasFamilyScope && scope.families.includes(entity.family)) return true;
    if (hasTypeScope   && scope.types.includes(entity.type))      return true;

    return false;
}

function _isPathSkippable(rawPath) {
    if (!rawPath) return true;
    const p = rawPath.trim();
    return !p || p.startsWith('UNKNOWN') || p.startsWith('EXTERNAL') ||
           p.startsWith('Supabase') || p.startsWith('http') ||
           p === 'NONE' || p === 'SELF';
}

// ── Core executor ────────────────────────────────────────────────────────────

function checkProjection(entity, projectionType) {
    const rule = rules[projectionType];
    if (!rule) return { projection: projectionType, status: 'UNKNOWN_TYPE' };

    // Scope filter
    if (!_isEligible(entity, rule)) {
        return { projection: projectionType, status: 'SKIP', reason: 'Not in projection scope' };
    }

    // Path guard (for projections that require a local path)
    if (rule.requires_path && _isPathSkippable(entity.path)) {
        return { projection: projectionType, status: 'SKIP', reason: 'No local filesystem path' };
    }

    // Run validator
    const validator = validators[rule.validator];
    if (!validator) {
        return { projection: projectionType, status: 'NOT_IMPLEMENTED', detail: `No validator: ${rule.validator}` };
    }

    const result = validator(entity, rule);
    return { projection: projectionType, ...result };
}

function checkAllProjections(entity) {
    return PROJECTION_TYPES.map(t => checkProjection(entity, t));
}

// ── Bulk physical scan (kept for CLI / HTTP backward compat) ─────────────────

function checkPhysical(entity)   { return checkProjection(entity, 'physical'); }
function checkRepository(entity) { return checkProjection(entity, 'repository'); }

function checkAllPhysical() {
    const engine  = require('./engine');
    const scope   = (rules.physical.scope || {}).types || [];
    const targets = engine.all().filter(e => scope.includes(e.type));
    const results = { sync: [], drift: [], skip: [] };

    for (const e of targets) {
        const r = checkPhysical(e);
        if      (r.status === 'SYNC')  results.sync.push({ id: e.id, name: e.name, path: r.path });
        else if (r.status === 'DRIFT') results.drift.push({ id: e.id, name: e.name, expected: r.path, detail: r.detail });
        else                           results.skip.push({ id: e.id, name: e.name, reason: r.reason });
    }

    return results;
}

module.exports = {
    PROJECTION_TYPES,
    rules,
    checkPhysical, checkAllPhysical,
    checkRepository,
    checkProjection, checkAllProjections,
};
