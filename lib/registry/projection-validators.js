'use strict';
// lib/registry/projection-validators.js — Generic projection validator functions.
//
// Four validators cover all 8 projection types:
//   file_exists   — does entity.path exist on disk?
//   git_tracked   — is entity.path tracked in git?
//   file_search   — does entity appear in the declared sources?
//                   Driven entirely by rule.search + rule.sources — no custom logic per plane.
//   graph_search  — is entity's path a node in a graph JSON file?
//
// The rule JSON is the authority. Validators only know how to execute the pattern.

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../..');
const VAULT_DIR    = path.join('C:', 'Users', 'arwwo', 'Desktop', 'APEX', 'APEX AI OS', 'System', 'Claude-Memory');

// ── Source content cache ─────────────────────────────────────────────────────
// Keyed by source string. Loaded once per process lifetime.

const _cache    = new Map();   // source → raw content string
const _idIndex  = new Map();   // source → Set<entId>  (ENT-\d{6} occurrences)
const _nameIdx  = new Map();   // source → Set<string> (lower-cased word tokens for name search)

function _readDirRecursive(dir, exts = ['.md', '.js', '.ts', '.json', '.sql', '.html']) {
    const parts = [];
    let entries;
    try { entries = fs.readdirSync(dir); } catch (_) { return parts; }
    for (const f of entries) {
        const full = path.join(dir, f);
        let stat;
        try { stat = fs.statSync(full); } catch (_) { continue; }
        if (stat.isDirectory()) { parts.push(..._readDirRecursive(full, exts)); continue; }
        if (!exts.some(e => f.endsWith(e))) continue;
        try { parts.push(fs.readFileSync(full, 'utf8')); } catch (_) {}
    }
    return parts;
}

function _loadSource(source) {
    if (_cache.has(source)) return _cache.get(source);
    let content = '';

    if (source === 'VAULT:Claude-Memory') {
        const parts = [];
        try {
            const files = fs.readdirSync(VAULT_DIR).filter(f => f.endsWith('.md'));
            for (const f of files) {
                try { parts.push(fs.readFileSync(path.join(VAULT_DIR, f), 'utf8')); } catch (_) {}
            }
        } catch (_) {}
        content = parts.join('\n');
    } else {
        const abs  = path.join(SCRIPTS_ROOT, source);
        let stat;
        try { stat = fs.statSync(abs); } catch (_) { _cache.set(source, ''); return ''; }
        content = stat.isDirectory()
            ? _readDirRecursive(abs).join('\n')
            : (() => { try { return fs.readFileSync(abs, 'utf8'); } catch (_) { return ''; } })();
    }

    _cache.set(source, content);

    // Build ENT-ID index for O(1) id-target lookups
    const ids = new Set(content.match(/ENT-\d{6}/g) || []);
    _idIndex.set(source, ids);

    return content;
}

function _combinedContent(sources) {
    return (sources || []).map(_loadSource).join('\n');
}

// Return merged id Set across all sources (built as a side-effect of _loadSource)
function _combinedIdSet(sources) {
    const merged = new Set();
    for (const s of (sources || [])) {
        _loadSource(s);  // ensure indexed
        for (const id of (_idIndex.get(s) || [])) merged.add(id);
    }
    return merged;
}

// ── Git tracked file cache ───────────────────────────────────────────────────
// Populated once per process by running `git ls-files` once.

let _trackedFiles = null;

function _getTrackedFiles() {
    if (_trackedFiles) return _trackedFiles;
    _trackedFiles = new Set();
    try {
        const { execSync } = require('child_process');
        const out = execSync(`git -C "${SCRIPTS_ROOT}" ls-files`, { stdio: 'pipe' }).toString();
        for (const line of out.split('\n')) {
            const f = line.trim().replace(/\\/g, '/');
            if (f) _trackedFiles.add(f);
        }
    } catch (_) {}
    return _trackedFiles;
}

// ── Path helpers ─────────────────────────────────────────────────────────────

function _toRelative(registeredPath) {
    return (registeredPath || '')
        .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
        .replace(/\\/g, '/');
}

