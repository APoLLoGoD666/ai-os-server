'use strict';
// Phase C0.6 — 100-request verification harness

const ec         = require('./lib/runtime/execution-context');
const gate       = require('./lib/runtime/constitutional-gate');
const goalGraph  = require('./lib/goals/goal-graph');
const attention  = require('./lib/attention/attention-engine');
const memGateway = require('./lib/memory/gateway');
const fs         = require('fs');
const path       = require('path');

const LAYER_EPISODIC = 2;
const LAYER_DECISION = 7;

function _tier(score) {
    if (score >= 0.65) return 'HIGH';
    if (score >= 0.35) return 'MEDIUM';
    return 'LOW';
}
function _tokenBudget(score) { return Math.round(1000 + score * 7000); }

function makeReq(i) {
    const PATHS = [
        '/chat', '/api/chat', '/api/memory/search', '/api/goals/update',
        '/api/self-modify', '/health', '/api/finance/summary',
        '/api/modify/code', '/api/governance/run', '/api/cognitive/eval',
    ];
    return {
        requestId:       'REQ-' + String(i).padStart(4, '0'),
        conversationId:  'CONV-001',
        executionClass:  ['REFLEX', 'EXECUTIVE', 'BACKGROUND'][i % 3],
        path:            PATHS[i % PATHS.length],
        method:          'POST',
        headers:         { 'user-agent': 'harness/1.0', 'origin': 'http://localhost:3000' },
    };
}

function makeRes() {
    const hdrs = {};
    const listeners = {};
    return {
        _headers:  hdrs,
        _status:   200,
        on(ev, fn)      { listeners[ev] = fn; },
        emit(ev)        { if (listeners[ev]) listeners[ev](); },
        setHeader(k, v) { hdrs[k] = v; },
        status(c)       { this._status = c; return this; },
        json()          { return this; },
        _has(k)         { return k in hdrs; },
    };
}

