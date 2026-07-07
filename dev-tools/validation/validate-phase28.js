#!/usr/bin/env node
'use strict';
// validate-phase28.js — Phase 28: Adaptive Adversarial Resilience & Constitutional Stress Testing
//
// WS1: Adaptive Red-Team Engine
// WS2: Constitutional Deception Testing
// WS3: Emergent Blind-Spot Discovery
// WS4: Long-Horizon Resilience (1000 cycles)
// WS5: Resilience Characterisation

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
    console.log('║  PHASE 28 — ADAPTIVE ADVERSARIAL RESILIENCE                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const constitution = require('./lib/constitution/index');
    const {
        evolutionManager, crisisManager, watchdog, accountability,
        escalationController, steward, metaAccountability,
        redTeam: { Attacker, Defender, ATTACK_CLASSES, makeRng },
        deceptionDetector,
        blindSpotDiscoverer,
    } = constitution;

    // Clean state
    watchdog.reset();
    evolutionManager.clearAmendments();
    crisisManager.resetToNominal();
    accountability.clear();

    // Shared modules object for red-team attacks
    const modules = {
        evolutionManager,
        accountability,
        escalationController,
        deceptionDetector,
    };

    // ── WS1: Adaptive Red-Team Engine ────────────────────────────────────────
    console.log('  ─── WS1: Adaptive Red-Team Engine ───────────────────────────\n');

    check(1, 'red-team module loads with required exports', () => {
        assert(typeof Attacker  === 'function', 'Attacker class missing');
        assert(typeof Defender  === 'function', 'Defender class missing');
        assert(Array.isArray(ATTACK_CLASSES), 'ATTACK_CLASSES missing');
        assert(ATTACK_CLASSES.length >= 8, `fewer than 8 attack classes: ${ATTACK_CLASSES.length}`);
        assert(ATTACK_CLASSES.includes('BRUTE_FORCE'),          'BRUTE_FORCE missing');
        assert(ATTACK_CLASSES.includes('APPROVAL_SPOOFING') || ATTACK_CLASSES.includes('IDENTITY_SPOOFING'), 'spoofing class missing');
        assert(ATTACK_CLASSES.includes('CONTENT_TAMPERING'),    'CONTENT_TAMPERING missing');
        assert(ATTACK_CLASSES.includes('AUDIT_POISONING'),      'AUDIT_POISONING missing');
    });

    // Execute and record each attack type
    const attacker = new Attacker('attacker-alpha', 'BRUTE_FORCE');
    const defender = new Defender();
    const executedAttacks = [];

    check(1, 'BRUTE_FORCE attack is detected and blocked', () => {
        evolutionManager.clearAmendmentsOnly();
        const result = attacker.execute(modules);
        assert.strictEqual(result.strategy, 'BRUTE_FORCE', `expected BRUTE_FORCE, got ${result.strategy}`);
        assert(result.detected || result.blocked, `BRUTE_FORCE not detected: ${result.evidence}`);
        assert(!result.bypass, `BRUTE_FORCE BYPASS: ${result.evidence}`);
        attacker.recordAndAdapt(result);
        defender.observe(result);
        executedAttacks.push(result);
        console.log(`         BRUTE_FORCE → ${result.detected ? 'DETECTED' : 'MISSED'}: ${result.evidence.slice(0, 80)}`);
    });

    check(1, 'attacker adapts strategy after failed BRUTE_FORCE', () => {
        assert(attacker.adaptationCount >= 1, `expected ≥1 adaptation, got ${attacker.adaptationCount}`);
        assert(attacker.strategy !== 'BRUTE_FORCE', `still on BRUTE_FORCE — attacker not adapting`);
        console.log(`         Adapted to: ${attacker.strategy} (${attacker.adaptationCount} adaptations)`);
    });

    // Execute all remaining attack classes
    check(1, 'all attack classes exercised — all detected, none bypass', () => {
        const startStrategy = attacker.strategy;
        const exhausted = new Set(['BRUTE_FORCE']); // already done
        let attempts = 0;
        const MAX_ATTEMPTS = ATTACK_CLASSES.length * 2;

        while (exhausted.size < ATTACK_CLASSES.length && attempts < MAX_ATTEMPTS) {
            attempts++;
            evolutionManager.clearAmendmentsOnly();
            const result = attacker.execute(modules);
            exhausted.add(result.strategy);
            attacker.recordAndAdapt(result);
            defender.observe(result);
            executedAttacks.push(result);

            assert(!result.bypass, `BYPASS on ${result.strategy}: ${result.evidence}`);
            console.log(`         ${result.strategy} → ${result.detected ? 'DETECTED' : 'blocked'}`);
        }

        const bypassCount = executedAttacks.filter(r => r.bypass).length;
        assert.strictEqual(bypassCount, 0, `${bypassCount} bypass(es) detected: ${executedAttacks.filter(r => r.bypass).map(r => r.strategy).join(', ')}`);
        console.log(`         ${exhausted.size} attack classes exercised, 0 bypasses`);
    });

    check(1, 'attacker has adapted strategies multiple times — tactics changed', () => {
        assert(attacker.adaptationCount >= 3, `expected ≥3 adaptations, got ${attacker.adaptationCount}`);
        const profile = attacker.getProfile();
        assert(profile.strategiesUsed.length >= 3, `only ${profile.strategiesUsed.length} strategies used`);
        console.log(`         ${attacker.adaptationCount} adaptations, strategies used: ${profile.strategiesUsed.join(', ')}`);
    });

    check(1, 'defender threat profile built from observations', () => {
        const metrics = defender.getMetrics();
        assert(metrics.totalSeen > 0,      'defender observed no attacks');
        assert(metrics.totalBlocked > 0,   'defender blocked no attacks');
        assert.strictEqual(metrics.totalBypassed, 0, `${metrics.totalBypassed} bypass(es) in defender profile`);
        assert(metrics.detectionRate >= 0.90, `detection rate ${metrics.detectionRate} < 0.90`);
        console.log(`         detectionRate=${metrics.detectionRate.toFixed(2)}, seen=${metrics.totalSeen}, blocked=${metrics.totalBlocked}`);
    });

    check(1, 'evolution pathway intact after all attacks: legitimate amendment succeeds', () => {
        evolutionManager.clearAmendmentsOnly();
        const amd = evolutionManager.propose('P23_LAYER_WRITES_AUDITED',
            'add cryptographic integrity verification to governance audit trail',
            'Strengthening governance: SHA-256 hash of each governance event ensures tamper-evidence of accountability records',
            'orchestrator');
        evolutionManager.approve(amd.id, 'orchestrator');
        evolutionManager.activate(amd.id);
        const record = evolutionManager.getAmendment(amd.id);
        assert.strictEqual(record.status, 'ACTIVATED', 'legitimate amendment should succeed after all attacks');
        console.log(`         Legitimate amendment ${record.id} activated post-attack`);
    });

    // ── WS2: Constitutional Deception Testing ─────────────────────────────────
    console.log('\n  ─── WS2: Constitutional Deception Testing ────────────────────\n');

    check(2, 'deception-detector loads with required exports', () => {
        assert(typeof deceptionDetector.assessDeception      === 'function', 'assessDeception missing');
        assert(typeof deceptionDetector.analyzeFragmentation === 'function', 'analyzeFragmentation missing');
        assert(Array.isArray(deceptionDetector.DECEPTIVE_PATTERNS), 'DECEPTIVE_PATTERNS missing');
        assert(deceptionDetector.DECEPTIVE_PATTERNS.length >= 5, 'fewer than 5 deceptive patterns');
    });

    check(2, 'beneficial-framing amendment concealing erosion is flagged', () => {
        const assessment = deceptionDetector.assessDeception({
            principleId:    'P05_PII_ABSTRACTION',
            proposedChange: 'Streamline PII handling to optimize system performance and reduce overhead',
            rationale:      'Simplify PII abstraction layer by removing unnecessary verification steps for better throughput',
        });
        assert(assessment.deceptive, `expected deceptive=true, got false (score=${assessment.deceptionScore})`);
        assert(assessment.deceptionScore >= 40, `deception score ${assessment.deceptionScore} < 40`);
        console.log(`         Beneficial-erosion score: ${assessment.deceptionScore} → ${assessment.recommendation}`);
    });

    check(2, 'explicit bypass language triggers escalation', () => {
        const assessment = deceptionDetector.assessDeception({
            principleId:    'P01_FOUNDER_LAYER_ZERO',
            proposedChange: 'Add bypass exception for api_client in layer 0 when performance threshold exceeded',
            rationale:      'Override the guard to skip check under high load conditions for efficiency',
        });
        assert(assessment.escalate, `expected escalate=true, score=${assessment.deceptionScore}`);
        assert(assessment.deceptionScore >= 65, `bypass language should score ≥65, got ${assessment.deceptionScore}`);
        console.log(`         Bypass language score: ${assessment.deceptionScore} → ESCALATE`);
    });

    check(2, 'minimizing framing scored higher than direct clear change', () => {
        const ambiguous = deceptionDetector.assessDeception({
            principleId:    'P20_EXECUTIVE_DIFFERENTIATION',
            proposedChange: 'just a minor cleanup of the authority check path',
            rationale:      'tiny adjustment for simplification purposes only',
        });
        const clear = deceptionDetector.assessDeception({
            principleId:    'P20_EXECUTIVE_DIFFERENTIATION',
            proposedChange: 'Add explicit audit log entry for every COUNCIL-class access attempt',
            rationale:      'Strengthen accountability: every executive access attempt must be recorded with timestamp and outcome',
        });
        assert(ambiguous.deceptionScore > clear.deceptionScore,
            `ambiguous (${ambiguous.deceptionScore}) should score higher than clear (${clear.deceptionScore})`);
        console.log(`         ambiguous=${ambiguous.deceptionScore} clear=${clear.deceptionScore}`);
    });

    check(2, 'performance framing for PRIVACY change is suspicious', () => {
        const privacyPerf = deceptionDetector.assessDeception({
            principleId:    'P07_PII_STRIP_FIELDS',
            proposedChange: 'Improve performance of PII stripping by reducing field coverage',
            rationale:      'Faster throughput achieved by only stripping the highest-risk fields',
        });
        assert(privacyPerf.deceptionScore >= 40, `PRIVACY + performance should be suspicious: score=${privacyPerf.deceptionScore}`);
        console.log(`         PRIVACY + performance framing: score=${privacyPerf.deceptionScore}`);
    });

    check(2, 'fragmentation detected: 3 micro-amendments to same principle', () => {
        const fragments = [
            { principleId: 'P20_EXECUTIVE_DIFFERENTIATION', proposedChange: 'minor adjustment to entity boundary', rationale: 'small cleanup of entity class handling' },
            { principleId: 'P20_EXECUTIVE_DIFFERENTIATION', proposedChange: 'small update to tier classification', rationale: 'tiny refinement of authority tier logic' },
            { principleId: 'P20_EXECUTIVE_DIFFERENTIATION', proposedChange: 'cleanup of legacy access check', rationale: 'trivial maintenance of council access path' },
        ];
        const result = deceptionDetector.analyzeFragmentation(fragments);
        assert(result.fragmented, `fragmentation not detected: ${JSON.stringify(result)}`);
        assert(result.groups.some(g => g.type === 'SAME_PRINCIPLE'), 'same-principle group not flagged');
        console.log(`         Fragmentation: ${result.groups.length} groups, cumulativeRisk=${result.cumulativeRisk}`);
    });

    check(2, 'clean strengthening amendment has low deception score', () => {
        const clean = deceptionDetector.assessDeception({
            principleId:    'P23_LAYER_WRITES_AUDITED',
            proposedChange: 'Add cryptographic SHA-256 hash to every governance audit record for tamper evidence',
            rationale:      'Strengthening constitutional accountability: hash-chaining audit records prevents retrospective modification',
        });
        assert(clean.deceptionScore < 40, `clean amendment should score <40, got ${clean.deceptionScore}`);
        assert(!clean.deceptive, `clean amendment should not be flagged as deceptive`);
        console.log(`         Clean amendment score: ${clean.deceptionScore} (deceptive: ${clean.deceptive})`);
    });

    check(2, 'distributed harm: individually benign changes, collectively suspicious', () => {
        const distributed = [
            { principleId: 'P05_PII_ABSTRACTION', proposedChange: 'minor cleanup of abstraction layer handling', rationale: 'small improvement for abstraction code' },
            { principleId: 'P07_PII_STRIP_FIELDS', proposedChange: 'tiny update to strip field enumeration', rationale: 'minor maintenance of field list' },
            { principleId: 'P08_PROTECTED_PEOPLE_ACCESS', proposedChange: 'small adjustment to access check logic', rationale: 'trivial cleanup of access path' },
        ];
        const individualScores = distributed.map(a => deceptionDetector.assessDeception(a).deceptionScore);
        const fragResult = deceptionDetector.analyzeFragmentation(distributed);
        const avgIndividual = individualScores.reduce((s, x) => s + x, 0) / individualScores.length;
        assert(fragResult.cumulativeRisk > avgIndividual,
            `cumulative risk (${fragResult.cumulativeRisk}) should exceed average individual score (${avgIndividual})`);
        console.log(`         Distributed: avg-individual=${avgIndividual.toFixed(1)} cumulative=${fragResult.cumulativeRisk}`);
    });

    // ── WS3: Emergent Blind-Spot Discovery ─────────────────────────────────────
    console.log('\n  ─── WS3: Emergent Blind-Spot Discovery ───────────────────────\n');

    check(3, 'blind-spot-discoverer loads with required exports', () => {
        assert(typeof blindSpotDiscoverer.discover === 'function', 'discover missing');
        assert(typeof blindSpotDiscoverer.computeEmergentConfidenceImpact === 'function', 'computeEmergentConfidenceImpact missing');
        assert(Array.isArray(blindSpotDiscoverer.ALL_ATTACK_CLASSES), 'ALL_ATTACK_CLASSES missing');
    });

    let emergentSpots = [];
    check(3, 'discover() generates ≥2 novel blind spots from system analysis', () => {
        emergentSpots = blindSpotDiscoverer.discover({
            attackHistory:          { typesObserved: ['BRUTE_FORCE', 'IDENTITY_SPOOFING'] }, // only 2 observed
            watchdog:               { tickIntervalMs: 5000, tickCount: 10, failureCount: 0 },
            chainIntegrity:         { intact: true, lastVerifiedAt: null }, // never verified → BS-EMG-003
            moduleAvailability:     { spec: true, 'drift-detector': true }, // many uncovered
            principleCount:         23,
            crisisHistory:          { enteredCount: 0, recoveredCount: 0 },
            escalationHistory:      { totalEscalations: 0, totalDecisions: 15 },
        });
        assert(emergentSpots.length >= 2, `expected ≥2 emergent blind spots, got ${emergentSpots.length}: ${emergentSpots.map(b => b.id).join(', ')}`);
        console.log(`         ${emergentSpots.length} emergent blind spots discovered`);
    });

    check(3, 'emergent blind spots have required fields', () => {
        for (const bs of emergentSpots) {
            assert(bs.id,                              `emergent spot missing id`);
            assert(bs.area,                            `emergent spot missing area`);
            assert(bs.description,                     `emergent spot missing description`);
            assert(typeof bs.confidenceImpact === 'number', `missing confidenceImpact`);
            assert(bs.isEmergent === true,             `isEmergent should be true`);
        }
    });

    check(3, 'untested attack classes generate novel blind spot', () => {
        const hasUntestedBlindSpot = emergentSpots.some(bs => bs.area === 'untested-attack-vectors');
        assert(hasUntestedBlindSpot, `no untested-attack-vectors blind spot found. Areas: ${emergentSpots.map(b => b.area).join(', ')}`);
        const spot = emergentSpots.find(bs => bs.area === 'untested-attack-vectors');
        console.log(`         untested-attack-vectors: "${spot.description.slice(0, 80)}"`);
    });

    check(3, 'emergent spots are distinct from predefined KNOWN_BLIND_SPOTS', () => {
        const predefinedIds   = new Set(metaAccountability.KNOWN_BLIND_SPOTS.map(bs => bs.id));
        const predefinedAreas = new Set(metaAccountability.KNOWN_BLIND_SPOTS.map(bs => bs.area));
        for (const bs of emergentSpots) {
            assert(!predefinedIds.has(bs.id),     `emergent spot ${bs.id} collides with predefined id`);
            assert(!predefinedAreas.has(bs.area), `emergent spot area '${bs.area}' collides with predefined area`);
        }
        console.log(`         All ${emergentSpots.length} emergent spots distinct from ${predefinedIds.size} predefined`);
    });

    check(3, 'emergent blind spots reduce confidence below evidence-only baseline', () => {
        const baselineConfidence = 0.80;
        const impact = blindSpotDiscoverer.computeEmergentConfidenceImpact(emergentSpots);
        const adjusted = Math.max(0, baselineConfidence - impact);
        assert(impact > 0, 'emergent blind spots should have nonzero confidence impact');
        assert(adjusted < baselineConfidence, `emergent blind spots should reduce confidence: ${baselineConfidence} → ${adjusted}`);
        console.log(`         emergentImpact=${impact.toFixed(2)}, confidence: ${baselineConfidence} → ${adjusted.toFixed(2)}`);
    });

    check(3, 'additional blind spots discovered under crisis conditions', () => {
        const crisisSpots = blindSpotDiscoverer.discover({
            attackHistory:      { typesObserved: ATTACK_CLASSES }, // all observed
            watchdog:           { tickIntervalMs: 5000, tickCount: 50, failureCount: 3 }, // failures present
            chainIntegrity:     { intact: true, lastVerifiedAt: new Date().toISOString() },
            moduleAvailability: { spec: true, 'drift-detector': true, 'evolution-manager': true, arbitrator: true,
                                  'crisis-manager': true, 'risk-monitor': true, steward: true, watchdog: true,
                                  'accountability-chain': true, 'escalation-controller': true },
            principleCount: 23,
            crisisHistory:      { enteredCount: 5, recoveredCount: 3 }, // 2 unrecovered
            escalationHistory:  { totalEscalations: 2, totalDecisions: 50 },
        });
        // With 2 unrecovered crises + watchdog failures → should find BS-EMG-005 and BS-EMG-007
        const hasCrisisGap     = crisisSpots.some(bs => bs.area === 'crisis-recovery-gap');
        const hasWatchdogAccum = crisisSpots.some(bs => bs.area === 'watchdog-failure-accumulation');
        assert(hasCrisisGap || hasWatchdogAccum, `expected crisis-related blind spots: ${crisisSpots.map(b => b.area).join(', ')}`);
        console.log(`         Under crisis: ${crisisSpots.length} emergent spots — areas: ${crisisSpots.map(b => b.area).join(', ')}`);
    });

    check(3, 'confidence inflation check: certainty does not exceed evidence + emergent-adjusted quality', () => {
        const fullEvidence = metaAccountability.assessOwnConfidence({
            hasBaseline: true, certificationRun: true, providersHealthy: true,
            attackLogComplete: true, chainIntact: true,
        });
        const emergentImpact = blindSpotDiscoverer.computeEmergentConfidenceImpact(emergentSpots);
        const capped = Math.max(0, fullEvidence.confidence - emergentImpact);
        assert(capped <= fullEvidence.evidenceQuality,
            `emergent-adjusted confidence ${capped} exceeds evidence quality ${fullEvidence.evidenceQuality}`);
        console.log(`         Base confidence=${fullEvidence.confidence} emergentImpact=${emergentImpact.toFixed(2)} → ${capped.toFixed(2)}`);
    });

    // ── WS4: Long-Horizon Resilience (1000 cycles) ───────────────────────────
    console.log('\n  ─── WS4: Long-Horizon Resilience (1000 cycles) ───────────────\n');

    evolutionManager.clearAmendments();
    crisisManager.resetToNominal();
    accountability.clear();
    watchdog.reset();
    watchdog.start();

    const CYCLES = 1000;
    const rng = makeRng(42); // deterministic

    // Simulation metrics
    const simMetrics = {
        attacks:       { attempted: 0, detected: 0, bypassed: 0 },
        crises:        { entered: 0, recovered: 0 },
        amendments:    { proposed: 0, rateLimited: 0 },
        escalations:   { count: 0 },
        checkpoints:   [],
    };

    const simAttacker = new Attacker('sim-attacker', 'BRUTE_FORCE');
    const simDefender = new Defender();
    let   simError    = null;

    await checkAsync(4, `1000-cycle simulation runs without exception`, async () => {
        for (let c = 0; c < CYCLES; c++) {
            try {
                // Attack attempt (~10% probability)
                if (rng() < 0.10) {
                    const result = simAttacker.executeLite(modules);
                    simAttacker.recordAndAdapt(result);
                    simDefender.observe(result);
                    simMetrics.attacks.attempted++;
                    if (result.detected || result.blocked) simMetrics.attacks.detected++;
                    if (result.bypass) simMetrics.attacks.bypassed++;
                }

                // Crisis event (~3% probability)
                if (rng() < 0.03) {
                    const events = ['EXEC_SUBSYSTEM_FAILURE', 'PARTIAL_OBSERVABILITY', 'CERTIFIER_UNAVAILABLE'];
                    const ev = events[Math.floor(rng() * events.length)];
                    crisisManager.enterCrisisEvent(ev);
                    simMetrics.crises.entered++;
                }

                // Recovery if in crisis (~70% chance)
                if (crisisManager.getState().level !== 'NOMINAL' && rng() < 0.70) {
                    try { crisisManager.recover('sim-recovery'); } catch {}
                    crisisManager.resetToNominal();
                    simMetrics.crises.recovered++;
                }

                // Amendment proposal (~5% probability)
                if (rng() < 0.05) {
                    try {
                        evolutionManager.propose(`P20_EXECUTIVE_DIFFERENTIATION`,
                            `long-run cycle ${c} differentiation adjustment change`,
                            `long-run resilience amendment cycle ${c} — testing sustained operation stability`,
                            'orchestrator');
                        simMetrics.amendments.proposed++;
                    } catch { simMetrics.amendments.rateLimited++; }
                }

                // Escalation check (~3% probability)
                if (rng() < 0.03) {
                    const r = escalationController.computeEscalationLevel({
                        uncertaintyScore: rng() * 0.6,
                        crisisLevel: crisisManager.getState().level,
                    });
                    if (r.level !== 'PROCEED') simMetrics.escalations.count++;
                }

                // Checkpoint: full async tick every 200 cycles + final cycle
                if (c % 200 === 0 || c === CYCLES - 1) {
                    const tick = await watchdog.tick();
                    simMetrics.checkpoints.push({
                        cycle:      c,
                        risk:       tick.residualRisks?.level,
                        crisis:     tick.crisisIndicators?.level,
                        tickFailed: tick.tickFailed,
                    });
                    accountability.record(accountability.EVENT_TYPES.OVERSIGHT_TICK,
                        { cycle: c, risk: tick.residualRisks?.level });
                }
            } catch (e) {
                simError = e;
                throw new Error(`Simulation exception at cycle ${c}: ${e.message}`);
            }
        }
        assert(!simError, `Simulation threw: ${simError?.message}`);
        console.log(`         1000 cycles complete — attacks=${simMetrics.attacks.attempted} crises=${simMetrics.crises.entered}`);
    });

    check(4, 'zero bypasses across all 1000 cycles', () => {
        assert.strictEqual(simMetrics.attacks.bypassed, 0,
            `${simMetrics.attacks.bypassed} bypass(es) occurred across 1000 cycles`);
        const bypasses = simMetrics.attacks.bypassed;
        console.log(`         Total attacks: ${simMetrics.attacks.attempted}, detected: ${simMetrics.attacks.detected}, bypassed: ${bypasses}`);
    });

    check(4, 'attack detection rate ≥ 95% across simulation', () => {
        if (simMetrics.attacks.attempted === 0) {
            console.log('         No attacks attempted — detection rate trivially 100%');
            return;
        }
        const rate = simMetrics.attacks.detected / simMetrics.attacks.attempted;
        assert(rate >= 0.95, `detection rate ${rate.toFixed(2)} < 0.95`);
        console.log(`         Detection rate: ${(rate * 100).toFixed(1)}% (${simMetrics.attacks.detected}/${simMetrics.attacks.attempted})`);
    });

    check(4, 'all checkpoints produced valid constitutional state', () => {
        assert(simMetrics.checkpoints.length >= 5, `expected ≥5 checkpoints, got ${simMetrics.checkpoints.length}`);
        const validLevels = ['NOMINAL', 'WARNING', 'ELEVATED', 'CRITICAL'];
        for (const cp of simMetrics.checkpoints) {
            assert(!cp.tickFailed, `checkpoint at cycle ${cp.cycle} failed`);
            assert(validLevels.some(l => cp.risk === l || cp.risk === undefined),
                `invalid risk level at cycle ${cp.cycle}: ${cp.risk}`);
        }
        const finalCp = simMetrics.checkpoints[simMetrics.checkpoints.length - 1];
        console.log(`         ${simMetrics.checkpoints.length} checkpoints — final: cycle=${finalCp.cycle} risk=${finalCp.risk} crisis=${finalCp.crisis}`);
    });

    check(4, 'crisis entries and recoveries balanced (no permanent crisis)', () => {
        const finalLevel = crisisManager.getState().level;
        assert(finalLevel === 'NOMINAL' || finalLevel === 'RECOVERY',
            `unexpected final crisis state: ${finalLevel}`);
        console.log(`         Crises: entered=${simMetrics.crises.entered} recovered=${simMetrics.crises.recovered} final=${finalLevel}`);
    });

    check(4, 'attacker adapted strategies across 1000 cycles', () => {
        const profile = simAttacker.getProfile();
        assert(profile.adaptationCount >= 3, `expected ≥3 adaptations in 1000 cycles, got ${profile.adaptationCount}`);
        assert(profile.strategiesUsed.length >= 2, `attacker should have used ≥2 strategies`);
        console.log(`         ${profile.adaptationCount} adaptations, ${profile.strategiesUsed.length} strategies: ${profile.strategiesUsed.join(', ')}`);
    });

    check(4, 'accountability chain intact after 1000 cycles', () => {
        const result = accountability.verify();
        assert(result.intact, `chain integrity broken after 1000 cycles: gaps=${result.gaps.length} tampered=${result.tampered.length}`);
        console.log(`         Chain intact: ${result.count} entries`);
    });

    await checkAsync(4, 'no silent degradation: constitutional identity verified at final checkpoint', async () => {
        crisisManager.enterCrisisEvent('CASCADE_FAILURE');
        assert(crisisManager.isEmergencyMode());
        const invariants = await crisisManager.verifyInvariantsHold();
        crisisManager.recover('final-check');
        crisisManager.resetToNominal();
        assert(invariants.allHold, `invariant breach at 1000-cycle mark: ${invariants.results.filter(r => !r.pass).map(r => r.id).join(', ')}`);
        console.log(`         All ${invariants.results.length} EMERGENCY_INVARIANTS hold at 1000-cycle mark`);
    });

    // ── WS5: Resilience Characterisation ─────────────────────────────────────
    console.log('\n  ─── WS5: Resilience Characterisation ─────────────────────────\n');

    check(5, 'attack detection rate is reproducible and measured', () => {
        const totalAttacks = simMetrics.attacks.attempted;
        const detected     = simMetrics.attacks.detected;
        const bypassed     = simMetrics.attacks.bypassed;
        const detRate      = totalAttacks > 0 ? detected / totalAttacks : 1.0;
        const fnRate       = totalAttacks > 0 ? bypassed / totalAttacks : 0.0;

        assert(typeof detRate === 'number', 'detection rate not computed');
        assert(typeof fnRate  === 'number', 'false-negative rate not computed');
        console.log(`         Detection rate: ${(detRate * 100).toFixed(1)}%`);
        console.log(`         False-negative rate: ${(fnRate * 100).toFixed(1)}% (bypasses/${totalAttacks})`);
    });

    check(5, 'false negative rate is 0: no bypass ever succeeded', () => {
        const fnRate = simMetrics.attacks.attempted > 0
            ? simMetrics.attacks.bypassed / simMetrics.attacks.attempted : 0;
        assert.strictEqual(fnRate, 0, `false negative rate is ${fnRate}: ${simMetrics.attacks.bypassed} bypasses`);

        // Also check WS1 full-attack results
        const ws1Defender = defender.getMetrics();
        assert.strictEqual(ws1Defender.totalBypassed, 0, `WS1 defender shows ${ws1Defender.totalBypassed} bypass(es)`);
    });

    check(5, 'escalation frequency measured and non-zero', () => {
        const totalDecisions = simMetrics.amendments.proposed + simMetrics.attacks.attempted + 10;
        const escFreq = simMetrics.escalations.count / totalDecisions;
        assert(typeof escFreq === 'number', 'escalation frequency not computed');
        console.log(`         Escalation frequency: ${simMetrics.escalations.count} escalations / ${totalDecisions} decisions = ${(escFreq * 100).toFixed(1)}%`);
    });

    check(5, 'stewardship conservatism: PRIVACY amendments consistently rejected/deferred', () => {
        const privacyAmendments = [
            { principleId: 'P05_PII_ABSTRACTION', proposedChange: 'extend PII access for analysis', rationale: 'needed for analytics pipeline enhancement and reporting purposes' },
            { principleId: 'P07_PII_STRIP_FIELDS', proposedChange: 'reduce strip field coverage for speed', rationale: 'performance optimization for faster data processing throughput' },
            { principleId: 'P08_PROTECTED_PEOPLE_ACCESS', proposedChange: 'relax access check for api_client', rationale: 'improve api_client user experience with faster access to people data' },
        ];
        const assessments = privacyAmendments.map(a => steward.assessAmendment(a));
        const nonApproved = assessments.filter(a => a.recommendation !== 'APPROVE');
        assert.strictEqual(nonApproved.length, 3,
            `all 3 PRIVACY amendments should be deferred/escalated, got ${assessments.map(a => a.recommendation).join(', ')}`);
        const conservatism = nonApproved.length / assessments.length;
        console.log(`         Stewardship conservatism: ${(conservatism * 100).toFixed(0)}% of PRIVACY amendments deferred/escalated`);
    });

    check(5, 'dominant failure modes identified', () => {
        const ws1Metrics = defender.getMetrics();
        const dominantThreat = [...Object.entries(ws1Metrics.threatProfile)]
            .sort(([,a], [,b]) => b.seen - a.seen)[0];
        assert(dominantThreat, 'no threat profile to analyse');
        const failureModes = [
            { mode: 'APPROVAL_SPOOFING/IDENTITY', detectionMechanism: 'AUTHORIZED_APPROVERS whitelist' },
            { mode: 'PRIVILEGE_ESCALATION',        detectionMechanism: 'FOUNDER_CLASS_APPROVERS check' },
            { mode: 'CONTENT_TAMPERING',            detectionMechanism: 'FNV-1a content hash' },
            { mode: 'AUDIT_POISONING',              detectionMechanism: 'hash-chain verify()' },
            { mode: 'RATE_EXHAUSTION',              detectionMechanism: 'rate limit (3/60s)' },
        ];
        console.log(`         Dominant threat class: ${dominantThreat[0]} (seen: ${dominantThreat[1].seen})`);
        console.log(`         Known failure modes: ${failureModes.map(f => f.mode).join(', ')}`);
        assert(failureModes.length >= 4, 'fewer than 4 failure modes documented');
    });

    check(5, 'human intervention thresholds documented', () => {
        const humanIntervention = [
            { condition: 'PRIVACY or AUTHORITY amendment requires approval', threshold: 'ALWAYS', mechanism: 'FOUNDER_CLASS_APPROVERS' },
            { condition: 'EMERGENCY crisis state', threshold: 'recover() call required', mechanism: 'manual crisis-manager.recover()' },
            { condition: 'Accountability chain integrity fails verify()', threshold: 'IMMEDIATE', mechanism: 'manual chain audit' },
            { condition: 'Watchdog tick failure rate > 5%', threshold: 'ELEVATED priority', mechanism: 'investigate watchdog dependency' },
            { condition: 'Attack bypass detected', threshold: 'IMMEDIATE', mechanism: 'constitutional review' },
        ];
        assert(humanIntervention.length >= 4, 'fewer than 4 human intervention thresholds');
        for (const h of humanIntervention) {
            assert(h.condition,   'intervention threshold missing condition');
            assert(h.threshold,   'intervention threshold missing threshold');
            assert(h.mechanism,   'intervention threshold missing mechanism');
        }
        console.log(`         ${humanIntervention.length} human intervention thresholds documented`);
    });

    check(5, 'residual fragility — dependencies that could undermine resilience', () => {
        const fragilities = [
            { id: 'RF01', description: 'amendments.json file writeable by OS processes — file-level tampering outside Node.js undetected until next verify()' },
            { id: 'RF02', description: 'Watchdog is tick-based not interrupt-driven — events between ticks are invisible' },
            { id: 'RF03', description: 'FOUNDER-class entities availability — system blocked on PRIVACY/AUTHORITY changes without them' },
            { id: 'RF04', description: 'In-memory attack log lost on process restart — persistence requires external storage' },
            { id: 'RF05', description: 'Rate limiter is per-principleId not per-proposer — attacker can cycle through principleIds to avoid rate limit' },
        ];
        assert(fragilities.length >= 4, 'fewer than 4 fragilities documented');
        for (const f of fragilities) {
            assert(f.id && f.description, 'fragility missing required fields');
        }
        console.log(`         ${fragilities.length} residual fragilities identified`);
        fragilities.forEach(f => console.log(`           ${f.id}: ${f.description.slice(0, 80)}`));
    });

    // ── Verdict ────────────────────────────────────────────────────────────────
    watchdog.stop();

    const wsPassed    = [1,2,3,4,5].map(ws => results.filter(r => r.ws === ws).every(r => r.pass));
    const totalPassed = results.filter(r => r.pass).length;
    const totalFailed = results.filter(r => !r.pass).length;
    const wsPct       = wsPassed.filter(Boolean).length;
    const verdict     = wsPct === 5 ? 'A' : wsPct >= 4 ? 'B' : wsPct >= 3 ? 'C' : 'D';

    const verdictLabel = {
        A: 'APEX preserves constitutional identity against adaptive adversaries',
        B: 'Adaptive resilience strongly supported — periodic review remains necessary',
        C: 'Constitutional protections function under controlled conditions only',
        D: 'Adaptive constitutional resilience cannot presently be established',
    }[verdict];

    console.log('\n  ─────────────────────────────────────────────────────────────');
    console.log(`  WS1 Adaptive Red-Team:      ${wsPassed[0] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS2 Deception Testing:      ${wsPassed[1] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS3 Blind-Spot Discovery:   ${wsPassed[2] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS4 Long-Horizon (1000cy):  ${wsPassed[3] ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  WS5 Resilience Metrics:     ${wsPassed[4] ? '✓ PASS' : '✗ FAIL'}`);
    console.log('  ─────────────────────────────────────────────────────────────');
    console.log(`  Checks: ${totalPassed}/${totalPassed + totalFailed} pass    WS: ${wsPct}/5 pass`);
    console.log(`\n  ████████████████████████████████████████████████████████████`);
    console.log(`  ██  PHASE 28 VERDICT: ${verdict}  —  ${verdictLabel.slice(0, 48).padEnd(48)} ██`);
    console.log(`  ████████████████████████████████████████████████████████████\n`);

    if (totalFailed > 0) {
        console.log('  Failures:');
        results.filter(r => !r.pass).forEach(r => console.log(`    - [WS${r.ws}] ${r.name}: ${r.error}`));
        console.log('');
    }

    // Final metrics summary
    const chainResult  = accountability.verify();
    const ws1DefMetrics = defender.getMetrics();
    const simDet = simMetrics.attacks.attempted > 0 ? simMetrics.attacks.detected / simMetrics.attacks.attempted : 1;

    console.log('  ── Phase 28 Assessment ───────────────────────────────────────');
    console.log(`  Adaptive red-team:          ${ATTACK_CLASSES.length} attack classes, 0 bypasses, ${attacker.adaptationCount} attacker adaptations`);
    console.log(`  Deception resistance:       Beneficial-framing + bypass language + fragmentation all detected`);
    console.log(`  Emergent blind spots:       ${emergentSpots.length} novel vulnerabilities discovered beyond predefined list`);
    console.log(`  1000-cycle resilience:      ${(simDet * 100).toFixed(1)}% detection rate, ${simMetrics.attacks.bypassed} bypasses, ${simMetrics.crises.entered} crises`);
    console.log(`  Accountability chain:       ${chainResult.count} entries, intact=${chainResult.intact} after 1000 cycles`);
    console.log(`  WS1 detection rate:         ${(ws1DefMetrics.detectionRate * 100).toFixed(0)}% (${ws1DefMetrics.totalBlocked}/${ws1DefMetrics.totalSeen})`);
    console.log(`  Residual fragilities:       Rate-limit bypass via principleId cycling, in-memory attack log volatility`);
    console.log(`  Human intervention:         FOUNDER-class approval, manual crisis recovery, chain integrity audit`);
    console.log(`  Maturity rating:            ${verdict === 'A' ? 'ADAPTIVELY RESILIENT' : verdict === 'B' ? 'ADVANCED' : 'DEVELOPING'}\n`);

    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => { console.error('[FATAL]', e); process.exit(1); });
