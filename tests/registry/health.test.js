'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg  = require('../../lib/registry');
const eng  = reg.engine;
const proj = reg.projections;
const hs   = require('../../lib/registry/health-score');

const KNOWN_ID = 'ENT-000388';

module.exports = async function run() {
    await suite('Health Score', async () => {
        await test('compute returns {score, confidence, label, evidence}', () => {
            const e = eng.lookup(KNOWN_ID);
            const projs = proj.checkAllProjections(e);
            const h = hs.compute(e, projs);
            assert(typeof h.score      === 'number', 'score should be number');
            assert(typeof h.confidence === 'number', 'confidence should be number');
            assert(typeof h.label      === 'string', 'label should be string');
            assert(Array.isArray(h.evidence), 'evidence should be array');
        });

        await test('score is in range 0-100', () => {
            const e = eng.lookup(KNOWN_ID);
            const h = hs.compute(e, proj.checkAllProjections(e));
            assert(h.score >= 0 && h.score <= 100, `score ${h.score} out of range`);
        });

        await test('confidence is in range 0-1', () => {
            const e = eng.lookup(KNOWN_ID);
            const h = hs.compute(e, proj.checkAllProjections(e));
            assert(h.confidence >= 0 && h.confidence <= 1, `confidence ${h.confidence} out of range`);
        });

        await test('label is a non-empty string', () => {
            const e = eng.lookup(KNOWN_ID);
            const h = hs.compute(e, proj.checkAllProjections(e));
            assert(h.label.length > 0, 'label should not be empty');
        });

        await test('entity with all DRIFT projections has lower score than SYNC', () => {
            const e = eng.lookup(KNOWN_ID);
            const syncProjs  = proj.checkAllProjections(e).map(p => ({ ...p, status: 'SYNC'  }));
            const driftProjs = proj.checkAllProjections(e).map(p => ({ ...p, status: 'DRIFT' }));
            const hSync  = hs.compute(e, syncProjs);
            const hDrift = hs.compute(e, driftProjs);
            assert(hSync.score >= hDrift.score, `SYNC score ${hSync.score} should be >= DRIFT score ${hDrift.score}`);
        });

        await test('each evidence item has source, weight, value, status', () => {
            const e = eng.lookup(KNOWN_ID);
            const h = hs.compute(e, proj.checkAllProjections(e));
            for (const ev of h.evidence) {
                assert(ev.source, 'evidence missing source');
                assert(typeof ev.weight === 'number', 'evidence weight should be number');
                assert(typeof ev.value  === 'number', 'evidence value should be number');
                assert(ev.status, 'evidence missing status');
            }
        });
    });
};
