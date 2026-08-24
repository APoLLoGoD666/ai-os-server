'use strict';
// tests/dom000001-bootstrap.test.js
// T4-05: DOM-000001 Operationalization Bootstrap — Constitutional Test Suite

const assert = require('assert');
const path   = require('path');

let passed = 0;
let failed = 0;

function test(label, fn) {
    try {
        fn();
        console.log(`  PASS  ${label}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${label}: ${err.message}`);
        failed++;
    }
}

async function testAsync(label, fn) {
    try {
        await fn();
        console.log(`  PASS  ${label}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${label}: ${err.message}`);
        failed++;
    }
}

// ── Module cache helper ───────────────────────────────────────────────────────
// constitutional-store exports a frozen object; direct property assignment
// fails. Load a fresh dom000001-bootstrap instance with an injected write stub.
async function withFreshBootstrap(mockWrite, fn) {
    const storePath = require.resolve('../lib/runtime/constitutional-store');
    const bootPath  = require.resolve('../lib/civilization/dom000001-bootstrap');

    const origStore = require.cache[storePath];
    const origBoot  = require.cache[bootPath];

    require.cache[storePath] = {
        id: storePath, filename: storePath, loaded: true,
        exports: { write: mockWrite },
    };
    delete require.cache[bootPath];

    try {
        const freshBoot = require('../lib/civilization/dom000001-bootstrap');
        await fn(freshBoot);
    } finally {
        require.cache[storePath] = origStore;
        require.cache[bootPath]  = origBoot;
    }
}

// ─── 1. Module loading and exports ───────────────────────────────────────────

test('T4-05-A: dom000001-bootstrap.js loads without error', () => {
    const m = require('../lib/civilization/dom000001-bootstrap');
    assert.ok(m, 'module must be truthy');
});

test('T4-05-B: module exports are frozen', () => {
    const m = require('../lib/civilization/dom000001-bootstrap');
    assert.ok(Object.isFrozen(m), 'module.exports must be Object.freeze()');
});

test('T4-05-C: formDom000001Operationalization is exported as a function', () => {
    const m = require('../lib/civilization/dom000001-bootstrap');
    assert.strictEqual(typeof m.formDom000001Operationalization, 'function');
});

test('T4-05-D: all expected exports are present', () => {
    const m = require('../lib/civilization/dom000001-bootstrap');
    const required = [
        'formDom000001Operationalization',
        '_generateDomOperRef',
        '_emitted',
        'BOOTSTRAP_DOMAIN_ID',
        'DOM_PROFILE_REF',
        'BOOTSTRAP_OPER_LEVEL',
        'AUDIT_RECORD_REF_BOOTSTRAP',
    ];
    for (const k of required) {
        assert.ok(k in m, `export '${k}' must be present`);
    }
});

// ─── 2. Constants ────────────────────────────────────────────────────────────

test('T4-05-E: BOOTSTRAP_DOMAIN_ID is DOM-000001', () => {
    const { BOOTSTRAP_DOMAIN_ID } = require('../lib/civilization/dom000001-bootstrap');
    assert.strictEqual(BOOTSTRAP_DOMAIN_ID, 'DOM-000001');
});

test('T4-05-F: DOM_PROFILE_REF is dp-DOM-000001 (W2-06 format)', () => {
    const { DOM_PROFILE_REF } = require('../lib/civilization/dom000001-bootstrap');
    assert.strictEqual(DOM_PROFILE_REF, 'dp-DOM-000001');
});

test('T4-05-G: BOOTSTRAP_OPER_LEVEL is BOOTSTRAP-DECISION-FILTER (L-T4-05-01)', () => {
    const { BOOTSTRAP_OPER_LEVEL } = require('../lib/civilization/dom000001-bootstrap');
    assert.strictEqual(BOOTSTRAP_OPER_LEVEL, 'BOOTSTRAP-DECISION-FILTER');
});

test('T4-05-H: AUDIT_RECORD_REF_BOOTSTRAP contains CAR-RT04-BOOTSTRAP (L-T4-05-02)', () => {
    const { AUDIT_RECORD_REF_BOOTSTRAP } = require('../lib/civilization/dom000001-bootstrap');
    assert.ok(AUDIT_RECORD_REF_BOOTSTRAP.includes('CAR-RT04-BOOTSTRAP'),
        'audit_record_ref must reference T4-04 pattern (L-T4-05-02)');
});

