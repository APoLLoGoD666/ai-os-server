'use strict';
// Tests for lib/registry/visualize.js — Mermaid, DOT, ASCII, subgraphMermaid.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { toMermaid, toDot, toAscii, subgraphMermaid } = require('../../lib/registry/visualize');
const impact = require('../../lib/registry/impact');

const KNOWN_ID = 'ENT-000388';

// Synthetic minimal report for pure-function tests
const MINI_REPORT = {
    root:      'ENT-000001',
    root_name: 'Test Root',
    affected: {
        direct: [
            { id: 'ENT-000002', name: 'Child A', rel_type: 'depends_on', family: 'Service', type: 'API' },
            { id: 'ENT-000003', name: 'Child B', rel_type: 'owns',       family: 'Data',    type: 'Table' },
        ],
        transitive_ids: ['ENT-000004', 'ENT-000005'],
    },
};

module.exports = async function run() {
    await suite('toMermaid', async () => {
        await test('returns string starting with "flowchart LR"', () => {
            const s = toMermaid(MINI_REPORT);
            assert(typeof s === 'string', 'should return string');
            assert(s.startsWith('flowchart LR'), `expected "flowchart LR", got: ${s.slice(0, 30)}`);
        });

        await test('null report returns safe fallback', () => {
            const s = toMermaid(null);
            assert(typeof s === 'string');
            assert(s.includes('flowchart'));
        });

        await test('includes root node', () => {
            const s = toMermaid(MINI_REPORT);
            assert(s.includes('ENT_000001') || s.includes('ENT-000001'), 'should include root id');
        });

        await test('includes direct children', () => {
            const s = toMermaid(MINI_REPORT);
            assert(s.includes('ENT_000002') || s.includes('ENT-000002'));
            assert(s.includes('ENT_000003') || s.includes('ENT-000003'));
        });

        await test('includes transitive nodes', () => {
            const s = toMermaid(MINI_REPORT);
            assert(s.includes('ENT_000004') || s.includes('ENT-000004'));
        });

        await test('real impact report produces valid Mermaid', () => {
            const report = impact.analyze(KNOWN_ID, { depth: 2 });
            assert(report !== null);
            const s = toMermaid(report);
            assert(typeof s === 'string');
            assert(s.startsWith('flowchart LR'));
        });
    });

    await suite('toDot', async () => {
        await test('returns string starting with "digraph Registry"', () => {
            const s = toDot(MINI_REPORT);
            assert(typeof s === 'string');
            assert(s.startsWith('digraph Registry'), `got: ${s.slice(0, 40)}`);
        });

        await test('null report returns safe fallback', () => {
            const s = toDot(null);
            assert(typeof s === 'string');
            assert(s.includes('digraph'));
        });

        await test('includes root and direct children', () => {
            const s = toDot(MINI_REPORT);
            assert(s.includes('ENT-000001'));
            assert(s.includes('ENT-000002'));
        });

        await test('includes rankdir=LR', () => {
            const s = toDot(MINI_REPORT);
            assert(s.includes('rankdir=LR'));
        });

        await test('closes with "}"', () => {
            const s = toDot(MINI_REPORT);
            assert(s.trim().endsWith('}'));
        });
    });

    await suite('toAscii', async () => {
        await test('returns non-empty string', () => {
            const s = toAscii(MINI_REPORT);
            assert(typeof s === 'string');
            assert(s.length > 0);
        });

        await test('null report returns safe fallback', () => {
            const s = toAscii(null);
            assert(typeof s === 'string');
        });

        await test('first line contains root id', () => {
            const s = toAscii(MINI_REPORT);
            const firstLine = s.split('\n')[0];
            assert(firstLine.includes('ENT-000001'), `root missing from first line: ${firstLine}`);
        });

        await test('shows direct children with tree prefix', () => {
            const s = toAscii(MINI_REPORT);
            assert(s.includes('ENT-000002') || s.includes('├──') || s.includes('└──'));
        });

        await test('shows transitive count when present', () => {
            const s = toAscii(MINI_REPORT);
            assert(s.includes('transitive'), `should mention transitive nodes: ${s}`);
        });
    });

    await suite('subgraphMermaid', async () => {
        await test('returns string starting with "flowchart LR"', () => {
            const nodes = [{ id: 'A', name: 'Alpha' }, { id: 'B', name: 'Beta' }];
            const edges = [{ from: 'A', to: 'B', type: 'owns', label: 'owns' }];
            const s = subgraphMermaid(nodes, edges);
            assert(typeof s === 'string');
            assert(s.startsWith('flowchart LR'));
        });

        await test('empty input returns valid header', () => {
            const s = subgraphMermaid([], []);
            assert(typeof s === 'string');
            assert(s.includes('flowchart LR'));
        });

        await test('includes node IDs', () => {
            const nodes = [{ id: 'ENT-000001', name: 'Root' }];
            const s = subgraphMermaid(nodes, []);
            assert(s.includes('ENT_000001') || s.includes('ENT-000001'));
        });
    });

    await suite('impact.mermaid / impact.dot intents', async () => {
        await test('impact.mermaid intent returns mermaid string', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('impact.mermaid', { id: KNOWN_ID, depth: 2 });
            assert.strictEqual(r.ok, true, r.error);
            assert(typeof r.result.mermaid === 'string');
            assert(r.result.mermaid.startsWith('flowchart LR'));
        });

        await test('impact.dot intent returns dot string', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('impact.dot', { id: KNOWN_ID, depth: 2 });
            assert.strictEqual(r.ok, true, r.error);
            assert(typeof r.result.dot === 'string');
            assert(r.result.dot.startsWith('digraph'));
        });

        await test('relationship.mermaid intent returns mermaid string', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('relationship.mermaid', { id: KNOWN_ID, depth: 2 });
            assert.strictEqual(r.ok, true, r.error);
            assert(typeof r.result.mermaid === 'string');
        });
    });
};
