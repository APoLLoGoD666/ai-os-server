'use strict';
// lib/registry/relationship-discovery/ownership-pass.js — Reads ownership.yaml files.
//
// Discovers edges from declared domain ownership, dependencies, and consumers.
// Every directory with an ownership.yaml becomes a participant in the graph.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../../');

// Simple YAML line parser — handles "key: value" and "  - item" lists.
function parseOwnershipYaml(content) {
    const result = {};
    let   currentKey = null;

    for (const raw of content.split('\n')) {
        const line = raw.trimEnd();
        if (!line || line.startsWith('#')) continue;

        const listMatch = line.match(/^[ \t]+-\s+(.+)$/);
        if (listMatch && currentKey) {
            if (!Array.isArray(result[currentKey])) result[currentKey] = [];
            result[currentKey].push(listMatch[1].trim());
            continue;
        }

        const kvMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
        if (kvMatch) {
            const key = kvMatch[1];
            const val = kvMatch[2].trim();
            result[key] = val === '' ? [] : val === 'true' ? true : val === 'false' ? false : val;
            currentKey  = key;
        }
    }
    return result;
}

// Walk the project root for ownership.yaml files (max depth 3 to avoid node_modules)
function findOwnershipFiles(dir, depth = 0) {
    if (depth > 3) return [];
    const results = [];
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findOwnershipFiles(fullPath, depth + 1));
        } else if (entry.name === 'ownership.yaml') {
            results.push(fullPath);
        }
    }
    return results;
}

// Domain name → DOM-* entity lookup
const DOMAIN_NAME_MAP = {
    'civilisation':  'DOM-000001',
    'intelligence':  'DOM-000002',
    'registry':      'DOM-000003',
    'memory':        'DOM-000004',
    'infrastructure':'DOM-000005',
    'observability': 'DOM-000006',
    'interface':     'DOM-000007',
    'knowledge':     'DOM-000008',
    'development':   'DOM-000009',
    'experiments':   'DOM-000010',
};

function resolveDomainId(name) {
    return DOMAIN_NAME_MAP[name.toLowerCase()] || null;
}

const ownershipPlugin = {
    name:        'ownership',
    description: 'Discovers domain membership, dependency, and consumer edges from ownership.yaml files',
    fileTypes:   ['yaml'],
    confidence:  0.95,

    discover(ctx) {
        const edges = [];
        const files = findOwnershipFiles(ROOT);

        for (const file of files) {
            let content;
            try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
            const data = parseOwnershipYaml(content);

            const entityId = data.entity_id;
            if (!entityId) continue;

            const domainId = resolveDomainId(String(data.domain || ''));

            // entity → domain: belongs_to edge
            if (domainId && entityId !== domainId) {
                edges.push({
                    from:       entityId,
                    to:         domainId,
                    type:       'belongs_to',
                    source:     'ownership',
                    confidence: 0.95,
                    label:      `${data.capability || entityId} belongs to ${data.domain}`,
                    strength:   'required',
                    reason:     'declared in ownership.yaml',
                });
            }

            // entity → dependency domains: depends_on edges
            for (const dep of Array.isArray(data.dependencies) ? data.dependencies : []) {
                const depId = resolveDomainId(dep);
                if (depId && depId !== entityId) {
                    edges.push({
                        from:       entityId,
                        to:         depId,
                        type:       'depends_on',
                        source:     'ownership',
                        confidence: 0.90,
                        label:      `${entityId} depends on ${dep}`,
                        strength:   'required',
                        reason:     'declared in ownership.yaml dependencies',
                    });
                }
            }
        }

        return edges;
    },

    validate(edge) {
        return !!(edge.from && edge.to && edge.type && edge.source && edge.confidence !== undefined);
    },
};

module.exports = { ownershipPlugin };