// ─── 3. ID generation ────────────────────────────────────────────────────────

test('T4-05-I: _generateDomOperRef returns DOM-OPER-BOOTSTRAP-v1-* format', () => {
    const { _generateDomOperRef } = require('../lib/civilization/dom000001-bootstrap');
    const ts  = '2026-08-20T12:00:00.000Z';
    const ref = _generateDomOperRef(ts);
    assert.ok(ref.startsWith('DOM-OPER-BOOTSTRAP-v1-'), 'must start with DOM-OPER-BOOTSTRAP-v1-');
    assert.ok(ref.includes(ts), 'must include the timestamp');
});

// ─── 7. Deliberation-registry wiring (RT-12 decision filter) ─────────────────
// (Synchronous — _buildDrParticipants is not async)

test('T4-05-V: _buildDrParticipants with domOperRef sets DOM-000001 OPERATIONAL', () => {
    const { _buildDrParticipants } = require('../lib/civilization/deliberation-registry');
    const participants = _buildDrParticipants(undefined, 'DOM-OPER-BOOTSTRAP-v1-TEST');
    const dom = participants.find(p => p.runtime === 'DOM-000001');
    assert.ok(dom, 'DOM-000001 participant must exist');
    assert.strictEqual(dom.status, 'OPERATIONAL',
        'T4-05: DOM-000001 status must be OPERATIONAL when domOperRef present');
    assert.ok(dom.note.includes('DOM-OPER-BOOTSTRAP-v1-TEST'),
        'note must reference the domOperRef');
});

test('T4-05-W: _buildDrParticipants without domOperRef preserves NOT-OPERATIONAL (backward compat)', () => {
    const { _buildDrParticipants } = require('../lib/civilization/deliberation-registry');
    const participants = _buildDrParticipants();
    const dom = participants.find(p => p.runtime === 'DOM-000001');
    assert.ok(dom, 'DOM-000001 participant must exist');
    assert.strictEqual(dom.status, 'NOT-OPERATIONAL',
        'backward compat: DOM-000001 must remain NOT-OPERATIONAL when domOperRef absent');
    assert.ok(dom.note.includes('L-DR-03'), 'note must reference L-DR-03');
});

test('T4-05-X: _buildDrParticipants still returns 5 participants with domOperRef', () => {
    const { _buildDrParticipants } = require('../lib/civilization/deliberation-registry');
    const participants = _buildDrParticipants(undefined, 'DOM-OPER-BOOTSTRAP-v1-TEST');
    assert.strictEqual(participants.length, 5, 'must still return exactly 5 participants');
});

test('T4-05-Y: _buildDrParticipants with cmId and domOperRef — all roles correct', () => {
    const { _buildDrParticipants } = require('../lib/civilization/deliberation-registry');
    const participants = _buildDrParticipants('CM-TEST-Y', 'DOM-OPER-BOOTSTRAP-v1-TEST-Y');
    const roles = participants.map(p => p.role);
    assert.ok(roles.includes('Authority'),         'Authority role required');
    assert.ok(roles.includes('Epistemic'),         'Epistemic role required');
    assert.ok(roles.includes('Audit'),             'Audit role required');
    assert.ok(roles.includes('Theory of Change'),  'Theory of Change role required');
    assert.ok(roles.includes('Root Domain'),       'Root Domain (DOM-000001) role required');

    const dom = participants.find(p => p.role === 'Root Domain');
    assert.strictEqual(dom.status, 'OPERATIONAL');
    const theoryOfChange = participants.find(p => p.role === 'Theory of Change');
    assert.strictEqual(theoryOfChange.status, 'ACTIVE');
});

// ─── 8. Constitutional documentation ─────────────────────────────────────────

test('T4-05-Z: source file documents L-T4-05-01 limitation', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/civilization/dom000001-bootstrap.js'), 'utf8'
    );
    assert.ok(src.includes('L-T4-05-01'), 'source must document L-T4-05-01');
    assert.ok(src.includes('L-T4-05-02'), 'source must document L-T4-05-02');
    assert.ok(src.includes('L-T4-05-03'), 'source must document L-T4-05-03');
    assert.ok(src.includes('L-T4-05-04'), 'source must document L-T4-05-04');
});

