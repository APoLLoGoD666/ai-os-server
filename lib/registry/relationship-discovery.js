'use strict';
// lib/registry/relationship-discovery.js — Step 2: Auto-populate relationships
//
// Scans the codebase for structural signals and emits candidate relationship edges:
//   depends_on   — require() / import calls between registered entities
//   produces     — migrations that declare @ent-refs (from migration-lifecycle headers)
//   belongs_to   — route files mounted under a parent path
//
// Discovered edges are "candidate" (confidence: 'auto') and complement the
// manually curated SEED relationships in relationships.js.

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../..');

// ── Path → ENT-ID reverse index ──────────────────────────────────────────────

let _pathIndex = null;

function _buildPathIndex() {
    if (_pathIndex) return _pathIndex;
    const engine = require('./engine');
    _pathIndex   = new Map();

    for (const e of engine.all()) {
        if (!e.path) continue;
        const rel = e.path
            .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
            .replace(/\\/g, '/')
            .toLowerCase();
        if (rel) _pathIndex.set(rel, e.id);
        // Also index without extension for js/ts
        const noExt = rel.replace(/\.(js|ts)$/, '');
        if (noExt !== rel) _pathIndex.set(noExt, e.id);
    }

    return _pathIndex;
}

// ── Require-call scanner ──────────────────────────────────────────────────────

const REQUIRE_RE = /require\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
const IMPORT_RE  = /(?:import|from)\s+['"`]([^'"`]+)['"`]/g;

function _resolveRequire(requirePath, fromFile) {
    if (!requirePath.startsWith('.')) return null;   // skip node_modules
    const fromDir = path.dirname(fromFile);
    const abs     = path.resolve(fromDir, requirePath);
    const rel     = path.relative(SCRIPTS_ROOT, abs).replace(/\\/g, '/').toLowerCase();
    return rel;
}

function _scanRequires(fileContent, filePath) {
    const pathIndex = _buildPathIndex();
    const found     = [];
    const fromFile  = path.join(SCRIPTS_ROOT, filePath);

    for (const re of [REQUIRE_RE, IMPORT_RE]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(fileContent)) !== null) {
            const target = _resolveRequire(m[1], fromFile);
            if (!target) continue;
            const targetId = pathIndex.get(target) || pathIndex.get(target + '.js') || pathIndex.get(target + '/index');
            if (targetId) found.push(targetId);
        }
    }

    return found;
}

// ── Migration header scanner ──────────────────────────────────────────────────

function _scanMigrations() {
    const edges = [];
    const ml    = require('./migration-lifecycle');
    const all   = ml.scanMigrations();

    for (const m of all) {
        if (!m.governed || m.entRefs.length === 0) continue;
        // Find ENT-ID for the migration file itself
        const pathIndex = _buildPathIndex();
        const migRel    = `migrations/${m.filename}`.toLowerCase();
        const fromId    = pathIndex.get(migRel);
        if (!fromId) continue;

        for (const toId of m.entRefs) {
            edges.push({
                from:       fromId,
                to:         toId,
                type:       'produces',
                label:      `Migration ${m.filename} produces ${toId}`,
                confidence: 'auto',
                source:     'migration-header',
            });
        }
    }

    return edges;
}

// ── JS file scanner ───────────────────────────────────────────────────────────

function _scanJsFiles() {
    const edges     = [];
    const pathIndex = _buildPathIndex();
    const engine    = require('./engine');

    function scanDir(dir) {
        let entries;
        try { entries = fs.readdirSync(dir); } catch (_) { return; }
        for (const f of entries) {
            const full = path.join(dir, f);
            let stat;
            try { stat = fs.statSync(full); } catch (_) { continue; }
            if (stat.isDirectory()) {
                if (['node_modules', '.git', 'graphify-out', '.claude-flow', '.swarm'].includes(f)) continue;
                scanDir(full);
                continue;
            }
            if (!f.endsWith('.js') && !f.endsWith('.ts')) continue;

            const relPath = path.relative(SCRIPTS_ROOT, full).replace(/\\/g, '/');
            const fromId  = pathIndex.get(relPath.toLowerCase()) ||
                            pathIndex.get(relPath.replace(/\.(js|ts)$/, '').toLowerCase());
            if (!fromId) continue;

            let content;
            try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }

            const targetIds = _scanRequires(content, relPath);
            for (const toId of targetIds) {
                if (toId === fromId) continue;
                edges.push({
                    from:       fromId,
                    to:         toId,
                    type:       'depends_on',
                    label:      `${relPath} requires ${engine.lookup(toId)?.name || toId}`,
                    confidence: 'auto',
                    source:     'require-scan',
                });
            }
        }
    }

    scanDir(SCRIPTS_ROOT);
    return edges;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function _dedup(edges) {
    const seen = new Set();
    return edges.filter(e => {
        const key = `${e.from}→${e.to}:${e.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Discover all candidate relationships from static analysis.
 * Returns array of {from, to, type, label, confidence, source}.
 */
function discover() {
    const edges = [
        ..._scanJsFiles(),
        ..._scanMigrations(),
    ];
    return _dedup(edges);
}

/**
 * Discover relationships for a single entity (both outgoing and incoming).
 */
function discoverFor(entityId) {
    return discover().filter(e => e.from === entityId || e.to === entityId);
}

/**
 * Merge discovered edges into the relationship graph (deduplicating against SEED).
 * Returns count of newly added edges.
 */
function mergeIntoGraph() {
    const rels      = require('./relationships');
    const existing  = new Set(rels.all().map(r => `${r.from}→${r.to}:${r.type}`));
    const candidates = discover();
    let added = 0;

    for (const e of candidates) {
        const key = `${e.from}→${e.to}:${e.type}`;
        if (existing.has(key)) continue;
        try {
            rels.add(e.from, e.to, e.type, e.label);
            added++;
        } catch (_) {}
    }

    return added;
}

module.exports = { discover, discoverFor, mergeIntoGraph };
