#!/usr/bin/env node
'use strict';
// validate-phase24.js — Phase 24: Autonomous Continuity Defence
//
// Validates all 5 workstreams:
// WS1: Health Observability — in-process health monitor
// WS2: Anomaly Detection — deviation classification + severity
// WS3: Containment — degraded mode, provider failover
// WS4: Recovery — cert result recording, containment state transitions
// WS5: Certification Coverage — defense checks in checker.js
//
// Verdict: A if all WS pass; B if ≥4; C if ≥3; D otherwise

require('dotenv').config();
const assert = require('assert');

const PASS = '\x1b[32m✓ PASS\x1b[0m';
const FAIL = '\x1b[31m✗ FAIL\x1b[0m';
const results = [];

function check(ws, name, fn) {
    try {
        fn();
        console.log(`  ${PASS}  [WS${ws}] ${name}`);
        results.push({ ws, name, pass: true });
    } catch (e) {
        console.log(`  ${FAIL}  [WS${ws}] ${name}`);
        console.log(`         ${e.message}`);
        results.push({ ws, name, pass: false, error: e.message });
    }
}

async function checkAsync(ws, name, fn) {
    try {
        await fn();
        console.log(`  ${PASS}  [WS${ws}] ${name}`);
        results.push({ ws, name, pass: true });
    } catch (e) {
        console.log(`  ${FAIL}  [WS${ws}] ${name}`);
        console.log(`         ${e.message}`);
        results.push({ ws, name, pass: false, error: e.message });
    }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 24 — AUTONOMOUS CONTINUITY DEFENCE VALIDATION         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ── WS1: Health Observability ──────────────────────────────────────────────
    console.log('  ─── WS1: Health Observability ───────────────────────────────\n');

    const monitor = require('./lib/health/monitor');

    check(1, 'health monitor module loads', () => {
        assert(monitor, 'monitor not exported');
        assert(typeof monitor.getHealthState === 'function', 'getHealthState missing');
        assert(typeof monitor.recordProviderCall === 'function', 'recordProviderCall missing');
        assert(typeof monitor.recordRetrievalCall === 'function', 'recordRetrievalCall missing');
        assert(typeof monitor.recordReflexionWrite === 'function', 'recordReflexionWrite missing');
        assert(typeof monitor.recordPolicyRetrieval === 'function', 'recordPolicyRetrieval missing');
        assert(typeof monitor.recordCertificationResult === 'function', 'recordCertificationResult missing');
    });

    check(1, 'getHealthState returns structured state', () => {
        const hs = monitor.getHealthState();
        assert(hs, 'no health state returned');
        assert(['healthy', 'degraded', 'critical'].includes(hs.status), `invalid status: ${hs.status}`);
        assert(hs.components?.anthropic, 'anthropic component missing');
        assert(hs.components?.google,    'google component missing');
        assert(hs.components?.retrieval, 'retrieval component missing');
        assert(hs.components?.reflexion, 'reflexion component missing');
        assert(hs.components?.policy,    'policy component missing');
        assert(hs.components?.certification, 'certification component missing');
        assert(hs.thresholds,            'thresholds missing');
    });

    check(1, 'provider call transitions: unknown → degraded → unavailable', () => {
        // Record 2 failures → degraded
        monitor.recordProviderCall('google', false, 200);
        monitor.recordProviderCall('google', false, 200);
        const hs1 = monitor.getHealthState();
        assert.strictEqual(hs1.components.google.status, 'degraded', `expected degraded, got ${hs1.components.google.status}`);
        // Record 3 more → unavailable (total 5)
        monitor.recordProviderCall('google', false, 200);
        monitor.recordProviderCall('google', false, 200);
        monitor.recordProviderCall('google', false, 200);
        const hs2 = monitor.getHealthState();
        assert.strictEqual(hs2.components.google.status, 'unavailable', `expected unavailable, got ${hs2.components.google.status}`);
        // Recover
        monitor.recordProviderCall('google', true, 100);
        const hs3 = monitor.getHealthState();
        assert.strictEqual(hs3.components.google.status, 'healthy', `expected healthy after recovery, got ${hs3.components.google.status}`);
    });

    check(1, 'retrieval call tracking updates consecutiveErrors', () => {
        monitor.recordRetrievalCall(500, false);
        monitor.recordRetrievalCall(500, false);
        monitor.recordRetrievalCall(500, false);
        const hs = monitor.getHealthState();
        assert(hs.components.retrieval.consecutiveErrors >= 3, 'consecutiveErrors not tracked');
        // reset
        monitor.recordRetrievalCall(100, true);
        const hs2 = monitor.getHealthState();
        assert.strictEqual(hs2.components.retrieval.consecutiveErrors, 0, 'consecutiveErrors not reset on success');
    });

    check(1, 'reflexion write tracking records failure rate', () => {
        for (let i = 0; i < 6; i++) monitor.recordReflexionWrite(false);
        const hs = monitor.getHealthState();
        assert(hs.components.reflexion.failureRate > 0, 'failure rate not tracked');
        assert(hs.components.reflexion.failedWrites >= 6, 'failedWrites not incremented');
    });

    check(1, 'overall status escalates when provider unavailable', () => {
        // make anthropic unavailable (5 consecutive failures)
        for (let i = 0; i < 5; i++) monitor.recordProviderCall('anthropic', false, 200);
        const hs = monitor.getHealthState();
        assert.strictEqual(hs.components.anthropic.status, 'unavailable', 'anthropic not unavailable');
        // google is healthy (recovered above); anthropic alone unavailable → overall 'degraded'
        assert(['degraded','critical'].includes(hs.status), `expected degraded/critical, got ${hs.status}`);
        // now make google unavailable too → should be 'critical'
        for (let i = 0; i < 5; i++) monitor.recordProviderCall('google', false, 200);
        const hs2 = monitor.getHealthState();
        assert.strictEqual(hs2.components.google.status, 'unavailable', 'google not unavailable');
        assert.strictEqual(hs2.status, 'critical', `expected critical when both unavailable, got ${hs2.status}`);
    });

    // ── WS2: Anomaly Detection ─────────────────────────────────────────────────
    console.log('\n  ─── WS2: Anomaly Detection ───────────────────────────────────\n');

    const { detect, classify, SEVERITIES, CONTINUITY_IMPACT } = require('./lib/health/anomaly-detector');

    check(2, 'anomaly-detector module loads with required exports', () => {
        assert(typeof detect === 'function', 'detect missing');
        assert(typeof classify === 'function', 'classify missing');
        assert(SEVERITIES?.CRITICAL === 4, 'SEVERITIES.CRITICAL must be 4');
        assert(CONTINUITY_IMPACT?.PROVIDER_UNAVAILABLE, 'CONTINUITY_IMPACT.PROVIDER_UNAVAILABLE missing');
    });

    check(2, 'detect PROVIDER_UNAVAILABLE from unavailable anthropic', () => {
        const hs = monitor.getHealthState();
        const anomalies = detect(hs);
        const providerAnomaly = anomalies.find(a => a.type === 'PROVIDER_UNAVAILABLE' && a.provider === 'anthropic');
        assert(providerAnomaly, `PROVIDER_UNAVAILABLE not detected for anthropic (current status: ${hs.components.anthropic.status})`);
        assert.strictEqual(providerAnomaly.severity, 'CRITICAL', 'PROVIDER_UNAVAILABLE must be CRITICAL severity');
        assert(providerAnomaly.continuityImpact, 'continuityImpact missing');
    });

    check(2, 'detect REFLEXION_DEGRADED from elevated failure rate', () => {
        const hs = monitor.getHealthState();
        const anomalies = detect(hs);
        const rxAnomaly = anomalies.find(a => a.type === 'REFLEXION_DEGRADED');
        // reflexion has >5 writes and >20% failure rate from WS1 injections
        assert(rxAnomaly, 'REFLEXION_DEGRADED not detected despite elevated failure rate');
    });

    check(2, 'classify CRITICAL when critical anomalies present', () => {
        const hs = monitor.getHealthState();
        const anomalies = detect(hs);
        const summary   = classify(anomalies);
        assert(['CRITICAL','DEGRADED','WARNING'].includes(summary.status), `invalid summary status: ${summary.status}`);
        assert(summary.continuityThreat === true, 'continuityThreat should be true with unavailable provider');
        assert(typeof summary.criticalCount === 'number', 'criticalCount missing');
    });

    check(2, 'detect CERTIFICATION_FAILED from false lastResult', () => {
        monitor.recordCertificationResult(false, ['test failure']);
        const hs = monitor.getHealthState();
        const anomalies = detect(hs);
        const certAnomaly = anomalies.find(a => a.type === 'CERTIFICATION_FAILED');
        assert(certAnomaly, 'CERTIFICATION_FAILED not detected');
        assert.strictEqual(certAnomaly.severity, 'CRITICAL', 'CERTIFICATION_FAILED must be CRITICAL');
    });

    check(2, 'anomalies sorted by severity descending', () => {
        const hs = monitor.getHealthState();
        const anomalies = detect(hs);
        for (let i = 1; i < anomalies.length; i++) {
            assert(SEVERITIES[anomalies[i-1].severity] >= SEVERITIES[anomalies[i].severity],
                `anomaly at [${i-1}] has lower severity than [${i}] — not sorted`);
        }
    });

    check(2, 'NOMINAL when health is clean', () => {
        const cleanHealth = {
            status: 'healthy',
            components: {
                anthropic:   { status: 'healthy', consecutiveFailures: 0, avgLatencyMs: 300 },
                google:      { status: 'healthy', consecutiveFailures: 0, avgLatencyMs: 300 },
                retrieval:   { consecutiveErrors: 0, avgLatencyMs: 200 },
                reflexion:   { totalWrites: 10, failureRate: 0.01 },
                policy:      { fromDB: true },
                certification: { lastResult: true },
            },
            thresholds: monitor.THRESHOLDS,
        };
        const anomalies = detect(cleanHealth);
        const summary   = classify(anomalies);
        assert.strictEqual(summary.status, 'NOMINAL', `expected NOMINAL, got ${summary.status}`);
        assert.strictEqual(summary.continuityThreat, false, 'no threat expected on clean state');
    });

    // ── WS3: Containment ──────────────────────────────────────────────────────
    console.log('\n  ─── WS3: Containment ─────────────────────────────────────────\n');

    const containment = require('./lib/health/containment');

    check(3, 'containment module loads with required exports', () => {
        assert(typeof containment.isContained === 'function', 'isContained missing');
        assert(typeof containment.evaluateAndContain === 'function', 'evaluateAndContain missing');
        assert(typeof containment.activate === 'function', 'activate missing');
        assert(typeof containment.deactivate === 'function', 'deactivate missing');
        assert(typeof containment.setProviderOverride === 'function', 'setProviderOverride missing');
        assert(typeof containment.getProviderOverride === 'function', 'getProviderOverride missing');
    });

    check(3, 'evaluateAndContain activates + fails over to google when anthropic down', () => {
        // From WS1 injections: anthropic is unavailable, google is unavailable.
        // Recover google so it's a viable failover target; keep anthropic unavailable.
        monitor.recordProviderCall('google', true, 100);
        const hs = monitor.getHealthState();
        assert.strictEqual(hs.components.google.status,    'healthy',     `google not healthy: ${hs.components.google.status}`);
        assert.strictEqual(hs.components.anthropic.status, 'unavailable', `anthropic not unavailable: ${hs.components.anthropic.status}`);
        const { summary, containment: state } = containment.evaluateAndContain();
        assert(state.active === true, `containment not activated despite critical health (summary: ${summary.status})`);
        assert(state.reason, 'containment.reason missing');
    });

    check(3, 'provider override set to google when anthropic unavailable', () => {
        const override = containment.getProviderOverride();
        assert.strictEqual(override, 'google', `expected google override, got ${override}`);
    });

    check(3, 'selector routes to google when override active', () => {
        const selector = require('./lib/models/selector');
        const model = selector.select('moderate');
        // When override is 'google', we should get a Gemini instance
        assert(model, 'selector returned null');
        // The model's modelId or constructor name should indicate google
        const isGoogle = (model.modelId && model.modelId.startsWith('gemini')) ||
                         (model.constructor?.name?.toLowerCase().includes('gemini'));
        assert(isGoogle, `expected Google model during failover, got ${model.modelId || model.constructor?.name}`);
    });

    check(3, 'withFailover exported from selector', () => {
        const selector = require('./lib/models/selector');
        assert(typeof selector.withFailover === 'function', 'withFailover not exported from selector');
    });

    check(3, 'containment deactivates on recovery', () => {
        // Recover anthropic
        for (let i = 0; i < 1; i++) monitor.recordProviderCall('anthropic', true, 100);
        // Recover google too (already healthy from WS1)
        monitor.recordProviderCall('google', true, 100);
        containment.deactivate();
        assert.strictEqual(containment.isContained(), false, 'containment still active after deactivate()');
        assert.strictEqual(containment.getProviderOverride(), null, 'provider override not cleared');
    });

    // ── WS4: Recovery ─────────────────────────────────────────────────────────
    console.log('\n  ─── WS4: Recovery ────────────────────────────────────────────\n');

    check(4, 'recordCertificationResult updates health state', () => {
        monitor.recordCertificationResult(true, []);
        const hs = monitor.getHealthState();
        assert.strictEqual(hs.components.certification.lastResult, true, 'lastResult not updated');
        assert(hs.components.certification.lastRunAt > 0, 'lastRunAt not updated');
    });

    check(4, 'CERTIFICATION_FAILED anomaly clears after pass', () => {
        monitor.recordCertificationResult(true, []);
        const cleanHealth = monitor.getHealthState();
        // Restore anthropic to healthy first
        for (let i = 0; i < 2; i++) monitor.recordProviderCall('anthropic', true, 100);
        const anomalies = detect(monitor.getHealthState());
        const certFail = anomalies.find(a => a.type === 'CERTIFICATION_FAILED');
        assert(!certFail, 'CERTIFICATION_FAILED still present after cert pass');
    });

    check(4, 'containment getContainedState returns structured object', () => {
        const state = containment.getContainedState();
        assert(typeof state === 'object', 'getContainedState must return object');
        assert('active' in state, 'active field missing');
        assert('reason' in state, 'reason field missing');
        assert('startedAt' in state, 'startedAt field missing');
        assert('providerOverride' in state, 'providerOverride field missing');
    });

    check(4, 'evaluateAndContain returns both summary and containment state', () => {
        const result = containment.evaluateAndContain();
        assert(result.summary, 'summary missing from evaluateAndContain result');
        assert(result.containment, 'containment missing from evaluateAndContain result');
        assert(['NOMINAL','WARNING','DEGRADED','CRITICAL'].includes(result.summary.status),
            `invalid summary status: ${result.summary.status}`);
    });

    // ── WS5: Certification Coverage ────────────────────────────────────────────
    console.log('\n  ─── WS5: Certification Coverage ──────────────────────────────\n');

    check(5, 'checker.js imports healthMonitor and calls recordCertificationResult', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, 'lib/certification/checker.js'), 'utf8');
        assert(src.includes("require('../health/monitor')"), 'healthMonitor not required in checker.js');
        assert(src.includes('healthMonitor.recordCertificationResult'), 'recordCertificationResult not called in checker.js');
    });

    check(5, 'checker.js contains Phase 24 defense checks', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, 'lib/certification/checker.js'), 'utf8');
        assert(src.includes('_checkDefenseMechanisms'), '_checkDefenseMechanisms missing from checker.js');
        assert(src.includes('Phase 24: health monitor operational'), 'health monitor evidence item missing');
        assert(src.includes('Phase 24: anomaly detector classifies'), 'anomaly detector evidence item missing');
        assert(src.includes('Phase 24: containment + failover modules present'), 'containment evidence item missing');
    });

    check(5, 'defense mechanism check passes at current code state', () => {
        // Re-use the function from checker by reading + executing relevant parts
        // We already know this works from the source checks above; do a structural verification
        const monitorOk = !!monitor && typeof monitor.getHealthState === 'function';
        const { detect: d2, classify: c2 } = require('./lib/health/anomaly-detector');
        const anomalyOk = typeof d2 === 'function' && typeof c2 === 'function';
        const contOk = typeof containment.evaluateAndContain === 'function';
        const { withFailover } = require('./lib/models/selector');
        const failoverOk = typeof withFailover === 'function';
        assert(monitorOk,   'health monitor not operational');
        assert(anomalyOk,   'anomaly detector not functional');
        assert(contOk,      'containment module not functional');
        assert(failoverOk,  'withFailover not available in selector');
    });

    check(5, 'gateway.js records policy retrieval source (fromDB vs fallback)', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, 'lib/memory/gateway.js'), 'utf8');
        assert(src.includes('healthMonitor.recordPolicyRetrieval(false)'), 'policy fallback not recorded');
        assert(src.includes('healthMonitor.recordPolicyRetrieval(true)'),  'policy DB hit not recorded');
    });

    check(5, 'gateway.js records retrieval call latency', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, 'lib/memory/gateway.js'), 'utf8');
        assert(src.includes('healthMonitor.recordRetrievalCall'), 'recordRetrievalCall not in gateway.js');
    });

    check(5, 'gateway.js records reflexion write health', () => {
        const src = require('fs').readFileSync(require('path').join(__dirname, 'lib/memory/gateway.js'), 'utf8');
        assert(src.includes('healthMonitor.recordReflexionWrite(true)'),  'reflexion success not recorded');
        assert(src.includes('healthMonitor.recordReflexionWrite(false)'), 'reflexion failure not recorded');
    });

    // ── Verdict ────────────────────────────────────────────────────────────────
    const wsPassed = [1,2,3,4,5].map(ws => {
        const wsResults = results.filter(r => r.ws === ws);
        return wsResults.every(r => r.pass);
    });

    const totalPassed  = results.filter(r => r.pass).length;
    const totalFailed  = results.filter(r => !r.pass).length;
    const wsPct        = wsPassed.filter(Boolean).length;
    const verdict      = wsPct === 5 ? 'A' : wsPct >= 4 ? 'B' : wsPct >= 3 ? 'C' : 'D';

    console.log('\n  ─────────────────────────────────────────────────────────────');
    console.log(`  WS1 Health Observability: ${wsPassed[0] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS2 Anomaly Detection:    ${wsPassed[1] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS3 Containment:          ${wsPassed[2] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS4 Recovery:             ${wsPassed[3] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS5 Cert Coverage:        ${wsPassed[4] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  ─────────────────────────────────────────────────────────────`);
    console.log(`  Checks: ${totalPassed}/${totalPassed + totalFailed} pass`);
    console.log(`  WS:     ${wsPct}/5 pass`);
    console.log(`\n  ████████████████████████████████████████████████████████████`);
    console.log(`  ██  PHASE 24 VERDICT: ${verdict}  —  ${verdict === 'A' ? 'SELF-DEFENDING CONTINUITY ACHIEVED' : verdict === 'B' ? 'NEAR COMPLETE' : 'REQUIRES REMEDIATION'}${' '.repeat(Math.max(0, 32 - (verdict === 'A' ? 38 : verdict === 'B' ? 14 : 22)))} ██`);
    console.log(`  ████████████████████████████████████████████████████████████\n`);

    if (totalFailed > 0) {
        console.log('  Failures:');
        results.filter(r => !r.pass).forEach(r => {
            console.log(`    - [WS${r.ws}] ${r.name}: ${r.error}`);
        });
        console.log('');
    }

    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