test('T4-05-AA: source file documents constitutional authority (A0 §3.16, R15, W2-06)', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/civilization/dom000001-bootstrap.js'), 'utf8'
    );
    assert.ok(src.includes('§3.16'), 'source must cite A0 §3.16 (RT-15 canonical seat)');
    assert.ok(src.includes('R15-v1.0-canonical.md'), 'source must cite R15 canonical spec');
    assert.ok(src.includes('W2-06'), 'source must cite W2-06 DomainProfile certification');
    assert.ok(src.includes('T4-04'), 'source must cite T4-04 AuditRecord');
});

test('T4-05-AB: deliberation-registry.js imports dom000001-bootstrap (T4-05 wiring)', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/civilization/deliberation-registry.js'), 'utf8'
    );
    assert.ok(src.includes('dom000001-bootstrap'), 'deliberation-registry must import dom000001-bootstrap');
    assert.ok(src.includes('formDom000001Operationalization'), 'deliberation-registry must call formDom000001Operationalization');
    assert.ok(src.includes('domOperRef'), 'deliberation-registry must use domOperRef');
});

test('T4-05-AC: deliberation-registry.js L-DR-03 resolution documented', () => {
    const fs  = require('fs');
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/civilization/deliberation-registry.js'), 'utf8'
    );
    assert.ok(src.includes('L-DR-03'), 'L-DR-03 limitation must be referenced');
    assert.ok(src.includes('T4-05'), 'T4-05 resolution must be documented');
});

// ─── Async tests (sections 4, 5, 6, 9, 10) ───────────────────────────────────

