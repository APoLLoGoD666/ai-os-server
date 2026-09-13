'use strict';
// lib/runtime/resource-planner.js
// Resource planner — hypothetical effort allocation across strategic initiatives.
//
// PURE OBSERVABILITY. NOT execution. NOT scheduling. NOT orchestration.
//
// No imports. Pure functions on caller-supplied pre-computed data.
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No caches. No persistence. No hidden state.
//   C. No mutation of inputs. No shared references.
//   D. Deterministic: same input → same output.
//   E. All outputs deep-frozen.
//   F. generatedAt = null always.
//   G. No execution authority.
//
// Exports ONLY:
//   plan(input)        → frozen planSnapshot
//   createContext()    → frozen planner context descriptor

const PLANNER_VERSION = '1.0.0';

// ── Deep freeze ───────────────────────────────────────────────────────────────

function _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) _deepFreeze(obj[i]);
    } else {
        for (const key of Object.keys(obj)) _deepFreeze(obj[key]);
    }
    return obj;
}

// ── Deterministic hash ────────────────────────────────────────────────────────

function _djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

function _canon(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(_canon).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

// ── Sequencing (topological sort) ─────────────────────────────────────────────

function _buildSequencing(initiatives) {
    const ids    = new Set(initiatives.map(i => i.id));
    const depMap = {};
    for (const init of initiatives) {
        depMap[init.id] = Array.isArray(init.dependencies)
            ? init.dependencies.filter(d => ids.has(d))
            : [];
    }

    const result  = [];
    const visited = new Set();

    function visit(id) {
        if (visited.has(id)) return;
        visited.add(id);
        for (const dep of (depMap[id] || [])) visit(dep);
        result.push(id);
    }

    // Process in stable order (by id string) for determinism
    for (const init of initiatives.slice().sort((a, b) => a.id < b.id ? -1 : 1)) {
        visit(init.id);
    }
    return result;
}

// ── Critical path (longest dependency chain) ──────────────────────────────────

function _buildCriticalPath(initiatives) {
    const ids    = new Set(initiatives.map(i => i.id));
    const depMap = {};
    for (const init of initiatives) {
        depMap[init.id] = Array.isArray(init.dependencies)
            ? init.dependencies.filter(d => ids.has(d))
            : [];
    }

    const memo = {};

    function longestPath(id) {
        if (memo[id] !== undefined) return memo[id];
        const deps = depMap[id] || [];
        if (deps.length === 0) {
            memo[id] = [id];
            return [id];
        }
        let best = [];
        for (const dep of deps) {
            const path = longestPath(dep);
            if (path.length > best.length) best = path;
        }
        memo[id] = [...best, id];
        return memo[id];
    }

    let criticalPath = [];
    for (const init of initiatives) {
        const path = longestPath(init.id);
        if (path.length > criticalPath.length) criticalPath = path;
    }

    return criticalPath;
}

// ── Allocation ────────────────────────────────────────────────────────────────

function _buildAllocations(initiatives, capacity) {
    const totalGain = initiatives.reduce((s, i) => s + i.expectedGain, 0);
    return initiatives.map(init => {
        const weight = totalGain > 0
            ? init.expectedGain / totalGain
            : 1 / initiatives.length;
        const allocationWeight = parseFloat((weight * capacity).toFixed(6));
        return _deepFreeze({
            initiative:       init.id,
            allocationWeight,
            expectedReturn:   parseFloat((init.expectedGain * allocationWeight).toFixed(6)),
            timeWindow:       init.timeToImpact || 'MEDIUM',
        });
    });
}

// ── Empty plan ────────────────────────────────────────────────────────────────

function _emptyPlan(capacity) {
    return _deepFreeze({
        planHash:         _djb2(_canon({ capacity, initiatives: [] })),
        allocations:      Object.freeze([]),
        unusedCapacity:   parseFloat(capacity.toFixed(6)),
        expectedReturn:   0,
        sequencing:       Object.freeze([]),
        criticalPath:     Object.freeze([]),
        resourceMetadata: _deepFreeze({
            runtimeIntegrated:  false,
            executionInfluence: false,
            authorityLevel:     'NONE',
            descriptiveOnly:    true,
            deterministic:      true,
        }),
        generatedAt:      null,
        deterministic:    true,
        descriptiveOnly:  true,
    });
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        plannerVersion:    PLANNER_VERSION,
        plannerFields:     Object.freeze([
            'planHash', 'allocations', 'unusedCapacity', 'expectedReturn',
            'sequencing', 'criticalPath', 'resourceMetadata',
            'generatedAt', 'deterministic', 'descriptiveOnly',
        ]),
        fieldCount:        10,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        executionInfluence: false,
        createdAt:         null,
    });
}

function plan(input) {
    const safeInput   = (input !== null && typeof input === 'object') ? input : {};
    const { initiatives, capacity } = safeInput;

    const safeCapacity = (typeof capacity === 'number' && isFinite(capacity) && capacity >= 0)
        ? Math.min(1, capacity) : 1.0;

    const safeInitiatives = Array.isArray(initiatives)
        ? initiatives.filter(i => i !== null && typeof i === 'object' && typeof i.id === 'string' && typeof i.expectedGain === 'number')
        : [];

    if (safeInitiatives.length === 0) return _emptyPlan(safeCapacity);

    const allocations    = _buildAllocations(safeInitiatives, safeCapacity);
    const totalAllocated = allocations.reduce((s, a) => s + a.allocationWeight, 0);
    const unusedCapacity = parseFloat(Math.max(0, safeCapacity - totalAllocated).toFixed(6));
    const expectedReturn = parseFloat(allocations.reduce((s, a) => s + a.expectedReturn, 0).toFixed(6));

    const sequencing   = _buildSequencing(safeInitiatives);
    const criticalPath = _buildCriticalPath(safeInitiatives);

    const planHash = _djb2(_canon({
        capacity:    safeCapacity,
        initiatives: allocations.map(a => a.initiative),
    }));

    const resourceMetadata = _deepFreeze({
        runtimeIntegrated:  false,
        executionInfluence: false,
        authorityLevel:     'NONE',
        descriptiveOnly:    true,
        deterministic:      true,
    });

    return _deepFreeze({
        planHash,
        allocations:      _deepFreeze(allocations),
        unusedCapacity,
        expectedReturn,
        sequencing:       _deepFreeze(sequencing),
        criticalPath:     _deepFreeze(criticalPath),
        resourceMetadata,
        generatedAt:      null,
        deterministic:    true,
        descriptiveOnly:  true,
    });
}

module.exports = { plan, createContext };
