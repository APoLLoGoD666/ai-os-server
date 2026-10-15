'use strict';
// lib/registry/visualize.js — Graph output formatters (Mermaid, DOT, ASCII).
//
// All functions are pure: they take a report or {nodes, edges} object and return a string.
// No I/O is performed.

// Replace non-alphanumeric characters with underscores for use as Mermaid/DOT node IDs.
function _safeId(id) {
    return String(id).replace(/[^a-zA-Z0-9]/g, '_');
}

function _esc(str) {
    return String(str || '').replace(/"/g, '\\"');
}

// ── Impact report → Mermaid flowchart ────────────────────────────────────────
// report: return value of impact.analyze()
// Returns a Mermaid flowchart LR string.
function toMermaid(report, opts = {}) {
    if (!report) return 'flowchart LR\n  %% no data';
    const { root, root_name, affected } = report;
    const maxNodes = opts.limit || 40;
    const lines = ['flowchart LR'];

    const rId    = _safeId(root);
    const rLabel = root_name ? `"${_esc(root_name)}\\n${_esc(root)}"` : `"${_esc(root)}"`;
    lines.push(`  ${rId}[${rLabel}]:::root`);

    const direct = (affected.direct || []).slice(0, maxNodes);
    for (const node of direct) {
        const nId    = _safeId(node.id);
        const nLabel = node.name ? `"${_esc(node.name)}\\n${_esc(node.id)}"` : `"${_esc(node.id)}"`;
        lines.push(`  ${nId}[${nLabel}]`);
        lines.push(`  ${rId} --"${_esc(node.rel_type)}"--\x3e ${nId}`);
    }

    const transitive = (affected.transitive_ids || []).slice(0, maxNodes);
    for (const id of transitive) {
        lines.push(`  ${_safeId(id)}([${_esc(id)}])`);
    }

    lines.push('  classDef root fill:#4a90d9,color:#fff,stroke:#2c6fad');
    return lines.join('\n');
}

// ── Impact report → Graphviz DOT digraph ─────────────────────────────────────
function toDot(report, opts = {}) {
    if (!report) return 'digraph Registry {}';
    const { root, root_name, affected } = report;
    const maxNodes = opts.limit || 40;
    const lines = [
        'digraph Registry {',
        '  rankdir=LR;',
        '  node [shape=box, fontname="Helvetica"];',
    ];

    const rLabel = root_name ? `${_esc(root_name)}\\n${_esc(root)}` : _esc(root);
    lines.push(`  "${_esc(root)}" [label="${rLabel}", style=filled, fillcolor="#4a90d9", fontcolor=white];`);

    const direct = (affected.direct || []).slice(0, maxNodes);
    for (const node of direct) {
        const nLabel = node.name ? `${_esc(node.name)}\\n${_esc(node.id)}` : _esc(node.id);
        lines.push(`  "${_esc(node.id)}" [label="${nLabel}"];`);
        lines.push(`  "${_esc(root)}" -> "${_esc(node.id)}" [label="${_esc(node.rel_type)}"];`);
    }

    const transitive = (affected.transitive_ids || []).slice(0, maxNodes);
    for (const id of transitive) {
        lines.push(`  "${_esc(id)}" [style=dashed];`);
    }

    lines.push('}');
    return lines.join('\n');
}

// ── Impact report → ASCII tree ────────────────────────────────────────────────
function toAscii(report, opts = {}) {
    if (!report) return '(no data)';
    const { root, root_name, affected } = report;
    const maxShown    = opts.limit || 20;
    const direct      = (affected.direct || []).slice(0, maxShown);
    const transitiveN = (affected.transitive_ids || []).length;
    const hasMore     = transitiveN > 0;
    const lines       = [];

    lines.push(`[${root}] ${root_name || ''}`);
    for (let i = 0; i < direct.length; i++) {
        const isLast = i === direct.length - 1 && !hasMore;
        const pfx    = isLast ? '└── ' : '├── ';
        const node   = direct[i];
        lines.push(`${pfx}${node.id} — ${node.name || ''} (${node.rel_type})`);
    }
    if (hasMore) {
        lines.push(`└── … ${transitiveN} transitive node${transitiveN === 1 ? '' : 's'}`);
    }

    return lines.join('\n');
}

// ── Relationship subgraph → Mermaid ──────────────────────────────────────────
// nodes: array of { id, name?, ... }
// edges: array of { from, to, type, label? }
function subgraphMermaid(nodes, edges, opts = {}) {
    const maxNodes = opts.limit || 60;
    const lines    = ['flowchart LR'];

    const nodeSet = new Set((nodes || []).map(n => (typeof n === 'string' ? n : n.id)));
    for (const n of [...nodeSet].slice(0, maxNodes)) {
        const obj   = (nodes || []).find(x => (typeof x === 'string' ? x : x.id) === n);
        const name  = obj && obj.name ? `"${_esc(obj.name)}\\n${_esc(n)}"` : `"${_esc(n)}"`;
        lines.push(`  ${_safeId(n)}[${name}]`);
    }

    const seen = new Set();
    for (const e of (edges || []).slice(0, maxNodes * 2)) {
        const key = `${e.from}-${e.to}-${e.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const label = e.label || e.type || '';
        lines.push(`  ${_safeId(e.from)} --"${_esc(label)}"--\x3e ${_safeId(e.to)}`);
    }

    return lines.join('\n');
}

module.exports = { toMermaid, toDot, toAscii, subgraphMermaid };