async function runTests() {

    // ─── 4. DomainBootstrapOperationalizationRecord structure ────────────────

    await testAsync('T4-05-J: record __type is DomainBootstrapOperationalizationRecord', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-J', cdpId: 'CDP-TEST-J' }); }
        );
        assert.ok(written, 'constitutionalStore.write must be called');
        assert.strictEqual(written.__type, 'DomainBootstrapOperationalizationRecord');
    });

    await testAsync('T4-05-K: record __runtime is RT-15', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-K', cdpId: 'CDP-TEST-K' }); }
        );
        assert.strictEqual(written.__runtime, 'RT-15');
    });

    await testAsync('T4-05-L: record __wave is W4-T4-05', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-L', cdpId: 'CDP-TEST-L' }); }
        );
        assert.strictEqual(written.__wave, 'W4-T4-05');
    });

    await testAsync('T4-05-M: record domain_id is DOM-000001', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-M', cdpId: 'CDP-TEST-M' }); }
        );
        assert.strictEqual(written.domain_id, 'DOM-000001');
    });

    await testAsync('T4-05-N: record domain_profile_ref is dp-DOM-000001 (W2-06)', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-N', cdpId: 'CDP-TEST-N' }); }
        );
        assert.strictEqual(written.domain_profile_ref, 'dp-DOM-000001');
    });

    await testAsync('T4-05-O: record operationalization_level is BOOTSTRAP-DECISION-FILTER (L-T4-05-01)', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-O', cdpId: 'CDP-TEST-O' }); }
        );
        assert.strictEqual(written.operationalization_level, 'BOOTSTRAP-DECISION-FILTER');
    });

    await testAsync('T4-05-P: record deliberation_ref and civilizational_decision_proposal_ref present', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => {
                await boot.formDom000001Operationalization({ drId: 'DR-TEST-P-XYZ', cdpId: 'CDP-TEST-P-REF' });
            }
        );
        assert.ok(written.deliberation_ref, 'deliberation_ref must be present');
        assert.ok(written.civilizational_decision_proposal_ref, 'cdp ref must be present');
        assert.ok(written.deliberation_ref.includes('TEST-P'), 'deliberation_ref must use drId');
        assert.ok(written.civilizational_decision_proposal_ref.includes('TEST-P-REF'), 'cdp ref must use cdpId');
    });

    await testAsync('T4-05-Q: audit_record_ref present (L-T4-05-02 — declared by reference)', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-Q', cdpId: 'CDP-TEST-Q' }); }
        );
        assert.ok(written.audit_record_ref, 'audit_record_ref must be present');
        assert.ok(written.audit_record_ref.includes('CAR-RT04'),
            'audit_record_ref must reference T4-04 pattern (L-T4-05-02)');
    });

    await testAsync('T4-05-R: constitutional_basis references A0 §3.16 RT-15, W2-06, T4-04', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-R', cdpId: 'CDP-TEST-R' }); }
        );
        assert.ok(written.constitutional_basis.includes('§3.16'), 'must cite A0 §3.16 (RT-15)');
        assert.ok(written.constitutional_basis.includes('W2-06'), 'must cite W2-06 DomainProfile certification');
        assert.ok(written.constitutional_basis.includes('T4-04'), 'must cite T4-04 AuditRecord');
        assert.ok(written.constitutional_basis.includes('PAIR 53'), 'must cite PAIR 53 (RT-15 ↔ RT-12)');
    });

    await testAsync('T4-05-S: limitation_ref documents L-T4-05-01 through L-T4-05-04', async () => {
        let written = null;
        await withFreshBootstrap(
            async (r) => { written = r; },
            async (boot) => { await boot.formDom000001Operationalization({ drId: 'DR-TEST-S', cdpId: 'CDP-TEST-S' }); }
        );
        assert.ok(written.limitation_ref.includes('L-T4-05-01'), 'must document L-T4-05-01');
        assert.ok(written.limitation_ref.includes('L-T4-05-02'), 'must document L-T4-05-02');
        assert.ok(written.limitation_ref.includes('L-T4-05-03'), 'must document L-T4-05-03');
        assert.ok(written.limitation_ref.includes('L-T4-05-04'), 'must document L-T4-05-04');
    });

    // ─── 5. Return value ─────────────────────────────────────────────────────

    await testAsync('T4-05-T: formDom000001Operationalization returns domOperRef on success', async () => {
        let result;
        await withFreshBootstrap(
            async () => {},
            async (boot) => {
                result = await boot.formDom000001Operationalization({ drId: 'DR-TEST-T', cdpId: 'CDP-TEST-T' });
            }
        );
        assert.ok(result, 'result must be truthy');
        assert.ok(result.domOperRef, 'result.domOperRef must be present');
        assert.ok(result.domOperRef.startsWith('DOM-OPER-BOOTSTRAP-v1-'),
            'domOperRef must have correct prefix');
    });

    // ─── 6. Duplicate guard ──────────────────────────────────────────────────

    await testAsync('T4-05-U: duplicate invocation with same drId returns null (idempotency)', async () => {
        let second;
        await withFreshBootstrap(
            async () => {},
            async (boot) => {
                await boot.formDom000001Operationalization({ drId: 'DR-TEST-U', cdpId: 'CDP-TEST-U-1' });
                second = await boot.formDom000001Operationalization({ drId: 'DR-TEST-U', cdpId: 'CDP-TEST-U-2' });
            }
        );
        assert.strictEqual(second, null, 'duplicate invocation must return null');
    });

    // ─── 9. Falsification: standalone call without drId uses STANDALONE key ──

    await testAsync('T4-05-AD: standalone call without drId uses STANDALONE key (no crash)', async () => {
        let result;
        await withFreshBootstrap(
            async () => {},
            async (boot) => {
                result = await boot.formDom000001Operationalization();
            }
        );
        assert.ok(result, 'standalone call must return a result');
        assert.ok(result.domOperRef, 'standalone call must produce domOperRef');
    });

    // ─── 10. Async no-throw contract ─────────────────────────────────────────

    await testAsync('T4-05-AE: formDom000001Operationalization does not throw even if store fails', async () => {
        let threw = false;
        let result;
        await withFreshBootstrap(
            async () => { throw new Error('simulated storage failure'); },
            async (boot) => {
                try {
                    result = await boot.formDom000001Operationalization({ drId: 'DR-TEST-AE', cdpId: 'CDP-TEST-AE' });
                } catch {
                    threw = true;
                }
            }
        );
        assert.ok(!threw, 'must not throw on storage failure');
        assert.strictEqual(result, null, 'must return null on storage failure');
    });

    console.log('\n────────────────────────────────────────────────────────────');
    if (failed === 0) {
        console.log(`T4-05: ${passed + failed} tests — ${passed} PASS, ${failed} FAIL`);
    } else {
        console.error(`T4-05: ${passed + failed} tests — ${passed} PASS, ${failed} FAIL`);
        process.exitCode = 1;
    }
}

(async () => {
    await runTests();
})().catch(err => {
    console.error('Test runner error:', err.message);
    process.exitCode = 1;
});
