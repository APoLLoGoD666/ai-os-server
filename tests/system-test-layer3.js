'use strict';
// APEX System Test — Layer 3: Memory Gateway
process.env.NODE_ENV = 'test';
require('dotenv').config();

const PASS = (label) => console.log(`  ✓ ${label}`);
const FAIL = (label, err) => { console.error(`  ✗ ${label}: ${err?.message || err}`); process.exitCode = 1; };

async function run() {
  console.log('\n=== LAYER 3: MEMORY GATEWAY ===\n');

  const gateway = require('../lib/memory/gateway');

  // 3.1 storeMemory layer 10 — AGENT entity (default layer, should be allowed)
  try {
    const id = await gateway.storeMemory({
      layer:   10,
      content: 'System test 3.1 — layer 10 AGENT write',
      tags:    ['system_test','layer10'],
      source:  'system_test',
      requestingEntity: 'developer_agent',
    });
    id ? PASS(`3.1 storeMemory layer 10 (AGENT): memoryId=${id}`) : FAIL('3.1 storeMemory layer 10', new Error('no memoryId returned'));
  } catch(e) { FAIL('3.1 storeMemory layer 10', e); }

  // 3.2 storeMemory layer 5 — civilization_runtime (SYSTEM)
  try {
    const id = await gateway.storeMemory({
      layer:   5,
      content: 'System test 3.2 — layer 5 SYSTEM write',
      tags:    ['system_test','layer5'],
      source:  'system_test',
      requestingEntity: 'civilization_runtime',
    });
    id ? PASS(`3.2 storeMemory layer 5 (civilization_runtime): memoryId=${id}`) : FAIL('3.2 storeMemory layer 5', new Error('no memoryId returned'));
  } catch(e) { FAIL('3.2 storeMemory layer 5', e); }

  // 3.3 storeMemory layer 11 — civilization_runtime (SYSTEM)
  try {
    const id = await gateway.storeMemory({
      layer:   11,
      content: 'System test 3.3 — layer 11 SYSTEM write',
      tags:    ['system_test','layer11'],
      source:  'system_test',
      requestingEntity: 'civilization_runtime',
    });
    id ? PASS(`3.3 storeMemory layer 11 (civilization_runtime): memoryId=${id}`) : FAIL('3.3 storeMemory layer 11', new Error('no memoryId returned'));
  } catch(e) { FAIL('3.3 storeMemory layer 11', e); }

  // 3.4 storeMemory with taskId: null — no FK violation
  try {
    const id = await gateway.storeMemory({
      layer:   10,
      content: 'System test 3.4 — taskId null episodic write',
      tags:    ['system_test','episodic'],
      source:  'civilization-kernel',
      taskId:  null,
      requestingEntity: 'civilization-kernel',
    });
    id ? PASS(`3.4 storeMemory taskId=null (no FK error): memoryId=${id}`) : FAIL('3.4 storeMemory null taskId', new Error('no memoryId'));
  } catch(e) { FAIL('3.4 storeMemory null taskId', e); }

  // 3.5 searchMemory — no error (empty result OK on fresh DB)
  try {
    const results = await gateway.searchMemory({
      query: 'system test',
      layers: [10, 11],
      limit: 5,
      requestingEntity: 'developer_agent',
    });
    Array.isArray(results) ? PASS(`3.5 searchMemory returns array (${results.length} results)`) : FAIL('3.5 searchMemory', new Error('not an array'));
  } catch(e) { FAIL('3.5 searchMemory', e); }

  // 3.6 AGENT blocked from layer 5 write (verify access controller in gateway context)
  try {
    let blocked = false;
    try {
      await gateway.storeMemory({
        layer:   5,
        content: 'should be blocked',
        tags:    [],
        source:  'test',
        requestingEntity: 'developer_agent',
      });
    } catch(e) {
      // AccessDeniedError: name='AccessDeniedError', message='AGENT (...) cannot WRITE layer 5'
      blocked = e.name === 'AccessDeniedError' || /cannot WRITE|access denied/i.test(e.message);
    }
    blocked ? PASS('3.6 AGENT blocked from layer 5 write (gateway enforces access control)') : FAIL('3.6 Layer 5 AGENT write should be blocked', new Error('write succeeded — access control not enforced'));
  } catch(e) { FAIL('3.6 Access control enforcement', e); }

  // 3.7 civilization-kernel entity — layer 10 write (episodic context)
  try {
    const id = await gateway.storeMemory({
      layer:   10,
      content: 'System test 3.7 — civilization-kernel entity write',
      tags:    ['system_test'],
      source:  'civilization-kernel',
      requestingEntity: 'civilization-kernel',
    });
    id ? PASS(`3.7 civilization-kernel WRITE layer 10: memoryId=${id}`) : FAIL('3.7 civilization-kernel write', new Error('no memoryId'));
  } catch(e) { FAIL('3.7 civilization-kernel write', e); }

  console.log('\n--- Layer 3 done ---\n');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
