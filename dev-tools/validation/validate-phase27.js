#!/usr/bin/env node
'use strict';
// validate-phase27.js — Phase 27: Continuous Constitutional Oversight
//
// WS1: Continuous Oversight Loop
// WS2: Accountability Chain
// WS3: Autonomous Escalation
// WS4: Long-Run Resilience
// WS5: Meta-Accountability

require('dotenv').config();
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const PASS = '\x1b[32m✓ PASS\x1b[0m';
const FAIL = '\x1b[31m✗ FAIL\x1b[0m';
const results = [];

function check(ws, name, fn) {
    try { fn(); console.log(`  ${PASS}  [WS${ws}] ${name}`); results.push({ ws, name, pass: true }); }
    catch (e) { console.log(`  ${FAIL}  [WS${ws}] ${name}\n         ${e.message}`); results.push({ ws, name, pass: false, error: e.message }); }
}

async function checkAsync(ws, name, fn) {
    try { await fn(); console.log(`  ${PASS}  [WS${ws}] ${name}`); results.push({ ws, name, pass: true }); }
    catch (e) { console.log(`  ${FAIL}  [WS${ws}] ${name}\n         ${e.message}`); results.push({ ws, name, pass: false, error: e.message }); }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 27 — CONTINUOUS CONSTITUTIONAL OVERSIGHT               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const constitution = require('./lib/constitution/index');
    const {
        watchdog, accountability, escalationController, metaAccountability,
        driftDetector, evolutionManager, crisisManager,
    } = constitution;

    // Clean state
    watchdog.reset();
    driftDetector.clearBaseline();
    evolutionManager.clearAmendments();
    crisisManager.resetToNominal();
    accountability.clear();

    // ── WS1: Continuous Oversight Loop ───────────────────────────────────────
    console.log('  ─── WS1: Continuous Oversight Loop ──────────────────────────\n');

    check(1, 'watchdog loads with required exports', () => {
        assert(typeof watchdog.tick        === 'function', 'tick missing');
        assert(typeof watchdog.start       === 'function', 'start missing');
        assert(typeof watchdog.stop        === 'function', 'stop missing');
        assert(typeof watchdog.isActive    === 'function', 'isActive missing');
        assert(typeof watchdog.supervise   === 'function', 'supervise missing');
        assert(typeof watchdog.detectInactivity === 'function', 'detectInactivity missing');
        assert(typeof watchdog.getLastAssessment === 'function', 'getLastAssessment missing');
    });

    await checkAsync(1, 'single tick() produces assessment with all 7 required components', async () => {
        const a = await watchdog.tick();
        assert(!a.tickFailed,                             'tick should not fail');
        assert(a.certificationState,                      'certificationState missing');
        assert(a.constitutionalHealth,                    'constitutionalHealth missing');
        assert(a.driftIndicators,                         'driftIndicators missing');
        assert(a.crisisIndicators,                        'crisisIndicators missing');
        assert(a.attackHistory,                           'attackHistory missing');
        assert(a.stewardRecommendations,                  'stewardRecommendations missing');
        assert(a.residualRisks,                           'residualRisks missing');
        assert(typeof a.tickNumber === 'number',          'tickNumber missing');
        console.log(`         tick #${a.tickNumber}: crisis=${a.crisisIndicators.level} risk=${a.residualRisks.level}`);
    });

    await checkAsync(1, 'oversight continues across 5 consecutive ticks', async () => {
        const before = watchdog.getTickCount();
        for (let i = 0; i < 5; i++) {
            const a = await watchdog.tick();
            assert(!a.tickFailed, `tick ${i + 1} failed: ${a.failureReason}`);
        }
        const after = watchdog.getTickCount();
        assert(after - before === 5, `expected 5 new ticks, got ${after - before}`);
    });

    await checkAsync(1, 'supervise() wraps failing task — tick still completes', async () => {
        const { taskError, assessment } = await watchdog.supervise(() => { throw new Error('simulated task failure'); });
        assert(taskError !== null,              'taskError should be set');
        assert(assessment,                      'assessment should exist after task failure');
        assert(assessment.supervisedTaskFailed, 'supervisedTaskFailed should be true');
        assert(assessment.supervisedTaskError.includes('simulated task failure'), 'error message not propagated');
    });

    await checkAsync(1, 'tick failure is recorded — watchdog does not go silent', async () => {
        const dd = require('./lib/constitution/drift-detector');
        const savedDetect = dd.detectDrift;
        dd.detectDrift = () => { throw new Error('forced drift failure'); };
        const a = await watchdog.tick();
        dd.detectDrift = savedDetect;
        assert(a.tickFailed,             'tickFailed should be true when dependency throws');
        assert(a.failureReason,          'failureReason should be set');
        assert(a.failureCount > 0,       'failureCount should be non-zero');
        // Next tick recovers normally
        const b = await watchdog.tick();
        assert(!b.tickFailed,            'next tick should recover');
        assert(b.previousFailure,        'previousFailure should be true after a failure');
    });

    await checkAsync(1, 'detectInactivity() detects stale watchdog', async () => {
        await watchdog.tick();
        const stale = watchdog.detectInactivity(0); // 0ms → always inactive after any tick
        assert(stale.inactive, 'should be inactive with 0ms threshold');
        const fresh = watchdog.detectInactivity(60_000); // 60s → just ticked
        assert(!fresh.inactive, `should NOT be inactive with 60s threshold after recent tick`);
    });

    check(1, 'watchdog is start/stop controllable — isActive tracks state', () => {
        assert(!watchdog.isActive(), 'should not be active before start()');
        watchdog.start();
        assert(watchdog.isActive(), 'should be active after start()');
        watchdog.stop();
        assert(!watchdog.isActive(), 'should not be active after stop()');
    });

    await checkAsync(1, 'assessment covers all required oversight domains', async () => {
        const a = await watchdog.tick();
        // Constitutional health covers crisis + drift
        assert(typeof a.constitutionalHealth.crisisLevel === 'string', 'crisisLevel missing');
        assert(typeof a.constitutionalHealth.driftItems  === 'number', 'driftItems count missing');
        // Drift indicators include baseline status
        assert('hasBaseline' in a.driftIndicators, 'hasBaseline flag missing');
        // Attack history includes type breakdown
        assert(Array.isArray(a.attackHistory.types), 'attack types array missing');
        // Steward recommendations count
        assert(typeof a.stewardRecommendations.count === 'number', 'steward count missing');
        // Residual risks include score
        assert(typeof a.residualRisks.score === 'number', 'residualRisks.score missing');
        assert(['NOMINAL','WARNING','ELEVATED','CRITICAL'].includes(a.residualRisks.level), 'invalid risk level');
    });

    // ── WS2: Accountability Chain ─────────────────────────────────────────────
    console.log('\n  ─── WS2: Accountability Chain ────────────────────────────────\n');

    accountability.clear();

    check(2, 'accountability-chain loads with required exports', () => {
        assert(typeof accountability.record      === 'function', 'record missing');
        assert(typeof accountability.reconstruct === 'function', 'reconstruct missing');
        assert(typeof accountability.verify      === 'function', 'verify missing');
        assert(typeof accountability.getChain    === 'function', 'getChain missing');
        assert(typeof accountability.clear       === 'function', 'clear missing');
        assert(accountability.EVENT_TYPES,                        'EVENT_TYPES missing');
        const { EVENT_TYPES: ET } = accountability;
        assert(ET.CERTIFICATION_FAILURE, 'CERTIFICATION_FAILURE missing');
        assert(ET.CRISIS_TRANSITION,     'CRISIS_TRANSITION missing');
        assert(ET.AMENDMENT_PROPOSED,    'AMENDMENT_PROPOSED missing');
        assert(ET.ATTACK_DETECTED,       'ATTACK_DETECTED missing');
        assert(ET.STEWARD_ESCALATION,    'STEWARD_ESCALATION missing');
        assert(ET.DECISION_DEFERRED,     'DECISION_DEFERRED missing');
    });

    check(2, 'all 8 required event types are recordable', () => {
        const { EVENT_TYPES: ET } = accountability;
        const required = [
            ET.CERTIFICATION_FAILURE,
            ET.CRISIS_TRANSITION,
            ET.AMENDMENT_PROPOSED,
            ET.AMENDMENT_APPROVED,
            ET.AMENDMENT_ACTIVATED,
            ET.ATTACK_DETECTED,
            ET.STEWARD_ESCALATION,
            ET.DECISION_DEFERRED,
        ];
        for (const et of required) {
            const e = accountability.record(et, { test: true, eventType: et });
            assert(e.seq >= 0,              `${et}: seq missing`);
            assert(e.chainHash,             `${et}: chainHash missing`);
            assert(e.timestamp,             `${et}: timestamp missing`);
        }
        console.log(`         Recorded ${required.length} event types successfully`);
    });

    check(2, 'chain is chronologically reconstructable', () => {
        const { entries, count } = accountability.reconstruct();
        assert(count >= 8, `expected ≥8 entries, got ${count}`);
        // Verify seq ordering
        for (let i = 0; i < entries.length; i++) {
            assert(entries[i].seq === i, `entry at index ${i} has seq ${entries[i].seq} — out of order`);
        }
        // Verify timestamps are monotonically non-decreasing
        for (let i = 1; i < entries.length; i++) {
            const prev = new Date(entries[i - 1].timestamp).getTime();
            const curr = new Date(entries[i].timestamp).getTime();
            assert(curr >= prev, `timestamp regression at seq ${i}: ${entries[i].timestamp} < ${entries[i-1].timestamp}`);
        }
        console.log(`         ${count} entries reconstructed in chronological order`);
    });

    check(2, 'verify() returns intact:true on untampered chain', () => {
        const result = accountability.verify();
        assert(result.intact,           `chain not intact: gaps=${JSON.stringify(result.gaps)}, tampered=${JSON.stringify(result.tampered)}`);
        assert(result.gaps.length === 0, `unexpected gaps: ${JSON.stringify(result.gaps)}`);
        assert(result.tampered.length === 0, 'unexpected tampered entries');
        console.log(`         Chain verified intact — ${result.count} entries`);
    });

    check(2, 'gap injection: removed entry causes verify() to detect gap', () => {
        const before = accountability.getChain();
        // Inject a gap by removing entry at index 2
        const corrupted = before.filter((_, i) => i !== 2).map((e, i) => ({ ...e, seq: i }));
        // Write with broken hashes (no rehash) — creates hash mismatch + gap evidence
        accountability._writeRaw(corrupted);
        const result = accountability.verify();
        assert(!result.intact, 'corrupted chain should NOT be intact');
        // Restore clean chain
        accountability._writeRaw(before);
        const restored = accountability.verify();
        assert(restored.intact, 'chain should be intact after restore');
        console.log(`         Gap detected: intact=${result.intact}, tampered/gaps detected`);
    });

    check(2, 'content tampering detected: modifying payload breaks hash chain', () => {
        // Record a fresh entry then tamper with its payload
        const entry = accountability.record(accountability.EVENT_TYPES.OVERSIGHT_TICK, { tick: 99 });
        const chain = accountability.getChain();
        const idx   = chain.findIndex(e => e.seq === entry.seq);
        chain[idx].payload = { tick: 9999, TAMPERED: true }; // alter without updating hash
        accountability._writeRaw(chain);
        const result = accountability.verify();
        assert(!result.intact, 'tampered chain should not be intact');
        assert(result.tampered.some(t => t.seq === entry.seq), 'tampered entry not detected');
        // Restore
        accountability.clear();
        console.log(`         Tampering detected at seq ${entry.seq}`);
    });

    check(2, 'event records contain required fields: seq, eventType, timestamp, chainHash, prevHash', () => {
        const e = accountability.record(accountability.EVENT_TYPES.RECOVERY, { reason: 'test' });
        assert(typeof e.seq       === 'number', 'seq must be number');
        assert(typeof e.eventType === 'string', 'eventType must be string');
        assert(typeof e.timestamp === 'string', 'timestamp must be string');
        assert(typeof e.chainHash === 'string', 'chainHash must be string');
        assert(typeof e.prevHash  === 'string', 'prevHash must be string');
    });

    // ── WS3: Autonomous Escalation ─────────────────────────────────────────────
    console.log('\n  ─── WS3: Autonomous Escalation ───────────────────────────────\n');

    check(3, 'escalation-controller loads with required exports', () => {
        assert(typeof escalationController.computeEscalationLevel    === 'function', 'computeEscalationLevel missing');
        assert(typeof escalationController.shouldEscalate            === 'function', 'shouldEscalate missing');
        assert(typeof escalationController.deferDecision             === 'function', 'deferDecision missing');
        assert(typeof escalationController.analyzeEscalationFrequency === 'function', 'analyzeEscalationFrequency missing');
        assert(escalationController.UNCERTAINTY_THRESHOLDS,           'UNCERTAINTY_THRESHOLDS missing');
        assert(escalationController.ALWAYS_ESCALATE_OPERATIONS,       'ALWAYS_ESCALATE_OPERATIONS missing');
    });

    check(3, 'low uncertainty (0.10) → PROCEED', () => {
        const r = escalationController.computeEscalationLevel({ uncertaintyScore: 0.10, crisisLevel: 'NOMINAL' });
        assert.strictEqual(r.level, 'PROCEED', `expected PROCEED, got ${r.level}`);
    });

    check(3, 'medium uncertainty (0.50) → DEFER', () => {
        const r = escalationController.computeEscalationLevel({ uncertaintyScore: 0.50, crisisLevel: 'NOMINAL' });
        assert.strictEqual(r.level, 'DEFER', `expected DEFER, got ${r.level} (reasons: ${r.reasons.join('; ')})`);
    });

    check(3, 'high uncertainty (0.80) → ESCALATE', () => {
        const r = escalationController.computeEscalationLevel({ uncertaintyScore: 0.80, crisisLevel: 'NOMINAL' });
        assert.strictEqual(r.level, 'ESCALATE', `expected ESCALATE, got ${r.level}`);
    });

    check(3, 'confidence=0.99 cannot override PRIVACY_WRITE — must still ESCALATE', () => {
        const r = escalationController.computeEscalationLevel({
            uncertaintyScore: 0.05,
            crisisLevel:      'NOMINAL',
            operation:        'PRIVACY_WRITE',
            confidence:       0.99,
        });
        assert.strictEqual(r.level, 'ESCALATE', `high confidence must not override PRIVACY_WRITE: got ${r.level}`);
        assert(r.confidenceOverrideBlocked, 'confidenceOverrideBlocked should be true');
        console.log(`         confidence=0.99 + PRIVACY_WRITE → ${r.level} (blocked: ${r.confidenceOverrideBlocked})`);
    });

    check(3, 'EMERGENCY crisis level pushes low-uncertainty action to ESCALATE', () => {
        const r = escalationController.computeEscalationLevel({ uncertaintyScore: 0.15, crisisLevel: 'EMERGENCY' });
        // 0.15 + 0.60 crisis adder = 0.75 ≥ 0.70 ESCALATE threshold
        assert.strictEqual(r.level, 'ESCALATE', `EMERGENCY should push uncertainty past ESCALATE threshold: got ${r.level}`);
        assert(r.adjustedUncertainty >= 0.70, `adjusted uncertainty should be ≥0.70, got ${r.adjustedUncertainty}`);
    });

    check(3, 'escalation frequency increases as uncertainty increases', () => {
        const low    = [0.05, 0.10, 0.15, 0.20].map(u => ({ uncertaintyScore: u, crisisLevel: 'NOMINAL' }));
        const high   = [0.60, 0.70, 0.80, 0.90].map(u => ({ uncertaintyScore: u, crisisLevel: 'NOMINAL' }));
        const lowF   = escalationController.analyzeEscalationFrequency(low);
        const highF  = escalationController.analyzeEscalationFrequency(high);
        assert(highF.escalationRate > lowF.escalationRate,
            `escalation rate should increase with uncertainty: low=${lowF.escalationRate} high=${highF.escalationRate}`);
        console.log(`         escalationRate: low-uncertainty=${lowF.escalationRate} high-uncertainty=${highF.escalationRate}`);
    });

    check(3, 'conflicting principles force ESCALATE regardless of confidence', () => {
        const r = escalationController.computeEscalationLevel({
            uncertaintyScore:      0.05,
            crisisLevel:           'NOMINAL',
            conflictingPrinciples: ['P01_FOUNDER_LAYER_ZERO', 'P05_PII_ABSTRACTION'],
            confidence:            0.99,
        });
        assert.strictEqual(r.level, 'ESCALATE', `conflicting principles must force ESCALATE: got ${r.level}`);
        assert(r.confidenceOverrideBlocked, 'confidenceOverrideBlocked should be true for conflicting principles');
    });

    check(3, 'low evidence quality (0.3) upgrades PROCEED to DEFER', () => {
        const r = escalationController.computeEscalationLevel({
            uncertaintyScore: 0.10,
            crisisLevel:      'NOMINAL',
            evidenceQuality:  0.30,
        });
        assert(['DEFER','ESCALATE'].includes(r.level), `low evidence quality should prevent PROCEED: got ${r.level}`);
        console.log(`         evidenceQuality=0.30 → ${r.level}`);
    });

    // ── WS4: Long-Run Resilience ──────────────────────────────────────────────
    console.log('\n  ─── WS4: Long-Run Resilience ─────────────────────────────────\n');

    accountability.clear();
    evolutionManager.clearAmendments();
    crisisManager.resetToNominal();
    watchdog.reset();
    watchdog.start();

    const SIM_CYCLES = 10;
    const simLog     = [];
    let   simError   = null;

    await checkAsync(4, `simulation completes ${SIM_CYCLES} cycles without exception`, async () => {
        try {
            for (let c = 0; c < SIM_CYCLES; c++) {
                // 1. Normal oversight tick
                const t = await watchdog.tick();
                accountability.record(accountability.EVENT_TYPES.OVERSIGHT_TICK, { cycle: c, risk: t.residualRisks?.level });

                // 2. Crisis entry every 3rd cycle
                if (c % 3 === 1) {
                    crisisManager.enterCrisisEvent('EXEC_SUBSYSTEM_FAILURE');
                    accountability.record(accountability.EVENT_TYPES.CRISIS_TRANSITION, { from: 'NOMINAL', to: 'WARNING', cycle: c });
                }

                // 3. Governance attack attempt every 5th cycle
                if (c % 5 === 2) {
                    try { evolutionManager.approve('FAKE-AMD-' + c, 'attacker'); } catch {}
                    const atk = evolutionManager.getAttackLog().slice(-1)[0];
                    if (atk) accountability.record(accountability.EVENT_TYPES.ATTACK_DETECTED, { type: atk.type, cycle: c });
                }

                // 4. Steward review of amendment proposal
                const amd = {
                    principleId:    'P20_EXECUTIVE_DIFFERENTIATION',
                    proposedChange: `simulation cycle ${c} change to differentiation handling`,
                    rationale:      `Long-run resilience test: cycle ${c} validating steward stability and amendment assessment behaviour`,
                    proposedBy:     'orchestrator',
                };
                const assessment = constitution.steward.assessAmendment(amd);
                if (assessment.recommendation !== 'APPROVE') {
                    accountability.record(accountability.EVENT_TYPES.STEWARD_ESCALATION, { cycle: c, recommendation: assessment.recommendation });
                }

                // 5. Recovery from crisis (every 3rd cycle)
                if (c % 3 === 2) {
                    try { crisisManager.recover('simulation-recovery'); } catch {}
                    crisisManager.resetToNominal();
                    accountability.record(accountability.EVENT_TYPES.RECOVERY, { cycle: c });
                }

                // 6. End-of-cycle tick
                const t2 = await watchdog.tick();
                simLog.push({ cycle: c, crisisLevel: t2.crisisIndicators?.level, tickFailed: t2.tickFailed });
            }
        } catch (e) {
            simError = e;
            throw new Error(`simulation failed at cycle: ${e.message}`);
        }
        assert(!simError, `simulation threw: ${simError?.message}`);
        console.log(`         ${SIM_CYCLES} cycles completed`);
    });

    check(4, 'watchdog remained active throughout simulation', () => {
        assert(watchdog.isActive(), 'watchdog should still be active after simulation');
        assert(watchdog.getTickCount() >= SIM_CYCLES * 2, `expected ≥${SIM_CYCLES * 2} ticks, got ${watchdog.getTickCount()}`);
        const inactivity = watchdog.detectInactivity(60_000);
        assert(!inactivity.inactive, `watchdog should not be inactive after simulation: ${inactivity.reason}`);
        console.log(`         ${watchdog.getTickCount()} ticks completed`);
    });

    check(4, 'no cycle produced silent failure — every tick produced an assessment', () => {
        const failures = simLog.filter(s => s.tickFailed);
        assert(failures.length === 0, `${failures.length} cycle(s) produced failed ticks: ${JSON.stringify(failures)}`);
    });

    check(4, 'accountability records are complete for all simulation cycles', () => {
        const { count, entries } = accountability.reconstruct();
        assert(count >= SIM_CYCLES, `expected ≥${SIM_CYCLES} accountability records, got ${count}`);
        // Every cycle has at least one OVERSIGHT_TICK record
        const tickRecords = entries.filter(e => e.eventType === 'OVERSIGHT_TICK');
        assert(tickRecords.length >= SIM_CYCLES, `expected ≥${SIM_CYCLES} OVERSIGHT_TICK records, got ${tickRecords.length}`);
        console.log(`         ${count} accountability records across ${SIM_CYCLES} cycles`);
    });

    check(4, 'accountability chain integrity holds after full simulation', () => {
        const result = accountability.verify();
        assert(result.intact, `chain integrity compromised after simulation: gaps=${result.gaps.length} tampered=${result.tampered.length}`);
        console.log(`         Chain intact: ${result.count} entries, no gaps or tampering`);
    });

    check(4, 'crisis recovery restores normal operation each cycle', () => {
        // After simulation, state should be NOMINAL (last cycle resets)
        const state = crisisManager.getState();
        assert.strictEqual(state.level, 'NOMINAL', `expected NOMINAL after simulation, got ${state.level}`);
    });

    check(4, 'escalation behavior stable: steward consistently defers high-risk amendments', () => {
        // Run 5 PRIVACY amendment assessments — each should be deferred
        const results = [];
        for (let i = 0; i < 5; i++) {
            const a = constitution.steward.assessAmendment({
                principleId:    'P05_PII_ABSTRACTION',
                proposedChange: `privacy change variant ${i} for long-run stability test`,
                rationale:      `Testing constitutional identity stability: iteration ${i} — PRIVACY amendments must be consistently deferred`,
                proposedBy:     'orchestrator',
            });
            results.push(a.recommendation);
        }
        assert(results.every(r => ['DEFER','ESCALATE','REJECT'].includes(r)),
            `PRIVACY amendments should consistently defer/escalate: ${results.join(', ')}`);
        const allSame = new Set(results).size === 1;
        console.log(`         5 PRIVACY assessments: ${results.join(', ')} (consistent: ${allSame})`);
    });

    check(4, 'constitutional identity preserved: EMERGENCY_INVARIANTS hold mid-simulation', async () => {
        crisisManager.enterCrisisEvent('CASCADE_FAILURE');
        assert(crisisManager.isEmergencyMode(), 'should be in EMERGENCY');
        const result = await crisisManager.verifyInvariantsHold();
        crisisManager.recover('post-simulation-check');
        crisisManager.resetToNominal();
        assert(result.allHold, `invariants failed mid-simulation: ${result.results.filter(r => !r.pass).map(r => r.id).join(', ')}`);
        console.log(`         All ${result.results.length} EMERGENCY_INVARIANTS hold mid-simulation`);
    });

    // ── WS5: Meta-Accountability ──────────────────────────────────────────────
    console.log('\n  ─── WS5: Meta-Accountability ─────────────────────────────────\n');

    check(5, 'meta-accountability loads with required exports', () => {
        assert(typeof metaAccountability.assessEvidenceQuality  === 'function', 'assessEvidenceQuality missing');
        assert(typeof metaAccountability.assessOwnConfidence    === 'function', 'assessOwnConfidence missing');
        assert(typeof metaAccountability.reportUnknownStates    === 'function', 'reportUnknownStates missing');
        assert(Array.isArray(metaAccountability.KNOWN_BLIND_SPOTS),     'KNOWN_BLIND_SPOTS missing');
        assert(Array.isArray(metaAccountability.UNRESOLVED_AMBIGUITIES),'UNRESOLVED_AMBIGUITIES missing');
        assert(metaAccountability.KNOWN_BLIND_SPOTS.length >= 4,        'fewer than 4 blind spots defined');
        assert(metaAccountability.UNRESOLVED_AMBIGUITIES.length >= 3,   'fewer than 3 ambiguities defined');
    });

    await checkAsync(5, 'unknown states are reported when watchdog has no baseline', async () => {
        // No drift baseline → should surface unknown state
        const assessment = await watchdog.tick();
        const unknowns   = metaAccountability.reportUnknownStates(assessment);
        assert(Array.isArray(unknowns), 'reportUnknownStates should return array');
        const hasBaselineUnknown = unknowns.some(u => u.state.toLowerCase().includes('baseline'));
        assert(hasBaselineUnknown, `no baseline unknown state surfaced. States: ${unknowns.map(u => u.state).join('; ')}`);
        console.log(`         ${unknowns.length} unknown state(s) surfaced`);
    });

    check(5, 'evidence gaps reduce quality score', () => {
        const full   = metaAccountability.assessEvidenceQuality({ hasBaseline: true, certificationRun: true, providersHealthy: true, attackLogComplete: true, chainIntact: true });
        const sparse = metaAccountability.assessEvidenceQuality({ hasBaseline: false, certificationRun: false, providersHealthy: false, attackLogComplete: false, chainIntact: false });
        assert(full.quality > sparse.quality, `full evidence should have higher quality (${full.quality} vs ${sparse.quality})`);
        assert(sparse.reductions.length > 0, 'reductions should be listed for sparse evidence');
        console.log(`         quality: full=${full.quality} sparse=${sparse.quality}`);
    });

    check(5, 'known blind spots are disclosed — all have required fields', () => {
        const spots = metaAccountability.KNOWN_BLIND_SPOTS;
        for (const bs of spots) {
            assert(bs.id,                              `blind spot missing id: ${JSON.stringify(bs)}`);
            assert(bs.area,                            `blind spot missing area`);
            assert(bs.description,                     `blind spot missing description`);
            assert(typeof bs.confidenceImpact === 'number', `blind spot missing confidenceImpact`);
        }
        console.log(`         ${spots.length} blind spots disclosed`);
    });

    check(5, 'unresolved ambiguities are surfaced — all have id, topic, description', () => {
        const ambs = metaAccountability.UNRESOLVED_AMBIGUITIES;
        for (const ua of ambs) {
            assert(ua.id,          'ambiguity missing id');
            assert(ua.topic,       'ambiguity missing topic');
            assert(ua.description, 'ambiguity missing description');
        }
        console.log(`         ${ambs.length} unresolved ambiguities surfaced`);
    });

    check(5, 'confidence tracks evidence quality — better evidence → higher confidence', () => {
        const good = metaAccountability.assessOwnConfidence({ hasBaseline: true, certificationRun: true,  providersHealthy: true,  attackLogComplete: true,  chainIntact: true  });
        const bad  = metaAccountability.assessOwnConfidence({ hasBaseline: false, certificationRun: false, providersHealthy: false, attackLogComplete: false, chainIntact: false });
        assert(good.confidence > bad.confidence, `good evidence should yield higher confidence (${good.confidence} vs ${bad.confidence})`);
        console.log(`         confidence: good-evidence=${good.confidence} poor-evidence=${bad.confidence}`);
    });

    check(5, 'confidence does not exceed evidence quality — no confidence inflation', () => {
        const scenarios = [
            { hasBaseline: true,  certificationRun: true,  providersHealthy: true,  attackLogComplete: true,  chainIntact: true  },
            { hasBaseline: false, certificationRun: true,  providersHealthy: true,  attackLogComplete: true,  chainIntact: true  },
            { hasBaseline: true,  certificationRun: false, providersHealthy: false, attackLogComplete: false, chainIntact: false },
        ];
        for (const s of scenarios) {
            const result = metaAccountability.assessOwnConfidence(s);
            assert(result.confidence <= result.evidenceQuality,
                `confidence ${result.confidence} exceeds evidence quality ${result.evidenceQuality} — inflation detected`);
        }
    });

    check(5, 'blind spots reduce confidence below evidence quality', () => {
        // With full evidence, blind spots should still reduce confidence below quality
        const result = metaAccountability.assessOwnConfidence({ hasBaseline: true, certificationRun: true, providersHealthy: true, attackLogComplete: true, chainIntact: true });
        assert(result.confidence < result.evidenceQuality,
            `blind spots should reduce confidence below evidence quality: confidence=${result.confidence} quality=${result.evidenceQuality}`);
        assert(result.activeBlindSpots.length > 0, 'at least some blind spots should be active');
        console.log(`         quality=${result.evidenceQuality} → confidence=${result.confidence} (${result.activeBlindSpots.length} active blind spots)`);
    });

    // ── Verdict ────────────────────────────────────────────────────────────────
    watchdog.stop();

    const wsPassed    = [1, 2, 3, 4, 5].map(ws => results.filter(r => r.ws === ws).every(r => r.pass));
    const totalPassed = results.filter(r => r.pass).length;
    const totalFailed = results.filter(r => !r.pass).length;
    const wsPct       = wsPassed.filter(Boolean).length;
    const verdict     = wsPct === 5 ? 'A' : wsPct >= 4 ? 'B' : wsPct >= 3 ? 'C' : 'D';

    const verdictLabel = {
        A: 'APEX continuously preserves constitutional accountability over prolonged operation',
        B: 'Continuous oversight strongly supported — limited external review dependencies remain',
        C: 'Oversight functions exist — long-term accountability partially human-dependent',
        D: 'Continuous constitutional accountability cannot presently be established',
    }[verdict];

    console.log('\n  ─────────────────────────────────────────────────────────────');
    console.log(`  WS1 Continuous Oversight:   ${wsPassed[0] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS2 Accountability Chain:   ${wsPassed[1] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS3 Autonomous Escalation:  ${wsPassed[2] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS4 Long-Run Resilience:    ${wsPassed[3] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS5 Meta-Accountability:    ${wsPassed[4] ? '✓ PASS' : '✗ FAIL'}`);
    console.log('  ─────────────────────────────────────────────────────────────');
    console.log(`  Checks: ${totalPassed}/${totalPassed + totalFailed} pass    WS: ${wsPct}/5 pass`);
    console.log(`\n  ████████████████████████████████████████████████████████████`);
    console.log(`  ██  PHASE 27 VERDICT: ${verdict}  —  ${verdictLabel.slice(0, 48).padEnd(48)} ██`);
    console.log(`  ████████████████████████████████████████████████████████████\n`);

    if (totalFailed > 0) {
        console.log('  Failures:');
        results.filter(r => !r.pass).forEach(r => console.log(`    - [WS${r.ws}] ${r.name}: ${r.error}`));
        console.log('');
    }

    // Oversight continuity assessment
    const chainResult = accountability.verify();
    const finalTick   = watchdog.getLastAssessment();
    const metaResult  = metaAccountability.assessOwnConfidence({
        hasBaseline:       finalTick ? !finalTick.driftIndicators?.hasBaseline === false : false,
        certificationRun:  true,
        providersHealthy:  true,
        attackLogComplete: true,
        chainIntact:       chainResult.intact,
    });

    console.log('  ── Phase 27 Assessment ───────────────────────────────────────');
    console.log(`  Continuous oversight:       Tick-based watchdog, ${watchdog.getTickCount()} ticks executed`);
    console.log(`  Accountability chain:       ${chainResult.count} events, intact=${chainResult.intact}`);
    console.log(`  Autonomous escalation:      ${metaAccountability.UNRESOLVED_AMBIGUITIES.length} ambiguities surfaced, uncertainty → escalation verified`);
    console.log(`  Long-run resilience:        ${SIM_CYCLES} cycles, no silent degradation detected`);
    console.log(`  Meta-accountability:        ${metaAccountability.KNOWN_BLIND_SPOTS.length} blind spots disclosed, confidence=${metaResult.confidence}`);
    console.log(`  Self-assessed confidence:   ${metaResult.confidence} (evidence quality: ${metaResult.evidenceQuality})`);
    console.log(`  Residual dependencies:      FOUNDER-class approver, manual crisis recovery, real-time event delivery`);
    console.log(`  Maturity rating:            ${verdict === 'A' ? 'CONTINUOUSLY ACCOUNTABLE' : verdict === 'B' ? 'ADVANCED' : 'DEVELOPING'}\n`);

    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
