'use strict';
// Phase 19: Adversarial Bypass Hunt
// Systematically identifies memory write paths that bypass importance scoring,
// silent failure modes, untracked mutations, and uncertified write paths.
// Each bypass is rated: location, impact, likelihood, severity, fix.

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BYPASSES = [];

function bypass(id, location, description, impact, likelihood, severity, fix) {
    BYPASSES.push({ id, location, description, impact, likelihood, severity, fix });
}

function readFile(filePath) {
    try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 19 — ADVERSARIAL BYPASS HUNT                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const root = path.join(__dirname);
    const serverSrc = readFile(path.join(root, 'server.js'));
    const gatewaySrc = readFile(path.join(root, 'lib/memory/gateway.js'));
    const execEntitySrc = readFile(path.join(root, 'lib/executive/entity.js'));
    const domainMemSrc = readFile(path.join(root, 'lib/executive/domain-memory.js'));
    const reflexionSrc = readFile(path.join(root, 'lib/memory/reflexion-tracker.js'));
    const founderMemSrc = readFile(path.join(root, 'lib/memory/founder-memory.js'));
    const importanceSrc = readFile(path.join(root, 'lib/memory/importance-engine.js'));

    // ── B1: domain-memory.js stores to layer 9 WITHOUT importance gate ────────
    console.log('Checking B1: executive domain-memory writes bypass importance gate...');
    const domainWritesDirectly = domainMemSrc.includes('gateway.storeMemory') && !domainMemSrc.includes('importance-engine');
    if (domainWritesDirectly) {
        bypass('B1', 'lib/executive/domain-memory.js:recordDomainLessons()',
            'Executive lessons written directly via gateway.storeMemory() without importance scoring. All votes (even confidence=0.1) are stored.',
            'Low — executive content is inherently important. Risk: low-confidence votes stored unnecessarily.',
            'Medium', 'Low',
            'Add minimum confidence threshold (e.g., >0.5) before gateway.storeMemory() call in recordDomainLessons().');
    } else {
        console.log('  B1: Not confirmed.');
    }

    // ── B2: founder-memory.update() has no write guard ────────────────────────
    console.log('Checking B2: founder-memory.update() accepts any caller without elevation check...');
    const founderNoCheck = founderMemSrc.includes('async function update') && !founderMemSrc.includes('FOUNDER_WRITE') && !founderMemSrc.includes('ctrl.check');
    if (founderNoCheck) {
        bypass('B2', 'lib/memory/founder-memory.js:update()',
            'Any module can call founderMem.update() directly to write Layer 0 founder data. No access control check at write site.',
            'HIGH — Layer 0 is the highest-authority memory. Unchecked writes could corrupt identity, values, or goals.',
            'Low (requires deliberate misuse)', 'HIGH',
            'Add caller authorization check (e.g., require source=trait-evolution|system|governance) or an explicit allowlist. gateway.storeMemory() enforces this — direct calls bypass it.');
    }

    // ── B3: reflexion-tracker limits on status filter ─────────────────────────
    console.log('Checking B3: recordRetrieval and recordInfluence status filter gap...');
    const rrStatus = reflexionSrc.includes(`'pending','validated'`) && !reflexionSrc.includes(`'applied'`);
    if (rrStatus) {
        bypass('B3', 'lib/memory/reflexion-tracker.js:recordRetrieval() + recordInfluence()',
            'Both functions filter by status IN (pending,validated). Once a lesson is "applied", further retrievals or influences cannot be recorded.',
            'Low — applied lessons still appear in _enrichWithInfluence (includes applied status). But retrieval_count stops incrementing.',
            'High (occurs every time an applied lesson is re-retrieved)', 'Low',
            'Add "applied" to the status filter in recordRetrieval(). Influence count saturation at inf/ret=1.0 means it wont cause over-weighting.');
    }

    // ── B4: lesson cache TTL hides fresh influence updates ─────────────────────
    console.log('Checking B4: 5-minute lesson cache prevents immediate influence ranking...');
    if (gatewaySrc.includes('300_000')) {
        bypass('B4', 'lib/memory/gateway.js:retrieveLessons()',
            'Lessons cached for 5 minutes. A lesson that gets influenced mid-session will not show updated ranking until cache expires.',
            'Medium — user sees stale rankings within same session. Influence is correct in DB but not reflected immediately.',
            'High (any session where influence occurs)', 'Medium',
            'Invalidate lessons cache on recordInfluence(), or use a shorter TTL (60s). Phase 15 validation bypasses this via cache.invalidatePattern().');
    }

    // ── B5: addToMemory() writes directly to old Postgres table without gateway
    console.log('Checking B5: addToMemory() bypasses gateway and importance engine...');
    const addToMemoryBypass = serverSrc.includes('addToMemory(') && !serverSrc.includes('importance') && serverSrc.indexOf('addToMemory(') < serverSrc.indexOf('importance-engine');
    if (serverSrc.match(/addToMemory\s*\(/) && !serverSrc.includes('addToMemory.*importance')) {
        bypass('B5', 'server.js:addToMemory() (legacy)',
            'addToMemory() writes to old legacy memory table (not apex_lessons) bypassing gateway, importance engine, and reflexion tracking.',
            'Low — legacy table is not used for intelligent retrieval. Parallel write, no functional impact on certified pipeline.',
            'High (called on every voice-chat message)', 'Low',
            'Remove or deprecate addToMemory(). All substantive memory flows through gateway. Legacy table reads are no longer used for decisions.');
    }

    // ── B6: extractAndSaveFacts() writes to Postgres without importance gate ───
    console.log('Checking B6: extractAndSaveFacts() bypasses importance engine...');
    if (serverSrc.includes('extractAndSaveFacts(') && !serverSrc.match(/extractAndSaveFacts[\s\S]{0,200}importance/)) {
        bypass('B6', 'server.js:extractAndSaveFacts()',
            'extractAndSaveFacts() extracts and stores facts from conversations directly to Postgres without importance scoring.',
            'Low — output feeds pgLoadFacts() used in alexContext (not gateway decision pipeline). No impact on certified retrieval.',
            'High (runs on every voice exchange)', 'Low',
            'Consider routing through importance engine, but this is legacy context — not part of the certified memory architecture.');
    }

    // ── B7: calendar_sync already goes through importance gate ────────────────
    console.log('Checking B7: calendar sync importance gate...');
    const commRoutes = readFile(path.join(root, 'routes/communications.js'));
    if (commRoutes.includes('importance') || commRoutes.includes('_imp')) {
        console.log('  B7: Calendar sync DOES use importance gate. Not a bypass.');
    } else {
        bypass('B7', 'routes/communications.js:calendar sync',
            'Calendar sync may bypass importance gate.', 'Medium', 'Medium', 'High',
            'Verify importance engine is wired to calendar sync.');
    }

    // ── B8: voice-chat trait observation fires at confidence=0.4 unconditionally
    console.log('Checking B8: founder trait evidence always fires at fixed confidence...');
    if (serverSrc.includes('confidence: 0.4') && serverSrc.includes('communication_pattern')) {
        bypass('B8', 'server.js:voice-chat trait observation',
            'Every non-IGNORE voice message records founder trait evidence at fixed confidence=0.4 regardless of content quality. "I like coffee" and "strategic product decision" both recorded at 0.4.',
            'Low — confidence 0.4 is below promotion threshold (0.65). Dilutes evidence pool but cannot trigger premature promotion.',
            'High (fires on every substantive voice message)', 'Low',
            'Acceptable as-is. Promotion threshold (0.65) prevents low-confidence noise from influencing traits. No fix required.');
    }

    // ── B9: influence recording gap — old lessons below retrieval limit ────────
    console.log('Checking B9: pagination gap for old lessons...');
    if (gatewaySrc.includes('.limit(limit)') || gatewaySrc.includes('.limit(8)') || gatewaySrc.includes('limit = 8')) {
        bypass('B9', 'lib/memory/gateway.js:retrieveLessons() pagination',
            'retrieveLessons fetches most recent N lessons (default 8). Lessons older than N most-recent are excluded regardless of influence score. Old high-value lessons cannot rise via influence if they fall outside the window.',
            'Medium — a lesson from >N recent records will not be retrieved even at influence_weight=1.0. Influence only operates within the retrieval window.',
            'Increases over time as lesson count grows', 'Medium',
            'Use a weighted query: ORDER BY (recency_weight * (1 + influence_boost)) DESC with influence_boost computed in SQL. Or increase default limit to 20-50 with influence filtering.');
    }

    // ── B10: executive entity.js calls model without recording lesson influence
    console.log('Checking B10: executive decide() does not record lesson influence...');
    const entityLogsDecision = execEntitySrc.includes('_logDecision') || execEntitySrc.includes('decision_memory');
    const entityCallsInfluence = execEntitySrc.includes('recordInfluence') || execEntitySrc.includes('reflexion');
    if (entityLogsDecision && !entityCallsInfluence) {
        bypass('B10', 'lib/executive/entity.js:decide()',
            'Executive decide() retrieves domain context (which may include lessons) but never calls recordInfluence() when lessons are used. Executive decisions never register as lesson influence events.',
            'Medium — executive decisions are the highest-value events. Their use of lessons should strengthen lesson rankings most.',
            'High (every executive decision)', 'Medium',
            'After decide() generates a decision, call recordInfluence() for each domain_context item used. Link to the decision ID.');
    }

    // ── B11: adaptation cycle pattern storage bypasses importance ─────────────
    console.log('Checking B11: adaptation cycle pattern writes bypass importance gate...');
    const adaptSrc = readFile(path.join(root, 'lib/memory/adaptation-cycle.js'));
    const adaptDirectGateway = adaptSrc.includes('gateway.storeMemory') && !adaptSrc.includes('importance');
    if (adaptDirectGateway) {
        bypass('B11', 'lib/memory/adaptation-cycle.js (Phase 3 pattern writes)',
            'Patterns discovered by adaptation cycle are written directly to gateway without importance scoring. All patterns stored regardless of quality.',
            'Low — patterns from adaptation cycle are by definition high-signal (generated from episode analysis). Unlikely to store noise.',
            'Low', 'Low',
            'Acceptable as-is. Adaptation cycle patterns pass through multiple quality filters (episode success rates, AI synthesis) before storage.');
    }

    // ── B12: governance synthesizer writes without importance gate ────────────
    console.log('Checking B12: governance synthesizer writes without importance gate...');
    const govSrc = readFile(path.join(root, 'lib/memory/governance-synthesizer.js'));
    const govDirectWrite = govSrc.includes('gateway.storeMemory') && !govSrc.includes('importance');
    if (govDirectWrite) {
        bypass('B12', 'lib/memory/governance-synthesizer.js:synthesizeRecentFindings()',
            'Governance findings stored directly to gateway layer 10 without importance scoring.',
            'Low — governance writes are rate-gated (6h), structured, and system-generated. Low noise risk.',
            'Low', 'Low',
            'Rate gate (6h) and source filter (significant block types only) provide adequate quality control. Importance gate would add negligible value here.');
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('BYPASS INVENTORY:');
    console.log('');

    const HIGH   = BYPASSES.filter(b => b.severity === 'HIGH');
    const MEDIUM = BYPASSES.filter(b => b.severity === 'Medium');
    const LOW    = BYPASSES.filter(b => b.severity === 'Low');

    console.log(`  HIGH severity:   ${HIGH.length}`);
    console.log(`  Medium severity: ${MEDIUM.length}`);
    console.log(`  Low severity:    ${LOW.length}`);
    console.log('');

    for (const b of BYPASSES) {
        const sev = b.severity === 'HIGH' ? '🔴' : b.severity === 'Medium' ? '🟡' : '🟢';
        console.log(`  ${sev} ${b.id}: [${b.severity}] ${b.location}`);
        console.log(`     What: ${b.description.slice(0, 90)}`);
        console.log(`     Impact: ${b.impact.slice(0, 80)}`);
        console.log(`     Fix: ${b.fix.slice(0, 90)}`);
        console.log('');
    }

    if (HIGH.length > 0) {
        console.log('HIGH SEVERITY BYPASSES REQUIRE IMMEDIATE ATTENTION:');
        HIGH.forEach(b => console.log(`  → ${b.id}: ${b.description.slice(0, 100)}`));
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 19 COMPLETE                                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    process.exit(HIGH.length > 0 ? 1 : 0);
}

run().catch(e => { console.error('PHASE 19 FAILED:', e.message); process.exit(1); });
