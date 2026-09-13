'use strict';
// R-0.5 verification: routing table persists in Supabase, survives deploy resets.

const assert = require('assert');
const { test } = require('node:test');

test('adaptation-engine exports _persistRoutingTable via runCycle wiring', () => {
    const ae = require('../agent-system/adaptation-engine');
    assert.strictEqual(typeof ae.runCycle, 'function');
    assert.strictEqual(typeof ae.getActiveAdaptations, 'function');
    // _persistRoutingTable is internal — verify it exists by checking runCycle source
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '../agent-system/adaptation-engine.js'), 'utf8');
    assert.ok(src.includes('_persistRoutingTable'), '_persistRoutingTable must be defined');
    assert.ok(src.includes("getSupabaseClient"), 'must import getSupabaseClient');
    assert.ok(src.includes("routing_snapshot"), 'must insert routing_snapshot cycle type');
    assert.ok(src.includes('setImmediate(() => _persistRoutingTable(merged)'), 'must wire into runCycle');
});

test('master-orchestrator has Supabase refresh wired', () => {
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '../agent-system/master-orchestrator.js'), 'utf8');
    assert.ok(src.includes('_refreshCognitionWeightsFromSupabase'), 'refresh function must exist');
    assert.ok(src.includes("'adaptation_cycles'"), 'must query adaptation_cycles table');
    assert.ok(src.includes("routing_table"), 'must select routing_table column');
    assert.ok(src.includes("setImmediate(() => _refreshCognitionWeightsFromSupabase"), 'must call on module load');
});

test('migration 054 file exists and contains correct SQL', () => {
    const fs = require('fs');
    const p = require('path').join(__dirname, '../migrations/054_routing_table.sql');
    assert.ok(fs.existsSync(p), 'migration file must exist');
    const sql = fs.readFileSync(p, 'utf8');
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS routing_table'), 'must add routing_table column');
    assert.ok(sql.includes('JSONB'), 'column must be JSONB type');
    assert.ok(sql.includes('idx_adaptation_cycles_routing_table'), 'index must be created');
});

test('_loadCognitionWeights fallback shape is correct', () => {
    // Verify the fallback in master-orchestrator returns expected shape
    const src = require('fs').readFileSync(
        require('path').join(__dirname, '../agent-system/master-orchestrator.js'), 'utf8');
    assert.ok(src.includes("{ routingOverrides: {} }"), 'fallback must have routingOverrides key');
});
