'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg = require('../../lib/registry');
const rels = reg.relationships;

const KNOWN_ID = 'ENT-000388';

module.exports = async function run() {
    await suite('Relationships', async () => {
        await test('all() returns non-empty array', () => {
            const all = rels.all();
            assert(Array.isArray(all));
            assert(all.length > 0, `expected edges, got ${all.length}`);
        });

        await test('each edge has from, to, type', () => {
            for (const e of rels.all()) {
                assert(e.from, `edge missing from: ${JSON.stringify(e)}`);
                assert(e.to,   `edge missing to: ${JSON.stringify(e)}`);
                assert(e.type, `edge missing type: ${JSON.stringify(e)}`);
            }
        });

        await test('relationsOf(known id) returns outgoing edges with to and type', () => {
            const out = rels.relationsOf(KNOWN_ID);
            assert(Array.isArray(out));
            assert(out.length > 0, 'ENT-000388 should have outgoing edges');
            for (const e of out) {
                assert(e.to,   `edge missing to: ${JSON.stringify(e)}`);
                assert(e.type, `edge missing type: ${JSON.stringify(e)}`);
                assert.notStrictEqual(e.to, KNOWN_ID, 'outgoing edge.to should not be self');
            }
        });

        await test('reverseRelationsOf(known id) returns incoming sources', () => {
            const inn = rels.reverseRelationsOf(KNOWN_ID);
            assert(Array.isArray(inn));
            assert(inn.length > 0, 'ENT-000388 should have incoming edges');
            for (const e of inn) {
                assert(e.type, `edge missing type: ${JSON.stringify(e)}`);
            }
        });

        await test('relationsOf(unknown id) returns empty array', () => {
            assert.deepStrictEqual(rels.relationsOf('ENT-999999'), []);
        });

        await test('reverseRelationsOf(unknown id) returns empty array', () => {
            assert.deepStrictEqual(rels.reverseRelationsOf('ENT-999999'), []);
        });

        await test('graph(id, depth) returns {nodes, edges}', () => {
            const g = rels.graph(KNOWN_ID, 2);
            assert(g, 'should return graph');
            assert(Array.isArray(g.nodes), 'nodes should be array');
            assert(Array.isArray(g.edges), 'edges should be array');
            assert(g.nodes.includes(KNOWN_ID), 'root should be in nodes');
        });

        await test('graph respects depth=1', () => {
            const g1 = rels.graph(KNOWN_ID, 1);
            const g2 = rels.graph(KNOWN_ID, 3);
            assert(g2.nodes.length >= g1.nodes.length, 'deeper should have >= nodes');
        });
    });
};
