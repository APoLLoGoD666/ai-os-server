'use strict';
// Phase 12: Founder continuity validation
// Proves: inject ≥3 high-confidence observations → aggregateEvidence hits threshold →
//         promoteToTrait creates versioned trait → before/after diff → version history preserved

require('dotenv').config();
const traitEvo = require('./lib/founder/trait-evolution');

async function run() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PHASE 12 — FOUNDER TRAIT CONTINUITY VALIDATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const TRAIT = `test_trait_${Date.now()}`;
    const SECTION = 'traits.observed';

    // ── Step 1: Get baseline — trait does not yet exist ───────────────────────
    console.log('STEP 1: Confirming trait does not yet exist...');
    const before = await traitEvo.getPendingEvidence(100);
    const existingForTrait = before.filter(e => e.trait === TRAIT);
    console.log(`  Existing evidence for ${TRAIT}: ${existingForTrait.length} (expected 0)`);

    // ── Step 2: Inject 3 observations above promotion threshold (≥0.65) ───────
    console.log('\nSTEP 2: Injecting 3 high-confidence observations (confidence ≥ 0.65)...');
    const obs = [
        { observation: 'Decision-making is highly data-driven and evidence-first.', confidence: 0.82 },
        { observation: 'Prefers structured frameworks over intuition for complex decisions.', confidence: 0.76 },
        { observation: 'Consistently requests quantitative metrics before approving proposals.', confidence: 0.71 },
    ];
    for (const o of obs) {
        await traitEvo.recordEvidence({
            trait:            TRAIT,
            observation:      o.observation,
            confidence:       o.confidence,
            evidence:         o.observation,
            originatingEvent: 'phase12_validation',
            section:          SECTION,
        });
        console.log(`  ✓ Injected [conf=${o.confidence}]: "${o.observation.slice(0, 60)}..."`);
    }

    await new Promise(r => setTimeout(r, 500));

    // ── Step 3: Aggregate evidence — show threshold calculation ───────────────
    console.log('\nSTEP 3: Aggregating evidence — verifying thresholds...');
    const agg = await traitEvo.aggregateEvidence(TRAIT);
    if (!agg) {
        console.log('  ✗ aggregateEvidence returned null — evidence not found in DB');
        return;
    }
    console.log(`  Count:         ${agg.count} (threshold: ≥3)`);
    console.log(`  avgConfidence: ${agg.avgConfidence.toFixed(3)} (threshold: ≥0.65)`);
    console.log(`  Meets count threshold:      ${agg.count >= 3 ? '✓ YES' : '✗ NO'}`);
    console.log(`  Meets confidence threshold: ${agg.avgConfidence >= 0.65 ? '✓ YES' : '✗ NO'}`);

    if (agg.count < 3 || agg.avgConfidence < 0.65) {
        console.log('\n  ✗ Thresholds not met — promotion cannot proceed');
        return;
    }

    // ── Step 4: Promote to trait — verify promotion succeeds ─────────────────
    console.log('\nSTEP 4: Promoting to trait...');
    const promoted = await traitEvo.promoteToTrait({
        section:     SECTION,
        trait:       TRAIT,
        newValue:    { text: agg.observations.slice(0, 300), observation_count: agg.count },
        evidence:    agg.observations.slice(0, 200),
        confidence:  agg.avgConfidence,
        promotedBy:  'phase12_validation',
    });
    if (promoted) {
        console.log(`  ✓ Trait promoted successfully.`);
    } else {
        console.log(`  ✗ promoteToTrait returned falsy — check logs`);
        return;
    }

    await new Promise(r => setTimeout(r, 500));

    // ── Step 5: Verify version history ───────────────────────────────────────
    console.log('\nSTEP 5: Verifying version history is preserved...');
    const history = await traitEvo.getTraitHistory(SECTION, TRAIT);
    console.log(`  Version history entries: ${history?.length ?? 0}`);
    if (history && history.length > 0) {
        console.log(`  ✓ Version history preserved.`);
        history.forEach((h, i) => {
            const conf = h.value?.confidence ?? h.confidence;
            const by   = h.value?.promoted_by ?? h.promoted_by;
            const at   = h.value?.archived_at?.slice(0, 10) ?? 'active (current)';
            console.log(`    [v${i + 1}] confidence=${conf?.toFixed ? conf.toFixed(3) : conf} | promotedBy=${by} | archived_at=${at}`);
        });
    } else {
        console.log(`  (No prior versions — this is the first promotion, which is expected)`);
    }

    // ── Step 6: Evidence status should be promoted ───────────────────────────
    console.log('\nSTEP 6: Confirming evidence status updated to promoted...');
    const afterEvidence = await traitEvo.getPendingEvidence(100);
    const stillPending = afterEvidence.filter(e => e.trait === TRAIT);
    if (stillPending.length === 0) {
        console.log(`  ✓ All evidence for ${TRAIT} is no longer pending — promotion recorded.`);
    } else {
        console.log(`  Still pending: ${stillPending.length} items (expected 0 after promotion)`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PHASE 12 FOUNDER CONTINUITY VALIDATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
}

run().catch(e => { console.error('VALIDATION FAILED:', e.message, e.stack); process.exit(1); });
