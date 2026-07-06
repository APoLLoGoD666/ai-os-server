'use strict';
// lib/registry/relationship-discovery.js — Multi-pass relationship discovery.
//
// Each pass inspects a different structural layer and emits candidate edges:
//
//   Pass 1: JavaScript (require/import)  → depends_on
//   Pass 2: SQL migrations               → produces, alters
//   Pass 3: Registry docs                → documents (ENT-ID cross-references in docs/)
//   Pass 4: Migration headers            → produces (via @ent-refs declarations)
//
// Discovered edges carry provenance: source, confidence, derived_from.
// They are candidates — the manually curated SEED relationships take precedence.

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
        if (!rel) continue;
        _pathIndex.set(rel, e.id);
        const noExt = rel.replace(/\.(js|ts)$/, '');
        if (noExt !== rel) _pathIndex.set(noExt, e.id);
        if (!rel.endsWith('/index') && !rel.endsWith('/index.js')) {
            _pathIndex.set(rel + '/index', e.id);
        }
    }

    return _pathIndex;
}

// ── Pass 1: JavaScript require/import ────────────────────────────────────────

const REQUIRE_RE = /require\(\s*['"`](\.[^'"`]+)['"`]\s*\)/g;
const IMPORT_RE  = /(?:import|from)\s+['"`](\.[^'"`]+)['"`]/g;

function _resolveImport(importPath, fromFile) {
    const fromDir = path.dirname(path.join(SCRIPTS_ROOT, fromFile));
    const abs     = path.resolve(fromDir, importPath);
    return path.relative(SCRIPTS_ROOT, abs).replace(/\\/g, '/').toLowerCase();
}

function _jsPass() {
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

            for (const re of [REQUIRE_RE, IMPORT_RE]) {
                re.lastIndex = 0;
                let m;
                while ((m = re.exec(content)) !== null) {
                    const targetRel = _resolveImport(m[1], relPath);
                    const toId = pathIndex.get(targetRel) ||
                                 pathIndex.get(targetRel + '.js') ||
                                 pathIndex.get(targetRel + '/index');
                    if (!toId || toId === fromId) continue;

                    // Determine line number for provenance
                    const lineNo = content.slice(0, m.index).split('\n').length;
                    edges.push({
                        from:         fromId,
                        to:           toId,
                        type:         'depends_on',
                        label:        `${relPath} requires ${engine.lookup(toId)?.name || toId}`,
                        confidence:   0.9,
                        source:       'js-import-scan',
                        derived_from: `${relPath}:${lineNo}`,
                    });
                }
            }
        }
    }

    scanDir(SCRIPTS_ROOT);
    return edges;
}

// ── Pass 2: SQL migrations — CREATE TABLE / ALTER TABLE ───────────────────────

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
const ALTER_TABLE_RE  = /ALTER\s+TABLE\s+(\w+)/gi;

function _sqlPass() {
    const edges  = [];
    const engine = require('./engine');

    // Build table-name → ENT-ID map
    const tableIndex = new Map();
    for (const e of engine.all()) {
        if (e.type === 'TABLE' && e.name) {
            tableIndex.set(e.name.toLowerCase(), e.id);
            // Also try common name variants
            tableIndex.set(e.name.toLowerCase().replace(/_/g, ''), e.id);
        }
    }

    // Build migration file → ENT-ID map
    const pathIndex = _buildPathIndex();

    const migsDir = path.join(SCRIPTS_ROOT, 'migrations');
    let files;
    try { files = fs.readdirSync(migsDir).filter(f => f.endsWith('.sql')).sort(); }
    catch (_) { return edges; }

    for (const filename of files) {
        const relPath = `migrations/${filename}`;
        const fromId  = pathIndex.get(relPath.toLowerCase());
        if (!fromId) continue;

        let content;
        try { content = fs.readFileSync(path.join(migsDir, filename), 'utf8'); }
        catch (_) { continue; }

        // CREATE TABLE → produces
        for (const re of [CREATE_TABLE_RE]) {
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(content)) !== null) {
                const tableName = m[1].toLowerCase();
                const toId = tableIndex.get(tableName) || tableIndex.get(tableName.replace(/_/g, ''));
                if (!toId || toId === fromId) continue;
                const lineNo = content.slice(0, m.index).split('\n').length;
                edges.push({
                    from:         fromId,
                    to:           toId,
                    type:         'produces',
                    label:        `${filename} creates table ${m[1]}`,
                    confidence:   0.95,
                    source:       'sql-ddl-scan',
                    derived_from: `${relPath}:${lineNo}`,
                });
            }
        }

        // ALTER TABLE → alters (expressed as depends_on for now)
        ALTER_TABLE_RE.lastIndex = 0;
        let m2;
        while ((m2 = ALTER_TABLE_RE.exec(content)) !== null) {
            const tableName = m2[1].toLowerCase();
            const toId = tableIndex.get(tableName) || tableIndex.get(tableName.replace(/_/g, ''));
            if (!toId || toId === fromId) continue;
            // Don't duplicate if we already have a produces edge
            if (edges.some(e => e.from === fromId && e.to === toId && e.type === 'produces')) continue;
            const lineNo = content.slice(0, m2.index).split('\n').length;
            edges.push({
                from:         fromId,
                to:           toId,
                type:         'depends_on',
                label:        `${filename} alters table ${m2[1]}`,
                confidence:   0.85,
                source:       'sql-ddl-scan',
                derived_from: `${relPath}:${lineNo}`,
            });
        }
    }

    return edges;
}

