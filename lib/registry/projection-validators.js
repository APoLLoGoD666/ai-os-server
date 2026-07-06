'use strict';
// lib/registry/projection-validators.js — Projection validator implementations.
// Each validator: (entity, rule) → { status: 'SYNC'|'DRIFT'|'SKIP', ...detail }
// Sources are loaded and cached at module level (one scan per process lifetime).

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../..');
const VAULT_DIR    = path.join('C:', 'Users', 'arwwo', 'Desktop', 'APEX', 'APEX AI OS', 'System', 'Claude-Memory');

// ── Source content cache ─────────────────────────────────────────────────────

const _sourceCache = new Map();

function _readDir(dir, exts = ['.md', '.js', '.ts', '.json', '.sql']) {
    const parts = [];
    let entries;
    try { entries = fs.readdirSync(dir); } catch (_) { return parts; }
    for (const f of entries) {
        const full = path.join(dir, f);
        let stat;
        try { stat = fs.statSync(full); } catch (_) { continue; }
        if (stat.isDirectory()) { parts.push(..._readDir(full, exts)); continue; }
        if (!exts.some(e => f.endsWith(e))) continue;
        try { parts.push(fs.readFileSync(full, 'utf8')); } catch (_) {}
    }
    return parts;
}

function _loadSource(source) {
    if (_sourceCache.has(source)) return _sourceCache.get(source);
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
        const abs = path.join(SCRIPTS_ROOT, source);
        let stat;
        try { stat = fs.statSync(abs); } catch (_) { _sourceCache.set(source, ''); return ''; }
        content = stat.isDirectory()
            ? _readDir(abs).join('\n')
            : (() => { try { return fs.readFileSync(abs, 'utf8'); } catch (_) { return ''; } })();
    }

    _sourceCache.set(source, content);
    return content;
}

function _combinedContent(sources) {
    return (sources || []).map(_loadSource).join('\n');
}

// ── Path normalisation ───────────────────────────────────────────────────────

function _toRelative(registeredPath) {
    return (registeredPath || '')
        .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
        .replace(/\\/g, '/');
}

function _toAbsolutePath(registeredPath) {
    const rel = _toRelative(registeredPath);
    if (!rel) return null;
    return path.join(SCRIPTS_ROOT, rel.replace(/\//g, path.sep));
}

// ── Validators ───────────────────────────────────────────────────────────────

function file_exists(entity) {
    const abs = _toAbsolutePath(entity.path);
    if (!abs) return { status: 'SKIP', reason: 'Path not resolvable' };
    if (fs.existsSync(abs)) return { status: 'SYNC', path: abs };
    return { status: 'DRIFT', detail: `Not found on disk: ${abs}` };
}

function git_tracked(entity) {
    const rel = _toRelative(entity.path);
    if (!rel) return { status: 'SKIP', reason: 'No path' };
    try {
        const { execSync } = require('child_process');
        const winRel = rel.replace(/\//g, path.sep);
        const result = execSync(`git -C "${SCRIPTS_ROOT}" ls-files --error-unmatch "${winRel}"`, { stdio: 'pipe' }).toString().trim();
        return result ? { status: 'SYNC', tracked: rel } : { status: 'DRIFT', detail: 'Not tracked by git' };
    } catch (_) {
        return { status: 'DRIFT', detail: 'Not tracked in git repository' };
    }
}

function content_contains_path(entity, rule) {
    const rel        = _toRelative(entity.path);
    if (!rel) return { status: 'SKIP', reason: 'No path' };
    const normalized = rel.replace(/\.(js|ts)$/, '');
    const content    = _combinedContent(rule.sources);
    if (content.includes(rel) || content.includes(normalized) || content.includes('./' + normalized)) {
        return { status: 'SYNC', detail: `Found in: ${(rule.sources || []).join(', ')}` };
    }
    return { status: 'DRIFT', detail: `Path not found in: ${(rule.sources || []).join(', ')}` };
}

function id_in_content(entity, rule) {
    const content = _combinedContent(rule.sources);
    if (content.includes(entity.id)) {
        return { status: 'SYNC', detail: `${entity.id} referenced in: ${(rule.sources || []).join(', ')}` };
    }
    return { status: 'DRIFT', detail: `${entity.id} not found in: ${(rule.sources || []).join(', ')}` };
}

function id_or_name_in_content(entity, rule) {
    const content = _combinedContent(rule.sources);
    if (content.includes(entity.id)) {
        return { status: 'SYNC', detail: `${entity.id} found in sources` };
    }
    if (entity.name && content.includes(entity.name)) {
        return { status: 'SYNC', detail: `Name "${entity.name}" found in sources` };
    }
    return { status: 'DRIFT', detail: `Not found in: ${(rule.sources || []).join(', ')}` };
}

let _graphNodes = null;
function in_graph(entity, rule) {
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
    if (_graphNodes.has(rel.toLowerCase())) {
        return { status: 'SYNC', detail: `Indexed in graphify: ${rel}` };
    }
    return { status: 'DRIFT', detail: `Not in graphify (run: graphify update .)` };
}

module.exports = { file_exists, git_tracked, content_contains_path, id_in_content, id_or_name_in_content, in_graph };