function _toAbsolute(registeredPath) {
    const rel = _toRelative(registeredPath);
    return rel ? path.join(SCRIPTS_ROOT, rel.replace(/\//g, path.sep)) : null;
}

function _targets(entity, searchTarget) {
    const out = [];
    const addIfTruthy = (v, type) => { if (v) out.push({ value: v, type }); };

    if (searchTarget === 'path') {
        const rel   = _toRelative(entity.path);
        const noExt = rel ? rel.replace(/\.(js|ts)$/, '') : null;
        addIfTruthy(rel,                          'path');
        addIfTruthy(noExt,                        'path_no_ext');
        addIfTruthy(noExt ? './' + noExt : null,  'path_rel');
    } else if (searchTarget === 'id') {
        addIfTruthy(entity.id,   'id');
    } else if (searchTarget === 'name') {
        addIfTruthy(entity.name, 'name');
    } else if (searchTarget === 'id_or_name') {
        addIfTruthy(entity.id,   'id');
        addIfTruthy(entity.name, 'name');
    }

    return out;
}

// ── Validators ───────────────────────────────────────────────────────────────

function file_exists(entity) {
    const abs = _toAbsolute(entity.path);
    if (!abs) return { status: 'SKIP', reason: 'Path not resolvable' };
    return fs.existsSync(abs)
        ? { status: 'SYNC', path: abs }
        : { status: 'DRIFT', detail: `Not found on disk: ${abs}` };
}

function git_tracked(entity) {
    const rel = _toRelative(entity.path);
    if (!rel) return { status: 'SKIP', reason: 'No path' };
    return _getTrackedFiles().has(rel)
        ? { status: 'SYNC', tracked: rel }
        : { status: 'DRIFT', detail: 'Not tracked in git repository' };
}

function file_search(entity, rule) {
    const searchConfig = rule.search || {};
    const target       = searchConfig.target || 'id';
    const candidateTargets = _targets(entity, target);
    if (candidateTargets.length === 0) return { status: 'SKIP', reason: 'No target value for entity' };

    const patterns = searchConfig.patterns || [];

    // Fast path: id-only search against pre-built Set — O(1) per entity
    if (target === 'id' && patterns.length === 0) {
        const idSet = _combinedIdSet(rule.sources);
        const hit = candidateTargets.find(({ value }) => idSet.has(value));
        if (hit) return { status: 'SYNC', detail: `id="${hit.value}" found`, confidence: 1.0 };
        return { status: 'DRIFT', detail: `Not found in: ${(rule.sources || []).join(', ')}` };
    }

    // Standard path: full content scan (with pattern matching)
    const content = _combinedContent(rule.sources);

    for (const { value, type } of candidateTargets) {
        if (!value || !content.includes(value)) continue;

        if (patterns.length > 0) {
            const lines = content.split('\n');
            for (const line of lines) {
                if (line.includes(value) && patterns.some(p => line.includes(p))) {
                    return { status: 'SYNC', detail: `${type}="${value}" found with pattern match`, confidence: 1.0 };
                }
            }
            return { status: 'SYNC', detail: `${type}="${value}" found (no pattern context)`, confidence: 0.7 };
        }

        return { status: 'SYNC', detail: `${type}="${value}" found in: ${(rule.sources || []).join(', ')}`, confidence: 1.0 };
    }

    return { status: 'DRIFT', detail: `Not found in: ${(rule.sources || []).join(', ')}` };
}

let _graphNodes = null;
function graph_search(entity, rule) {
    if (!_graphNodes) {
        _graphNodes = new Set();
        const graphPath = path.join(SCRIPTS_ROOT, rule.graph_file || 'graphify-out/graph.json');
        try {
            const g = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
            for (const n of (g.nodes || [])) {
                if (n.source_file) _graphNodes.add(n.source_file.replace(/\\/g, '/').toLowerCase());
            }
        } catch (_) {}
    }

    const rel = _toRelative(entity.path);
    if (!rel) return { status: 'SKIP', reason: 'No path' };

    return _graphNodes.has(rel.toLowerCase())
        ? { status: 'SYNC',  detail: `Indexed in graphify: ${rel}` }
        : { status: 'DRIFT', detail: `Not in graphify (run: graphify update .)` };
}

module.exports = { file_exists, git_tracked, file_search, graph_search };