// ── Pass 3: Registry docs — ENT-ID cross-references ──────────────────────────

const ENT_RE = /ENT-\d{6}/g;

function _docPass() {
    const edges  = [];
    const engine = require('./engine');
    const docsDir = path.join(SCRIPTS_ROOT, 'docs');

    // Build doc file → ENT-ID map (each doc file is its own "entity")
    const pathIndex = _buildPathIndex();

    function scanDir(dir) {
        let entries;
        try { entries = fs.readdirSync(dir); } catch (_) { return; }
        for (const f of entries) {
            const full = path.join(dir, f);
            let stat;
            try { stat = fs.statSync(full); } catch (_) { continue; }
            if (stat.isDirectory()) { scanDir(full); continue; }
            if (!f.endsWith('.md')) continue;

            const relPath = path.relative(SCRIPTS_ROOT, full).replace(/\\/g, '/');
            const fromId  = pathIndex.get(relPath.toLowerCase());
            if (!fromId) continue;

            let content;
            try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }

            const ids = [...new Set(content.match(ENT_RE) || [])];
            for (const toId of ids) {
                if (toId === fromId) continue;
                if (!engine.lookup(toId)) continue;
                edges.push({
                    from:         fromId,
                    to:           toId,
                    type:         'governs',
                    label:        `${f} documents ${toId}`,
                    confidence:   0.7,
                    source:       'doc-ref-scan',
                    derived_from: relPath,
                });
            }
        }
    }

    scanDir(docsDir);
    return edges;
}

// ── Pass 4: Migration @ent-refs headers ───────────────────────────────────────

function _migrationHeaderPass() {
    const edges     = [];
    const pathIndex = _buildPathIndex();
    const ml        = require('./migration-lifecycle');

    for (const m of ml.scanMigrations()) {
        if (!m.governed || m.entRefs.length === 0) continue;
        const relPath = `migrations/${m.filename}`;
        const fromId  = pathIndex.get(relPath.toLowerCase());
        if (!fromId) continue;

        for (const toId of m.entRefs) {
            edges.push({
                from:         fromId,
                to:           toId,
                type:         'produces',
                label:        `Migration ${m.filename} declares ${toId}`,
                confidence:   1.0,
                source:       'migration-header',
                derived_from: relPath,
            });
        }
    }

    return edges;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function _dedup(edges) {
    const seen = new Set();
    return edges.filter(e => {
        const key = `${e.from}→${e.to}:${e.type}:${e.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run all discovery passes and return deduplicated candidate edges.
 * Each edge: { from, to, type, label, confidence, source, derived_from }
 */
function discover(passes = ['js', 'sql', 'migration-header']) {
    const edges = [];
    if (passes.includes('js'))               edges.push(..._jsPass());
    if (passes.includes('sql'))              edges.push(..._sqlPass());
    if (passes.includes('docs'))             edges.push(..._docPass());
    if (passes.includes('migration-header')) edges.push(..._migrationHeaderPass());
    return _dedup(edges);
}

/**
 * Discover relationships for a specific entity.
 */
function discoverFor(entityId, passes) {
    return discover(passes).filter(e => e.from === entityId || e.to === entityId);
}

/**
 * Merge discovered edges into the live relationship graph.
 * Only adds edges not already in the seed. Returns count added.
 */
function mergeIntoGraph(passes) {
    const rels     = require('./relationships');
    const existing = new Set(rels.all().map(r => `${r.from}→${r.to}:${r.type}`));
    const edges    = discover(passes);
    let added = 0;

    for (const e of edges) {
        const key = `${e.from}→${e.to}:${e.type}`;
        if (existing.has(key)) continue;
        try { rels.add(e.from, e.to, e.type, e.label); added++; }
        catch (_) {}
    }

    return added;
}

module.exports = { discover, discoverFor, mergeIntoGraph };
