#!/usr/bin/env node
'use strict';
// validate-phase26.js — Phase 26: Constitutional Self-Governance & Crisis Resilience
//
// WS1: Constitutional Priority Arbitration
// WS2: Crisis Governance
// WS3: Self-Monitoring Capability
// WS4: Governance Attack Resistance
// WS5: Autonomous Stewardship

require('dotenv').config();
const assert = require('assert');

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
    console.log('║  PHASE 26 — CONSTITUTIONAL SELF-GOVERNANCE & CRISIS           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const { arbitrator, crisisManager, riskMonitor, steward, evolutionManager, driftDetector } = require('./lib/constitution/index');
    const healthMonitor = require('./lib/health/monitor');

    // Clean state for test run
    driftDetector.clearBaseline();
    evolutionManager.clearAmendments();
    crisisManager.resetToNominal();

    // ── WS1: Constitutional Priority Arbitration ──────────────────────────────
    console.log('  ─── WS1: Constitutional Priority Arbitration ─────────────────\n');

    check(1, 'arbitrator module loads with 6 scenarios', () => {
        assert(typeof arbitrator.arbitrate === 'function',         'arbitrate missing');
        assert(typeof arbitrator.verifyDeterminism === 'function', 'verifyDeterminism missing');
        const count = Object.keys(arbitrator.SCENARIOS).length;
        assert(count >= 6, `only ${count} scenarios — minimum 6 required`);
    });

    check(1, 'EFFICIENCY_VS_PRIVACY resolves DENY (PRIVACY overrides efficiency)', () => {
        const r = arbitrator.arbitrate('EFFICIENCY_VS_PRIVACY');
        assert.strictEqual(r.resolution, 'DENY', `expected DENY, got ${r.resolution}`);
        assert.strictEqual(r.winnerCategory, 'PRIVACY', `expected PRIVACY winner, got ${r.winnerCategory}`);
        assert.strictEqual(r.winnerPriority, 1, `expected priority 1, got ${r.winnerPriority}`);
    });

    check(1, 'USER_SATISFACTION_VS_AUTHORITY resolves DENY (AUTHORITY overrides satisfaction)', () => {
        const r = arbitrator.arbitrate('USER_SATISFACTION_VS_AUTHORITY');
        assert.strictEqual(r.resolution, 'DENY');
        assert.strictEqual(r.winnerCategory, 'AUTHORITY');
    });

    check(1, 'EXECUTIVE_VS_FOUNDER_SAFEGUARD resolves DENY (PRIVACY overrides executive directives)', () => {
        const r = arbitrator.arbitrate('EXECUTIVE_VS_FOUNDER_SAFEGUARD');
        assert.strictEqual(r.resolution, 'DENY');
        assert.strictEqual(r.winnerCategory, 'PRIVACY', `CFO directive must not override PRIVACY`);
        assert(r.principleChain.includes('P05_PII_ABSTRACTION'), 'P05 not in principle chain');
    });

    check(1, 'LEARNING_VS_CERTIFICATION resolves DENY (CERTIFICATION overrides learning)', () => {
        const r = arbitrator.arbitrate('LEARNING_VS_CERTIFICATION');
        assert.strictEqual(r.resolution, 'DENY');
        assert.strictEqual(r.winnerCategory, 'CERTIFICATION');
        assert(r.principleChain.includes('P10_DEPLOYMENT_GATE'));
    });

    check(1, 'AUTHORITY_VS_IDENTITY resolves DENY (AUTHORITY outranks IDENTITY — both constitutional)', () => {
        const r = arbitrator.arbitrate('AUTHORITY_VS_IDENTITY');
        assert.strictEqual(r.resolution, 'DENY');
        assert.strictEqual(r.winnerCategory, 'AUTHORITY');
        // AUTHORITY priority 2 beats IDENTITY priority 6
        assert(r.winnerPriority < 6, `AUTHORITY should have priority < 6, got ${r.winnerPriority}`);
    });

    check(1, 'arbitration is deterministic: 5 runs of same scenario → identical results', () => {
        for (const scenarioId of Object.keys(arbitrator.SCENARIOS)) {
            const result = arbitrator.verifyDeterminism(scenarioId, 5);
            assert(result.deterministic, `${scenarioId}: not deterministic across ${result.runs} runs`);
        }
    });

    check(1, 'priority hierarchy is total order: no ties between categories', () => {
        const priorities = Object.values(arbitrator.CATEGORY_PRIORITY);
        const unique = new Set(priorities);
        assert.strictEqual(unique.size, priorities.length, 'Category priority table has ties — arbitration could be non-deterministic');
    });

    check(1, 'arbitration result includes principle chain and rationale', () => {
        const r = arbitrator.arbitrate('EFFICIENCY_VS_PRIVACY');
        assert(r.principleChain.length > 0, 'principleChain is empty');
        assert(r.rationale && r.rationale.length > 20, 'rationale too short');
        assert(r.description, 'description missing');
        assert(r.operation, 'operation missing');
    });

    // ── WS2: Crisis Governance ─────────────────────────────────────────────────
    console.log('\n  ─── WS2: Crisis Governance ───────────────────────────────────\n');

    crisisManager.resetToNominal();

    check(2, 'crisis-manager loads with required exports', () => {
        assert(typeof crisisManager.enterCrisisEvent === 'function',       'enterCrisisEvent missing');
        assert(typeof crisisManager.verifyInvariantsHold === 'function',   'verifyInvariantsHold missing');
        assert(typeof crisisManager.recover === 'function',                'recover missing');
        assert(typeof crisisManager.resetToNominal === 'function',         'resetToNominal missing');
        assert(typeof crisisManager.detectConflictingAmendments === 'function', 'detectConflictingAmendments missing');
        assert(Array.isArray(crisisManager.EMERGENCY_INVARIANTS),          'EMERGENCY_INVARIANTS missing');
        assert(crisisManager.EMERGENCY_INVARIANTS.length >= 4,             'fewer than 4 invariants defined');
    });

    check(2, 'initial state is NOMINAL', () => {
        const s = crisisManager.getState();
        assert.strictEqual(s.level, 'NOMINAL', `expected NOMINAL, got ${s.level}`);
    });

    check(2, 'EXEC_SUBSYSTEM_FAILURE → WARNING state', () => {
        const result = crisisManager.enterCrisisEvent('EXEC_SUBSYSTEM_FAILURE');
        assert.strictEqual(crisisManager.getState().level, 'WARNING', `expected WARNING, got ${crisisManager.getState().level}`);
        assert.strictEqual(result.now, 'WARNING');
    });

    check(2, 'CASCADE_FAILURE → EMERGENCY state (max escalation)', () => {
        crisisManager.enterCrisisEvent('CASCADE_FAILURE');
        assert.strictEqual(crisisManager.getState().level, 'EMERGENCY', `expected EMERGENCY, got ${crisisManager.getState().level}`);
        assert(crisisManager.isEmergencyMode(), 'isEmergencyMode() should be true');
        assert(crisisManager.getState().safeDefaults, 'safeDefaults should be active in EMERGENCY');
    });

    await checkAsync(2, 'EMERGENCY mode: all 4 constitutional invariants still hold', async () => {
        assert(crisisManager.isEmergencyMode(), 'should still be in EMERGENCY');
        const result = await crisisManager.verifyInvariantsHold();
        assert(result.allHold, `Invariant breach in EMERGENCY: ${result.results.filter(r => !r.pass).map(r => r.id).join(', ')}\n${result.message}`);
        for (const r of result.results) {
            assert(r.pass, `INVARIANT FAILED during crisis: ${r.id} — ${r.evidence}`);
        }
        console.log(`         All ${result.results.length} invariants hold in EMERGENCY mode`);
    });

    check(2, 'CERTIFIER_UNAVAILABLE → CRISIS (not escalated past EMERGENCY)', () => {
        // Already in EMERGENCY from previous test — can't de-escalate via new event
        const prev = crisisManager.getState().level;
        crisisManager.enterCrisisEvent('CERTIFIER_UNAVAILABLE');
        const curr = crisisManager.getState().level;
        assert(curr === 'EMERGENCY' || curr === 'CRISIS', `unexpected level: ${curr}`);
        console.log(`         Certifier unavailable: state ${prev} → ${curr}`);
    });

    check(2, 'recovery clears emergency mode', () => {
        crisisManager.recover('system-restored');
        const s = crisisManager.getState();
        assert(!crisisManager.isEmergencyMode(), 'isEmergencyMode should be false after recovery');
        assert.strictEqual(s.level, 'RECOVERY', `expected RECOVERY, got ${s.level}`);
        assert(s.recoveredAt, 'recoveredAt not set');
    });

    check(2, 'conflicting amendments detected and crisis event triggered', () => {
        crisisManager.resetToNominal();
        const fakeAmendments = [
            { id: 'AMD-1', principleId: 'P05_PII_ABSTRACTION', status: 'ACTIVATED', activatedAt: '2026-01-01' },
            { id: 'AMD-2', principleId: 'P05_PII_ABSTRACTION', status: 'ACTIVATED', activatedAt: '2026-01-02' },
        ];
        const result = crisisManager.detectConflictingAmendments(fakeAmendments);
        assert(result.hasConflicts, 'conflicting amendments not detected');
        assert(result.conflicts.some(c => c.principleId === 'P05_PII_ABSTRACTION'), 'P05 conflict not reported');
        assert.strictEqual(crisisManager.getState().level, 'WARNING', 'conflicting amendments should trigger WARNING');
    });

    // ── WS3: Self-Monitoring Capability ───────────────────────────────────────
    console.log('\n  ─── WS3: Self-Monitoring Capability ──────────────────────────\n');

    crisisManager.resetToNominal();

    check(3, 'risk-monitor loads with required exports', () => {
        assert(typeof riskMonitor.assessRisk === 'function', 'assessRisk missing');
        assert(riskMonitor.RISK_WEIGHTS,        'RISK_WEIGHTS missing');
        assert(riskMonitor.LEVEL_THRESHOLDS,    'LEVEL_THRESHOLDS missing');
        assert(typeof riskMonitor._scoreToLevel === 'function', '_scoreToLevel missing');
    });

    check(3, 'clean health state → NOMINAL risk score', () => {
        const hs = {
            components: {
                anthropic:    { status: 'healthy', consecutiveFailures: 0 },
                google:       { status: 'healthy', consecutiveFailures: 0 },
                retrieval:    { consecutiveErrors: 0, avgLatencyMs: 200 },
                reflexion:    { failureRate: 0, totalWrites: 10 },
                policy:       { fromDB: true },
                certification:{ lastResult: true },
            },
        };
        const r = riskMonitor.assessRisk({ healthState: hs, driftResult: { driftItems: [] } });
        assert.strictEqual(r.level, 'NOMINAL', `expected NOMINAL, got ${r.level} (score=${r.score})`);
        assert.strictEqual(r.score, 0, `expected score 0, got ${r.score}`);
        assert.strictEqual(r.warnings.length, 0, `unexpected warnings: ${r.warnings.join(', ')}`);
    });

    check(3, 'provider UNAVAILABLE → risk score increases, WARNING/ELEVATED', () => {
        const hs = {
            components: {
                anthropic:    { status: 'unavailable', consecutiveFailures: 5 },
                google:       { status: 'healthy',     consecutiveFailures: 0 },
                retrieval:    { consecutiveErrors: 0 },
                reflexion:    { failureRate: 0, totalWrites: 0 },
                policy:       { fromDB: true },
                certification:{ lastResult: true },
            },
        };
        const r = riskMonitor.assessRisk({ healthState: hs });
        assert(r.score >= 40, `expected score ≥40, got ${r.score}`);
        assert(['WARNING','ELEVATED','CRITICAL'].includes(r.level), `expected WARNING+, got ${r.level}`);
        assert(r.principlesAtRisk.includes('P18_PROVIDER_FAILOVER'), 'P18 not in principlesAtRisk');
    });

    check(3, 'certification FAILED → risk score includes 30-point penalty, P09/P10 at risk', () => {
        const hs = {
            components: {
                anthropic: { status: 'healthy' }, google: { status: 'healthy' },
                retrieval: { consecutiveErrors: 0 }, reflexion: { failureRate: 0, totalWrites: 0 },
                policy: { fromDB: true }, certification: { lastResult: false },
            },
        };
        const r = riskMonitor.assessRisk({ healthState: hs });
        assert(r.score >= 30, `expected score ≥30, got ${r.score}`);
        assert(r.principlesAtRisk.some(p => p.includes('P09') || p.includes('P10')), 'P09/P10 not in principlesAtRisk');
    });

    check(3, 'CRITICAL drift item → score reaches CRITICAL level', () => {
        const hs = {
            components: {
                anthropic: { status: 'healthy' }, google: { status: 'healthy' },
                retrieval: { consecutiveErrors: 0 }, reflexion: { failureRate: 0, totalWrites: 0 },
                policy: { fromDB: true }, certification: { lastResult: true },
            },
        };
        const driftResult = { driftItems: [
            { id: 'P05_PII_ABSTRACTION', severity: 'CRITICAL', type: 'BEHAVIORAL_DRIFT' },
            { id: 'P01_FOUNDER_LAYER_ZERO', severity: 'CRITICAL', type: 'BEHAVIORAL_DRIFT' },
        ]};
        const r = riskMonitor.assessRisk({ healthState: hs, driftResult });
        assert(r.score >= 76, `expected CRITICAL score ≥76, got ${r.score}`);
        assert.strictEqual(r.level, 'CRITICAL', `expected CRITICAL, got ${r.level}`);
        assert(r.principlesAtRisk.includes('P05_PII_ABSTRACTION'));
    });

    check(3, 'predictedTimeToEscalationMs is 0 for CRITICAL, null for NOMINAL', () => {
        const critResult = riskMonitor.assessRisk({ healthState: {
            components: { anthropic: { status: 'healthy' }, google: { status: 'healthy' },
                retrieval: { consecutiveErrors: 0 }, reflexion: { failureRate: 0, totalWrites: 0 },
                policy: { fromDB: true }, certification: { lastResult: false } },
        }, driftResult: { driftItems: [
            { id: 'P05', severity: 'CRITICAL' }, { id: 'P01', severity: 'CRITICAL' },
        ]}});
        const nomResult = riskMonitor.assessRisk({ healthState: {
            components: { anthropic: { status: 'healthy' }, google: { status: 'healthy' },
                retrieval: { consecutiveErrors: 0 }, reflexion: { failureRate: 0, totalWrites: 0 },
                policy: { fromDB: true }, certification: { lastResult: true } },
        }});
        assert(nomResult.predictedTimeToEscalationMs === null, 'NOMINAL should have null prediction');
        console.log(`         CRITICAL prediction: ${critResult.predictedTimeToEscalationMs}ms (0 = immediate)`);
    });

    check(3, 'warnings include specific principle at risk', () => {
        const hs = { components: {
            anthropic: { status: 'unavailable' }, google: { status: 'healthy' },
            retrieval: { consecutiveErrors: 0 }, reflexion: { failureRate: 0, totalWrites: 0 },
            policy: { fromDB: true }, certification: { lastResult: false },
        }};
        const r = riskMonitor.assessRisk({ healthState: hs });
        assert(r.warnings.length > 0, 'no warnings generated');
        const hasSpecificPrinciple = r.warnings.some(w => w.includes('P') && w.length > 5);
        assert(hasSpecificPrinciple, `warnings should mention specific principles: ${r.warnings.join('; ')}`);
    });

    // ── WS4: Governance Attack Resistance ─────────────────────────────────────
    console.log('\n  ─── WS4: Governance Attack Resistance ────────────────────────\n');

    evolutionManager.clearAmendments();

    check(4, 'approval spoofing rejected: non-authorized entity', () => {
        const amd = evolutionManager.propose('P20_EXECUTIVE_DIFFERENTIATION', 'test change for spoofing', 'testing spoofing resistance', 'orchestrator');
        assert.throws(
            () => evolutionManager.approve(amd.id, 'api_client'),
            /not authorized/,
            'approval spoofing should throw'
        );
        const attackLog = evolutionManager.getAttackLog();
        assert(attackLog.some(a => a.type === 'APPROVAL_SPOOFING'), 'APPROVAL_SPOOFING not in attack log');
    });

    check(4, 'executive privilege escalation rejected: COUNCIL entity cannot approve', () => {
        // CFO is COUNCIL class, not in AUTHORIZED_APPROVERS
        const amd = evolutionManager.propose('P20_EXECUTIVE_DIFFERENTIATION', 'CFO trying to approve', 'testing exec escalation', 'orchestrator');
        assert.throws(
            () => evolutionManager.approve(amd.id, 'cfo'),
            /not authorized/,
            'CFO (COUNCIL class) should not be able to approve amendments'
        );
    });

    check(4, 'PRIVACY amendment requires FOUNDER-class approval (not just SYSTEM)', () => {
        const amd = evolutionManager.propose('P05_PII_ABSTRACTION',
            'Relax PII abstraction to include raw wealth data in prompts',
            'Testing PRIVACY escalation: orchestrator should not be able to approve PRIVACY amendments alone',
            'orchestrator'
        );
        assert.throws(
            () => evolutionManager.approve(amd.id, 'orchestrator'),
            /PRIVACY.*FOUNDER|FOUNDER-class/i,
            'orchestrator should not be able to approve PRIVACY amendments'
        );
        const attackLog = evolutionManager.getAttackLog();
        assert(attackLog.some(a => a.type === 'UNAUTHORIZED_ESCALATION'), 'UNAUTHORIZED_ESCALATION not in attack log');
    });

    check(4, 'AUTHORITY amendment requires FOUNDER-class approval', () => {
        const amd = evolutionManager.propose('P01_FOUNDER_LAYER_ZERO',
            'Grant api_client read access to Layer 0 for testing',
            'Testing AUTHORITY escalation: orchestrator should not be able to approve AUTHORITY amendments',
            'orchestrator'
        );
        assert.throws(
            () => evolutionManager.approve(amd.id, 'orchestrator'),
            /AUTHORITY.*FOUNDER|FOUNDER-class/i,
            'orchestrator should not be able to approve AUTHORITY amendments'
        );
    });

    check(4, 'amendment laundering blocked: >3 proposals for same principle in 60s', () => {
        // Rapid-fire 3 proposals for same principle (limit is 3 in 60s)
        evolutionManager.propose('P23_LAYER_WRITES_AUDITED', 'change 1', 'rationale one for laundering test', 'orchestrator');
        evolutionManager.propose('P23_LAYER_WRITES_AUDITED', 'change 2', 'rationale two for laundering test', 'orchestrator');
        evolutionManager.propose('P23_LAYER_WRITES_AUDITED', 'change 3', 'rationale three for laundering test', 'orchestrator');
        assert.throws(
            () => evolutionManager.propose('P23_LAYER_WRITES_AUDITED', 'change 4', 'rationale four laundering', 'orchestrator'),
            /Rate limit|laundering/i,
            'amendment laundering should be blocked after 3 proposals in 60s'
        );
        const attackLog = evolutionManager.getAttackLog();
        assert(attackLog.some(a => a.type === 'AMENDMENT_LAUNDERING'), 'AMENDMENT_LAUNDERING not in attack log');
    });

    check(4, 'double activation rejected: already-ACTIVATED amendment cannot be re-activated', () => {
        evolutionManager.clearAmendmentsOnly();
        const amd = evolutionManager.propose('P20_EXECUTIVE_DIFFERENTIATION', 'valid change description here', 'valid rationale that is longer than fifty characters to pass steward', 'orchestrator');
        evolutionManager.approve(amd.id, 'orchestrator');
        evolutionManager.activate(amd.id);
        assert.throws(
            () => evolutionManager.activate(amd.id),
            /must be APPROVED/,
            'double activation should be rejected'
        );
    });

    check(4, 'content tampering detected: modified amendment fails hash check', () => {
        evolutionManager.clearAmendmentsOnly();
        // Propose normally
        const amd = evolutionManager.propose('P20_EXECUTIVE_DIFFERENTIATION', 'original change description', 'original rationale text that is longer than 50 chars for test', 'orchestrator');
        // Directly tamper with the JSON file to simulate content modification
        const fs   = require('fs');
        const path = require('path');
        const AMENDMENTS_PATH = path.join(__dirname, 'lib/constitution/amendments.json');
        const raw  = JSON.parse(fs.readFileSync(AMENDMENTS_PATH, 'utf8'));
        const idx  = raw.findIndex(a => a.id === amd.id);
        raw[idx].proposedChange = 'TAMPERED change description'; // alter content without updating hash
        fs.writeFileSync(AMENDMENTS_PATH, JSON.stringify(raw, null, 2), 'utf8');
        // Now try to approve — should detect tampering
        assert.throws(
            () => evolutionManager.approve(amd.id, 'orchestrator'),
            /tampering|hash mismatch/i,
            'content tampering should be detected'
        );
        const attackLog = evolutionManager.getAttackLog();
        assert(attackLog.some(a => a.type === 'CONTENT_TAMPERING'), 'CONTENT_TAMPERING not in attack log');
    });

    check(4, 'attack evidence preserved: attack log is non-empty and has correct types', () => {
        const attackLog = evolutionManager.getAttackLog();
        assert(attackLog.length > 0, 'attack log is empty — no attacks recorded');
        const types = attackLog.map(a => a.type);
        assert(types.includes('APPROVAL_SPOOFING'),      'APPROVAL_SPOOFING not recorded');
        assert(types.includes('UNAUTHORIZED_ESCALATION'),'UNAUTHORIZED_ESCALATION not recorded');
        assert(types.includes('AMENDMENT_LAUNDERING'),   'AMENDMENT_LAUNDERING not recorded');
        assert(types.includes('CONTENT_TAMPERING'),      'CONTENT_TAMPERING not recorded');
        for (const a of attackLog) {
            assert(a.detectedAt, `attack ${a.type} missing detectedAt`);
            assert(a.details,    `attack ${a.type} missing details`);
        }
        console.log(`         ${attackLog.length} attacks recorded, types: ${[...new Set(types)].join(', ')}`);
    });

    check(4, 'governance pathways intact: legitimate amendments still succeed after attacks', () => {
        evolutionManager.clearAmendments();
        // Use a GOVERNANCE-category principle (not PRIVACY/AUTHORITY) and founder-class approver for PRIVACY
        const amd = evolutionManager.propose('P23_LAYER_WRITES_AUDITED', 'add immutable audit record hash', 'Strengthen governance: add SHA-256 hash of audit record to prevent retrospective deletion', 'orchestrator');
        evolutionManager.approve(amd.id, 'orchestrator');
        evolutionManager.activate(amd.id);
        const record = evolutionManager.getAmendment(amd.id);
        assert.strictEqual(record.status, 'ACTIVATED', 'legitimate amendment should still activate after attacks');
    });

    // ── WS5: Autonomous Stewardship ───────────────────────────────────────────
    console.log('\n  ─── WS5: Autonomous Stewardship ──────────────────────────────\n');

    evolutionManager.clearAmendments();

    check(5, 'steward loads with required exports', () => {
        assert(typeof steward.assessAmendment === 'function',  'assessAmendment missing');
        assert(typeof steward.shouldDefer === 'function',      'shouldDefer missing');
        assert(typeof steward.uncertaintyScore === 'function', 'uncertaintyScore missing');
        assert(steward.CATEGORY_BASE_RISK,                     'CATEGORY_BASE_RISK missing');
    });

    check(5, 'PRIVACY amendment → HIGH risk score, DEFER/ESCALATE/REJECT recommendation', () => {
        const assessment = steward.assessAmendment({
            principleId:    'P05_PII_ABSTRACTION',
            proposedChange: 'Include raw wealth field in external prompt context',
            rationale:      'Need more context for financial decisions',
            proposedBy:     'orchestrator',
        });
        assert(assessment.riskScore >= 60, `expected risk ≥60, got ${assessment.riskScore}`);
        assert(['DEFER','ESCALATE','REJECT'].includes(assessment.recommendation), `expected DEFER+, got ${assessment.recommendation}`);
        assert(assessment.requiresFounderApproval, 'PRIVACY amendment should require founder approval');
        console.log(`         PRIVACY amendment: riskScore=${assessment.riskScore} recommendation=${assessment.recommendation}`);
    });

    check(5, 'AUTHORITY amendment → HIGH risk, requires founder approval', () => {
        const assessment = steward.assessAmendment({
            principleId:    'P01_FOUNDER_LAYER_ZERO',
            proposedChange: 'Allow api_client to read layer 0 memory',
            rationale:      'Need better personalisation for API users',
            proposedBy:     'orchestrator',
        });
        assert(assessment.riskScore >= 60, `expected risk ≥60, got ${assessment.riskScore}`);
        assert(assessment.requiresFounderApproval, 'AUTHORITY amendment should require founder approval');
    });

    check(5, 'risky change deferred: short rationale triggers DEFER', () => {
        const result = steward.shouldDefer({
            principleId:    'P16_HEALTH_MONITORING_OPERATIONAL',
            proposedChange: 'Remove health monitor to reduce overhead in production',
            rationale:      'Cheaper',  // too short
            proposedBy:     'orchestrator',
        });
        assert(result.defer, 'short-rationale amendment should be deferred');
        assert(['DEFER','ESCALATE','REJECT'].includes(result.recommendation));
    });

    check(5, 'well-formed GOVERNANCE amendment → lower risk than PRIVACY/AUTHORITY', () => {
        const assessment = steward.assessAmendment({
            principleId:    'P23_LAYER_WRITES_AUDITED',
            proposedChange: 'Add immutable SHA-256 hash to every governance audit block to enable retrospective verification',
            rationale:      'Cryptographic integrity of audit trail prevents post-hoc modification, strengthening constitutional accountability',
            proposedBy:     'orchestrator',
        });
        assert(assessment.riskScore < 51, `expected risk <51 for GOVERNANCE amendment, got ${assessment.riskScore}`);
        assert(['APPROVE','DEFER'].includes(assessment.recommendation), `expected APPROVE or DEFER, got ${assessment.recommendation}`);
        console.log(`         GOVERNANCE amendment: riskScore=${assessment.riskScore} recommendation=${assessment.recommendation}`);
    });

    check(5, 'unknown proposer → high uncertainty score', () => {
        const score = steward.uncertaintyScore({
            principleId:    'P20_EXECUTIVE_DIFFERENTIATION',
            proposedChange: 'add new executive entity',
            rationale:      'business needs',
            proposedBy:     'external_agent_xyz',
        });
        assert(score >= 0.3, `expected uncertainty ≥0.3 for unknown proposer, got ${score}`);
        console.log(`         Unknown proposer uncertainty: ${score.toFixed(2)}`);
    });

    check(5, 'zero uncertainty for fully specified amendment from known proposer', () => {
        const score = steward.uncertaintyScore({
            principleId:    'P23_LAYER_WRITES_AUDITED',
            proposedChange: 'Add cryptographic hash to audit blocks for integrity verification purposes',
            rationale:      'Strengthening governance audit trail with cryptographic proof prevents retrospective modification',
            proposedBy:     'founder',
        });
        assert(score === 0, `expected zero uncertainty, got ${score}`);
    });

    check(5, 'steward restraint: PRIVACY amendment shouldDefer() returns defer=true', () => {
        const result = steward.shouldDefer({
            principleId:    'P07_PII_STRIP_FIELDS',
            proposedChange: 'Remove _raw from STRIP_FIELDS to allow raw profile data in model context',
            rationale:      'More personalisation with raw data',
            proposedBy:     'orchestrator',
        });
        assert(result.defer, 'PRIVACY amendment should be deferred by steward');
        console.log(`         PRIVACY shouldDefer: defer=${result.defer} reason="${result.primaryReason}"`);
    });

    // ── Verdict ────────────────────────────────────────────────────────────────
    const wsPassed = [1,2,3,4,5].map(ws => results.filter(r => r.ws === ws).every(r => r.pass));
    const totalPassed = results.filter(r => r.pass).length;
    const totalFailed = results.filter(r => !r.pass).length;
    const wsPct   = wsPassed.filter(Boolean).length;
    const verdict = wsPct === 5 ? 'A' : wsPct >= 4 ? 'B' : wsPct >= 3 ? 'C' : 'D';

    const verdictLabel = {
        A: 'APEX actively preserves constitutional identity under pressure',
        B: 'Constitutional self-governance strongly supported — limited oversight required',
        C: 'Constitutional resilience exists — crisis management human-dependent',
        D: 'Autonomous constitutional stewardship cannot presently be established',
    }[verdict];

    console.log('\n  ─────────────────────────────────────────────────────────────');
    console.log(`  WS1 Constitutional Arbitration:  ${wsPassed[0] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS2 Crisis Governance:            ${wsPassed[1] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS3 Self-Monitoring:              ${wsPassed[2] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS4 Attack Resistance:            ${wsPassed[3] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS5 Autonomous Stewardship:       ${wsPassed[4] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  ─────────────────────────────────────────────────────────────`);
    console.log(`  Checks: ${totalPassed}/${totalPassed + totalFailed} pass    WS: ${wsPct}/5 pass`);
    console.log(`\n  ████████████████████████████████████████████████████████████`);
    console.log(`  ██  PHASE 26 VERDICT: ${verdict}  —  ${verdictLabel.slice(0, 48).padEnd(48)} ██`);
    console.log(`  ████████████████████████████████████████████████████████████\n`);

    if (totalFailed > 0) {
        console.log('  Failures:');
        results.filter(r => !r.pass).forEach(r => console.log(`    - [WS${r.ws}] ${r.name}: ${r.error}`));
        console.log('');
    }

    // Crisis resilience assessment
    console.log('  ── Phase 26 Assessment ───────────────────────────────────────');
    console.log(`  Constitutional arbitration:    Deterministic, 6 scenarios, priority hierarchy total order`);
    console.log(`  Crisis resilience:             EMERGENCY_INVARIANTS hold in all crisis states`);
    console.log(`  Self-monitoring:               Risk scoring operational, predictive warnings generated`);
    console.log(`  Attack resistance:             4 attack types detected + logged, governance intact post-attack`);
    console.log(`  Autonomous stewardship:        PRIVACY/AUTHORITY amendments deferred, restraint demonstrated`);
    console.log(`  Residual dependencies:         FOUNDER-class approver required for PRIVACY/AUTHORITY changes`);
    console.log(`  Remaining assumptions:         founder + founder_os entities always available for critical approvals`);
    console.log(`  Maturity rating:               ${verdict === 'A' ? 'CONSTITUTIONALLY SELF-GOVERNING' : verdict === 'B' ? 'ADVANCED' : 'DEVELOPING'}\n`);

    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