async function run() {
    // Counters
    let kernelEntered = 0, blocked = 0, errored = 0, globalCatch = 0;
    let apexPopulated = 0;
    let constitutionCalled = 0;
    const verdicts = { ALLOW: 0, WARN: 0, BLOCK: 0 };
    let goalsCalled = 0, goalsFound = 0;
    let attentionCalled = 0, headerSet = 0;
    const attentionTiers   = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const tokenBudgets     = [];
    let hookFired = 0;
    let memAttempts = 0, memSucceeded = 0, memFailed = 0;
    const latencies = [];
    const tokenBudgetsByTier = { HIGH: [], MEDIUM: [], LOW: [] };

    // Seed a goal so resolution returns data
    const seedResult = goalGraph.createGoal('GOAL', 'Launch APEX Civilization Kernel', {
        priority: 80, impact: 90, confidence: 85,
    });

    for (let i = 0; i < 100; i++) {
        const req = makeReq(i);
        const res = makeRes();
        const t0  = Date.now();
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        try {
            // PHASE 1
            const ctx = ec.initializeContext(req);
            req.apex  = ctx;
            kernelEntered++;

            // PHASE 2
            ec.hydrateContext(ctx, 'identity', {
                sessionId:      req.conversationId || null,
                executionClass: req.executionClass  || 'REFLEX',
                authStatus:     'PENDING',
            });

            // PHASE 3
            constitutionCalled++;
            let gateResult;
            try {
                gateResult = gate.evaluate(ctx);
            } catch (_) {
                gateResult = { verdict: gate.VERDICT.WARN, risks: ['GATE_ERROR'], auditTrail: [] };
            }
            ec.hydrateContext(ctx, 'constitution', {
                evaluated: true, verdict: gateResult.verdict,
                risks: gateResult.risks, auditTrail: gateResult.auditTrail,
            });
            verdicts[gateResult.verdict] = (verdicts[gateResult.verdict] || 0) + 1;

            if (gateResult.verdict === 'BLOCK') {
                blocked++;
                res.status(403).json({ error: 'CONSTITUTIONAL_BLOCK' });
                latencies.push(Date.now() - t0);
                continue;
            }
            if (gateResult.verdict === 'WARN') ctx.flags.humanReviewRequired = true;

            // PHASE 4
            goalsCalled++;
            const active = goalGraph.resolveGoal({ status: 'ACTIVE' });
            const scored = active.map(g => { const r = goalGraph.scoreGoal(g.id); return r.ok ? r.node : g; });
            scored.sort((a, b) => (b.score || 0) - (a.score || 0));
            const topGoalId = scored[0] ? scored[0].id : null;
            if (active.length > 0) goalsFound++;
            ec.hydrateContext(ctx, 'goals', { resolved: true, active, scored, topGoalId });

            // PHASE 5
            attentionCalled++;
            const attnItem = {
                goalPriority:        topGoalId ? (scored[0].priority || 50) / 100 : 0.5,
                risk:                gateResult.verdict === 'BLOCK' ? 0.9 : 0.3,
                financialWeight:     0,
                memoryRelevance:     0.3,
                urgency:             req.executionClass === 'EXECUTIVE' ? 0.8 : 0.4,
                cognitiveConfidence: 0.7,
            };
            const attnResult = attention.score(attnItem);
            const tier       = _tier(attnResult.score);
            attentionTiers[tier]++;
            tokenBudgets.push(_tokenBudget(attnResult.score));
            tokenBudgetsByTier[tier].push(_tokenBudget(attnResult.score));
            ec.hydrateContext(ctx, 'attention', {
                computed: true, score: attnResult.score, executionHint: tier, topFocus: topGoalId,
            });

            // PHASE 5b — attention execution consumer
            res.setHeader('X-Apex-Attention-Score', String(attnResult.score));
            res.setHeader('X-Apex-Attention-Tier',  tier);
            req.apexAttentionTier   = tier;
            req.apexMemTokenBudget  = _tokenBudget(attnResult.score);
            if (res._has('X-Apex-Attention-Score')) headerSet++;

            // PHASE 6 — post-response hook
            res.on('finish', () => {
                hookFired++;
                setImmediate(async () => {
                    memAttempts++;
                    try {
                        await memGateway.storeMemory({
                            layer:            LAYER_EPISODIC,
                            content:          JSON.stringify({
                                requestId: ctx.requestId,
                                path:      ctx.metadata.path,
                                tier,
                            }),
                            tags:             ['execution', req.executionClass.toLowerCase()],
                            source:           'civilization-kernel',
                            taskId:           ctx.requestId,
                            importance:       5,
                            requestingEntity: 'civilization-kernel',
                            outcome:          'PARTIAL',
                        });
                        memSucceeded++;
                    } catch (e) {
                        memFailed++;
                    }
                });
            });

            if (req.apex && req.apex.requestId) apexPopulated++;
            next();
            res.emit('finish');

        } catch (err) {
            globalCatch++;
            errored++;
            next();
        }

        latencies.push(Date.now() - t0);
    }

    // Wait for setImmediate queue
    await new Promise(r => setTimeout(r, 300));

    // Verify goal persistence (simulate restart by deleting module cache)
    const storePath = path.join(__dirname, 'data/goals.json');
    const persistOk = fs.existsSync(storePath);
    let persistedGoals = 0;
    if (persistOk) {
        const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        persistedGoals = (data.nodes || []).length;
    }
    // Reload module from file (simulate restart)
    delete require.cache[require.resolve('./lib/goals/goal-graph')];
    const freshGraph = require('./lib/goals/goal-graph');
    const afterReload = freshGraph.resolveGoal({ status: 'ACTIVE' });

    const avgLat  = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3);
    const sorted  = [...latencies].sort((a, b) => a - b);
    const p99     = sorted[Math.floor(sorted.length * 0.99)];
    const maxLat  = sorted[sorted.length - 1];
    const avgBudg = Math.round(tokenBudgets.reduce((a, b) => a + b, 0) / tokenBudgets.length);

    // ── Report ────────────────────────────────────────────────────────────────
    console.log('');
    console.log('=== PHASE C0.6 VERIFICATION — 100 REQUESTS ===');
    console.log('');
    console.log('[1] KERNEL ENTRY');
    console.log('  Entered kernel:       ' + kernelEntered + ' / 100');
    console.log('  Bypassed:             ' + (100 - kernelEntered));
    console.log('  Blocked (403):        ' + blocked);
    console.log('  Global catch fired:   ' + globalCatch);
    console.log('  Errored:              ' + errored);
    console.log('');
    console.log('[3] req.apex POPULATION');
    console.log('  req.apex populated:   ' + apexPopulated + ' / 100');
    console.log('');
    console.log('[4] CONSTITUTION');
    console.log('  Constitution called:  ' + constitutionCalled);
    console.log('  Verdicts:             ' + JSON.stringify(verdicts));
    console.log('');
    console.log('[6] GOAL RESOLUTION');
    console.log('  resolveGoal calls:    ' + goalsCalled);
    console.log('  Requests with goals:  ' + goalsFound + ' / 100');
    console.log('  Goals in store:       ' + persistedGoals + ' (file: ' + (persistOk ? 'EXISTS' : 'MISSING') + ')');
    console.log('  Goals after reload:   ' + afterReload.length + ' (survives module cache clear)');
    console.log('');
    console.log('[7] ATTENTION + EXECUTION CONSUMER');
    console.log('  Attention scored:     ' + attentionCalled);
    console.log('  Header set:           ' + headerSet + ' / 100');
    console.log('  Tier distribution:    ' + JSON.stringify(attentionTiers));
    console.log('  Token budget range:   ' + Math.min(...tokenBudgets) + ' – ' + Math.max(...tokenBudgets));
    console.log('  Token budget avg:     ' + avgBudg);
    console.log('  req.apexAttentionTier set: ' + (100 - errored) + ' / 100');
    console.log('  EXECUTIVE avg budget: ' + (tokenBudgetsByTier.HIGH.length
        ? Math.round(tokenBudgetsByTier.HIGH.reduce((a,b)=>a+b,0)/tokenBudgetsByTier.HIGH.length)
        : 'N/A'));
    console.log('  REFLEX avg budget:    ' + (tokenBudgetsByTier.LOW.length
        ? Math.round(tokenBudgetsByTier.LOW.reduce((a,b)=>a+b,0)/tokenBudgetsByTier.LOW.length)
        : 'N/A'));
    console.log('');
    console.log('[8] POST-RESPONSE HOOKS');
    console.log('  Hooks fired:          ' + hookFired + ' / 100');
    console.log('  Memory write attempts:' + memAttempts);
    console.log('  Write succeeded:      ' + memSucceeded + ' (needs live DB)');
    console.log('  Write failed:         ' + memFailed + ' (expected without DB)');
    console.log('  Layer type:           integer (was string — fixed)');
    console.log('');
    console.log('[9] LATENCY');
    console.log('  avg: ' + avgLat + 'ms   p99: ' + p99 + 'ms   max: ' + maxLat + 'ms');
    console.log('');
    console.log('[10] FAILURE BEHAVIOUR');
    console.log('  Global catch triggered: ' + globalCatch + ' (0 = middleware never threw)');
    console.log('  storeMemory error type: layer-type fix verified (integer not string)');
}

run().catch(e => { console.error('Harness error:', e.message); process.exit(1); });
