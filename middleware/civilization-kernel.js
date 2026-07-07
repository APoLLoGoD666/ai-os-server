'use strict';
// middleware/civilization-kernel.js — APEX Civilization Kernel
// Pipeline: INIT → IDENTITY → CONSTITUTION → GOALS → ATTENTION → [route] → POST HOOK
// Fail-open throughout: unhandled errors call next() rather than hanging the request

const fs         = require('fs');
const path       = require('path');
const ec         = require('../lib/runtime/execution-context');
const gate       = require('../lib/runtime/constitutional-gate');
const goalGraph  = require('../lib/goals/goal-graph');
const attention  = require('../lib/attention/attention-engine');
const crypto       = require('crypto');
const memGateway   = require('../lib/memory/gateway');
const govStateView = require('../lib/orchestration/governance_global_state_view');

// Kernel request log (backward compat)
const LOG_FILE   = path.join(__dirname, '../logs/kernel.ndjson');
// W4: Audit ledger — append-only, one record per request
const AUDIT_FILE = path.join(__dirname, '../logs/apex_audit.ndjson');

function _klog(record) {
    try { fs.appendFileSync(LOG_FILE, JSON.stringify(record) + '\n'); } catch (e) { console.error('[klog-fail]', e.message); }
}
function _audit(record) {
    try { fs.appendFileSync(AUDIT_FILE, JSON.stringify(record) + '\n'); } catch (e) { console.error('[audit-fail]', e.message); }
}

const LAYER_EPISODIC = 2;
const LAYER_DECISION = 7;

// ARCH-14 §3.3 — governance score thresholds by AUTONOMY_LEVEL (0.0–1.0 scale)
const AL_THRESHOLD = { 1: 0.95, 2: 0.90, 3: 0.75, 4: 0.60, 5: 0.50, 6: 0.40 };

// Rule 4: path patterns that constitute irreversible state destruction
const DESTRUCTIVE_PATTERNS = ['/drop', '/force-delete', '/hard-delete', '/truncate', '/purge'];

let _sbClient = null;
function _getSb() {
    if (_sbClient) return _sbClient;
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    _sbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
    return _sbClient;
}

function _attentionTier(score) {
    if (score >= 0.65) return 'HIGH';
    if (score >= 0.35) return 'MEDIUM';
    return 'LOW';
}

// Base token budget from attention score (1000–8000)
function _tokenBudget(score) {
    return Math.round(1000 + (score || 0.5) * 7000);
}

// W2: Attention profiles — 4 execution parameters that vary by tier
function _attentionProfile(tier) {
    switch (tier) {
        case 'HIGH':   return { memReadLimit: 15, retryBudget: 3, planningDepth: 'deep',     timeoutMs: 30000 };
        case 'MEDIUM': return { memReadLimit: 5,  retryBudget: 2, planningDepth: 'standard', timeoutMs: 15000 };
        default:       return { memReadLimit: 0,  retryBudget: 1, planningDepth: 'shallow',  timeoutMs: 5000  };
    }
}

async function _safeMemLoad(ctx) {
    try {
        const result = await memGateway.getContext({
            taskId:           ctx.requestId,
            description:      ctx.metadata.path || 'request',
            category:         'runtime',
            complexity:       ctx.identity.executionClass === 'EXECUTIVE' ? 'high' : 'medium',
            tokenBudget:      ctx.flags.effectiveTokenBudget || _tokenBudget(ctx.attention.score || 0.5),
            requestingEntity: 'civilization-kernel',
        });
        return result;
    } catch (_) {
        return null;
    }
}

function _resolveGoals() {
    try {
        const active = goalGraph.resolveGoal({ status: 'ACTIVE' });
        const scored = active.map(g => {
            const r = goalGraph.scoreGoal(g.id);
            return r.ok ? r.node : g;
        });
        scored.sort((a, b) => (b.score || 0) - (a.score || 0));
        return { active, scored, topGoalId: scored[0]?.id || null };
    } catch (_) {
        return { active: [], scored: [], topGoalId: null };
    }
}

// Retrieve live cognitive confidence from autonomy runtime (non-fatal, cached per process tick).
let _cognitiveConfidenceCache = 0.7;
(async () => {
    try {
        const autonomyCtrl = require('../lib/cognitive/runtime/autonomy-runtime-controller');
        const result = autonomyCtrl.applyLevel({ autonomy_level: 3, composite_score: null });
        _cognitiveConfidenceCache = typeof result.compositeScore === 'number'
            ? result.compositeScore
            : 0.7;
    } catch (_) { /* keep default */ }
})();

function _scoreAttention(ctx) {
    try {
        const topGoal = ctx.goals.scored[0];
        const item = {
            goalPriority:        topGoal ? (topGoal.priority || 50) / 100 : 0.5,
            risk:                ctx.constitution.verdict === gate.VERDICT.DENY ? 0.9 :
                                 ctx.constitution.verdict === gate.VERDICT.RESTRICT ? 0.6 : 0.3,
            financialWeight:     0,
            memoryRelevance:     0.3,
            urgency:             ctx.identity.executionClass === 'EXECUTIVE' ? 0.8 : 0.4,
            cognitiveConfidence: _cognitiveConfidenceCache,
        };
        return attention.score(item);
    } catch (_) {
        return { score: 0.5 };
    }
}

// W3+W4: Post-response hook — fires after response sent; accumulates then writes audit
function _postResponseHook(ctx) {
    return function () {
        setImmediate(async () => {
            // Build audit record — populated incrementally, always written in finally
            const auditRecord = {
                ts:                  new Date().toISOString(),
                requestId:           ctx.requestId,
                route:               ctx.metadata.path,
                method:              ctx.metadata.method,
                executionClass:      ctx.identity.executionClass,
                constitutionVerdict: ctx.constitution.verdict,
                constitutionAction:  ctx.flags.constitutionAction || 'NONE',
                goalActive:          ctx.goals.topGoalId,
                attentionScore:      ctx.attention.score,
                attentionTier:       ctx.attention.executionHint,
                tokenBudget:         ctx.flags.effectiveTokenBudget,
                governanceScore:     ctx.flags.governanceScore    ?? null,
                autonomyLevel:       ctx.flags.autonomyLevel      ?? 3,
                archRuleResults:     ctx.flags.archRuleResults    || [],
                memoryStatus:        'pending',
                writeVerified:       false,
                durationMs:          null,
                outcome:             null,
                errors:              [],
            };

            try {
                const outcome = ctx.execution.completed ? 'SUCCESS' : 'PARTIAL';
                ec.finalizeContext(ctx);
                const measure = ec.measureContext(ctx);
                auditRecord.durationMs = measure.durationMs;
                auditRecord.outcome    = outcome;
                auditRecord.errors     = (measure.errors || []).map(e => e.message || String(e));

                // klog (backward compat)
                _klog({
                    ts:             auditRecord.ts,
                    requestId:      ctx.requestId,
                    path:           ctx.metadata.path,
                    method:         ctx.metadata.method,
                    executionClass: ctx.identity.executionClass,
                    verdict:        ctx.constitution.verdict,
                    goalsActive:    ctx.goals.active.length,
                    attentionScore: ctx.attention.score,
                    attentionTier:  ctx.attention.executionHint,
                    tokenBudget:    ctx.flags.effectiveTokenBudget || _tokenBudget(ctx.attention.score || 0.5),
                    durationMs:     measure.durationMs,
                    outcome,
                });

                // W3: Memory write + read-back verification
                if (!ctx.flags.memWriteDisabled) {
                    try {
                        await memGateway.storeMemory({
                            layer:            LAYER_EPISODIC,
                            content:          JSON.stringify({
                                requestId:  ctx.requestId,
                                path:       ctx.metadata.path,
                                outcome,
                                durationMs: measure.durationMs,
                                attention:  ctx.attention.score,
                                tier:       ctx.attention.executionHint,
                            }),
                            tags:             ['execution', ctx.identity.executionClass.toLowerCase()],
                            source:           'civilization-kernel',
                            taskId:           ctx.requestId,
                            traceId:          ctx.requestId,
                            importance:       ctx.flags.humanReviewRequired ? 8 : 5,
                            requestingEntity: 'civilization-kernel',
                            outcome,
                        });
                        auditRecord.memoryStatus = 'written';

                        // W3: read-back — verify the write reached the DB
                        const verified = await memGateway.verifyEpisode(ctx.requestId);
                        auditRecord.writeVerified = !!verified;
                        auditRecord.memoryStatus  = verified ? 'verified' : 'write_unconfirmed';

                    } catch (e) {
                        auditRecord.memoryStatus = 'error';
                        auditRecord.errors.push(e.message.slice(0, 80));
                    }
                } else {
                    auditRecord.memoryStatus = 'restricted';
                }

                // Decision memory for decided requests
                if (ctx.decision.made) {
                    try {
                        await memGateway.storeMemory({
                            layer:            LAYER_DECISION,
                            content:          JSON.stringify({
                                requestId:  ctx.requestId,
                                action:     ctx.decision.action,
                                confidence: ctx.decision.confidence,
                                reasoning:  ctx.decision.reasoning,
                                topGoalId:  ctx.goals.topGoalId,
                                attention:  ctx.attention.score,
                            }),
                            tags:             ['decision', 'apex'],
                            source:           'civilization-kernel',
                            taskId:           ctx.requestId,
                            importance:       8,
                            requestingEntity: 'civilization-kernel',
                            outcome,
                        });
                    } catch (_) {}
                }

                // Update goal attention
                if (ctx.goals.topGoalId && ctx.attention.score !== null) {
                    try {
                        goalGraph.updateGoal(ctx.goals.topGoalId, {
                            attentionScore: ctx.attention.score * 100,
                            metadata:       { lastActiveAt: new Date().toISOString() },
                        });
                    } catch (_) {}
                }

            } catch (e) {
                auditRecord.outcome = 'ERROR';
                auditRecord.errors.push(e.message ? e.message.slice(0, 80) : 'unknown');
            } finally {
                // W4: Audit write — always, even on error
                _audit(auditRecord);
            }
        });
    };
}

// Extract drift state from watchdog's last assessment (lazy, fail-open, no cost on first request)
function _watchdogGateOpts() {
    try {
        const wa = require('../lib/constitution/watchdog').getLastAssessment();
        if (!wa || wa.tickFailed) return {};
        return { driftResult: { driftItems: wa.driftIndicators?.items || [] } };
    } catch { return {}; }
}

// B1: Read live governance score from in-memory state view (synchronous, never throws).
function _getGovernanceScore() {
    try { return govStateView.get_cluster_health_report().avg_governance_score ?? null; } catch (_) { return null; }
}

// B3: ARCH-14 §4.2 supplementary constitutional rule evaluation.
// Rule 4 — Preserve State; Rule 5 — Human Oversight at AL3.
function _evaluateArchRules(req, ctx) {
    const ruleResults = [];
    let blockedBy = null;

    const urlPath   = (req.path || req.url || '').toLowerCase();
    const method    = (req.method || '').toUpperCase();
    const execClass = ctx.identity?.executionClass || 'REFLEX';
    const hasExec   = execClass === 'EXECUTIVE' || execClass === 'SOVEREIGN';

    // Rule 4 — irreversible state destruction requires EXECUTIVE
    const isDestructive = method === 'DELETE' && DESTRUCTIVE_PATTERNS.some(p => urlPath.includes(p));
    if (isDestructive && !hasExec) {
        ruleResults.push({ rule: 'RULE_4', result: 'FAIL', reason: 'RULE_4_IRREVERSIBLE_STATE_RISK' });
        blockedBy = 'RULE_4_IRREVERSIBLE_STATE_RISK';
    } else {
        ruleResults.push({ rule: 'RULE_4', result: 'PASS' });
    }

    // Rule 5 — force-terminate requires EXECUTIVE at AL3
    const needsExec = urlPath.includes('/force-terminate') || urlPath.includes('/force_terminate');
    if (needsExec && !hasExec) {
        ruleResults.push({ rule: 'RULE_5', result: 'FAIL', reason: 'RULE_5_APPROVAL_REQUIRED' });
        if (!blockedBy) blockedBy = 'RULE_5_APPROVAL_REQUIRED';
    } else {
        ruleResults.push({ rule: 'RULE_5', result: 'PASS' });
    }

    return { passed: !blockedBy, blockedBy, ruleResults };
}

// B2: Write mandatory ARCH-14 §4.4 gate record — FAIL-SOFT, never blocks response.
// Maps to ARCH-15 §6.3 governance_records schema.
// Returns a Promise that always resolves (never rejects) — FAIL-SOFT.
// Callers may await for INV-RT3 compliance or call fire-and-forget.
async function _writeGateRecord(record) {
    try {
        const sb = _getSb();
        if (!sb) return;
        const decision = record.gate_result === 'BLOCK' ? 'BLOCKED' : 'APPROVED';
        const content  = JSON.stringify({ ...record, ts: new Date().toISOString() });
        const row = {
            record_type:             'CONSTITUTIONAL_GATE_EVALUATION',
            actor_identity_snapshot: record.actor_snapshot || {},
            action_type:             'GATE_EVALUATION',
            entity_type:             'REQUEST',
            request_id:              record.request_id,
            decision,
            decision_basis:          record.blocked_by || record.verdict || 'ALLOW',
            evidence_refs:           record.rule_results ? [record.rule_results] : [],
            autonomy_level:          record.autonomy_level || 3,
            has_constitutional_impact: decision === 'BLOCKED',
            chain_hash:              crypto.createHash('sha256').update(content).digest('hex'),
            gate_result:             record.gate_result,
            governance_score:        record.governance_score != null
                                         ? parseFloat(Number(record.governance_score * 100).toFixed(2))
                                         : null,
            verdict:                 record.verdict,
            risks:                   record.risks || [],
            rule_results:            record.rule_results ? { rules: record.rule_results } : null,
        };
        await sb.from('governance_records').insert(row);
    } catch (e) {
        console.warn('[kernel] gate-record write failed:', e.message);
    }
}

// INV-RT3: true when the gate record must be committed before the HTTP response is sent.
// Applies to state-mutating methods only; excludes health/observability endpoints.
function _requiresSyncGateWrite(req) {
    const method = (req.method || '').toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
    const p = (req.path || req.url || '').toLowerCase();
    if (/^\/(health|cron\/health)(\/|$)/.test(p))                              return false;
    if (/^\/api\/(latency-stats|latency-traces|system\/events)(\/|$)/.test(p)) return false;
    return true;
}

// Main middleware — global try/catch ensures next() is always called
async function civilizationKernel(req, res, next) {
    try {
        // PHASE 1: Initialize context
        const ctx = ec.initializeContext(req);
        req.apex  = ctx;

        // PHASE 2: Identity hydration
        ec.hydrateContext(ctx, 'identity', {
            sessionId:      req.conversationId || null,
            executionClass: req.executionClass  || 'REFLEX',
            authStatus:     'PENDING',
        });

        // B1: Governance score threshold check (ARCH-14 §3.3)
        // Exempt non-API paths (dashboard HTML, static assets) — gate is for API operations only.
        const _reqPath  = (req.path || req.url || '').toLowerCase();
        const _isApiPath = _reqPath.startsWith('/api/') || _reqPath === '/api';
        const govScore  = _getGovernanceScore();
        const alLevel   = parseInt(process.env.AUTONOMY_LEVEL || '3', 10);
        const threshold = AL_THRESHOLD[alLevel] ?? 0.75;
        if (_isApiPath && govScore !== null && govScore < threshold) {
            ctx.flags.governanceScore = govScore;
            ctx.flags.autonomyLevel   = alLevel;
            res.setHeader('X-Apex-Request-Id',  ctx.requestId);
            res.setHeader('X-Apex-Constitution', gate.VERDICT.DENY);
            _writeGateRecord({
                request_id:      ctx.requestId,
                actor_snapshot:  ctx.identity || {},
                gate_result:     'BLOCK',
                governance_score: govScore,
                autonomy_level:  alLevel,
                blocked_by:      'GOVERNANCE_SCORE_BELOW_THRESHOLD',
                verdict:         gate.VERDICT.DENY,
                risks:           ['GOVERNANCE_SCORE_BELOW_THRESHOLD'],
                rule_results:    [],
            });
            return res.status(403).json({
                error:     'GOVERNANCE_SCORE_BELOW_THRESHOLD',
                score:     govScore,
                threshold,
                requestId: ctx.requestId,
            });
        }

        // PHASE 3: Constitutional gate (synchronous, fail-open per gate module)
        let gateResult;
        const _gateT0 = Date.now();
        try {
            gateResult = gate.evaluate(ctx, _watchdogGateOpts());
        } catch (_) {
            gateResult = { verdict: gate.VERDICT.RESTRICT, risks: ['GATE_ERROR'], riskScore: 0, auditTrail: [], failedOpen: true };
        }
        // F1: gate latency telemetry — observe P95 for one week; adjust 400ms deadline if needed
        const _gateDurationMs = Date.now() - _gateT0;
        if (_gateDurationMs > 100) console.warn(`[kernel] gate latency=${_gateDurationMs}ms verdict=${gateResult.verdict} requestId=${ctx.requestId}`);

        // B3: Supplementary ARCH-14 §4.2 rule evaluation
        const archRules = _evaluateArchRules(req, ctx);
        if (!archRules.passed) {
            gateResult = {
                verdict:    gate.VERDICT.DENY,
                risks:      [archRules.blockedBy, ...(gateResult.risks || [])],
                auditTrail: gateResult.auditTrail || [],
                riskScore:  gateResult.riskScore  || 0,
            };
        }

        // Store for post-hook access
        ctx.flags.governanceScore = govScore;
        ctx.flags.autonomyLevel   = alLevel;
        ctx.flags.archRuleResults = archRules.ruleResults;

        // B2 / INV-RT3: Mandatory gate audit record (ARCH-14 §4.4).
        // For state-mutating requests: await so the DB row is committed before next() fires.
        // For read-only requests: fire-and-forget (no latency impact).
        const _gateRecordPayload = {
            request_id:       ctx.requestId,
            actor_snapshot:   ctx.identity || {},
            gate_result:      gateResult.verdict === gate.VERDICT.DENY ? 'BLOCK' : 'PASS',
            governance_score: govScore,
            autonomy_level:   alLevel,
            blocked_by:       gateResult.verdict === gate.VERDICT.DENY ? (gateResult.risks || [])[0] : null,
            verdict:          gateResult.verdict,
            risks:            gateResult.risks || [],
            rule_results:     archRules.ruleResults,
        };
        if (_requiresSyncGateWrite(req)) {
            await _writeGateRecord(_gateRecordPayload);  // FAIL-SOFT: always resolves
        } else {
            _writeGateRecord(_gateRecordPayload);         // fire-and-forget
        }

        ec.hydrateContext(ctx, 'constitution', {
            evaluated:  true,
            verdict:    gateResult.verdict,
            risks:      gateResult.risks,
            auditTrail: gateResult.auditTrail,
        });

        // W1: DENY — terminate request, route never reached
        if (gateResult.verdict === gate.VERDICT.DENY) {
            ctx.flags.constitutionBlocked = true;
            ctx.flags.constitutionAction  = 'request_denied';
            // Set minimal headers before responding
            res.setHeader('X-Apex-Request-Id',          ctx.requestId);
            res.setHeader('X-Apex-Constitution',         gate.VERDICT.DENY);
            res.setHeader('X-Apex-Constitution-Action',  'request_denied');
            res.on('finish', _postResponseHook(ctx));
            return res.status(403).json({
                error:     'CONSTITUTIONAL_DENY',
                risks:     gateResult.risks,
                requestId: ctx.requestId,
            });
        }

        // PHASE 4: Goal resolution (synchronous)
        const goalResult = _resolveGoals();
        ec.hydrateContext(ctx, 'goals', {
            resolved:  true,
            active:    goalResult.active,
            scored:    goalResult.scored,
            topGoalId: goalResult.topGoalId,
        });

        // PHASE 5: Attention scoring (synchronous)
        const attnResult = _scoreAttention(ctx);
        const tier       = _attentionTier(attnResult.score);
        const profile    = _attentionProfile(tier);
        ec.hydrateContext(ctx, 'attention', {
            computed:      true,
            score:         attnResult.score,
            executionHint: tier,
            allocations:   {},
            topFocus:      goalResult.topGoalId,
        });

        // PHASE 5b: Constitution + Attention → execution modifications
        let effectiveTokenBudget = _tokenBudget(attnResult.score);
        let effectiveClass       = req.executionClass || 'REFLEX';
        let constitutionAction   = 'NONE';
        let memWriteDisabled     = (tier === 'LOW'); // attention also gates writes

        // W1: RESTRICT — modify execution, continue to route
        if (gateResult.verdict === gate.VERDICT.RESTRICT) {
            effectiveTokenBudget = Math.round(effectiveTokenBudget * 0.5);
            effectiveClass       = 'REFLEX'; // downgrade to lowest class
            memWriteDisabled     = true;     // disable memory writes
            constitutionAction   = 'token_halved,class_downgraded,mem_writes_disabled';
            ctx.flags.humanReviewRequired = true;
            ctx.telemetry.warnings.push({ stage: 'constitution', risks: gateResult.risks });
        } else if (gateResult.verdict === gate.VERDICT.WARN) {
            effectiveTokenBudget = Math.round(effectiveTokenBudget * 0.75); // 25% reduction on WARN
            ctx.flags.humanReviewRequired = true;
            constitutionAction = 'token_reduced,human_review_flagged';
            ctx.telemetry.warnings.push({ stage: 'constitution', risks: gateResult.risks });
        }
        // ALLOW: no modification

        // Store computed execution parameters on ctx.flags for post-hook access
        ctx.flags.constitutionAction   = constitutionAction;
        ctx.flags.effectiveTokenBudget = effectiveTokenBudget;
        ctx.flags.memWriteDisabled     = memWriteDisabled;

        // W2: Attention-driven execution parameters (all on req for downstream consumers)
        req.apexAttentionTier    = tier;
        req.apexMemTokenBudget   = effectiveTokenBudget;
        req.apexMemReadLimit     = profile.memReadLimit;
        req.apexRetryBudget      = profile.retryBudget;
        req.apexPlanningDepth    = profile.planningDepth;
        req.apexTimeoutMs        = profile.timeoutMs;
        req.apexExecutionClass   = effectiveClass;
        req.apexMemWriteDisabled = memWriteDisabled;

        // W1+W2: HTTP-visible headers
        res.setHeader('X-Apex-Request-Id',           ctx.requestId);
        res.setHeader('X-Apex-Constitution',          gateResult.verdict);
        res.setHeader('X-Apex-Constitution-Verdict',  gateResult.verdict);  // backward compat
        res.setHeader('X-Apex-Constitution-Action',   constitutionAction);
        res.setHeader('X-Apex-Attention',             String(attnResult.score));
        res.setHeader('X-Apex-Attention-Score',       String(attnResult.score));   // backward compat
        res.setHeader('X-Apex-Attention-Tier',        tier);
        res.setHeader('X-Apex-Token-Budget',          String(effectiveTokenBudget));
        res.setHeader('X-Apex-Execution-Profile',     profile.planningDepth);
        res.setHeader('X-Apex-Goals-Active',          String(goalResult.active.length));

        // PHASE 6: Post-response hook (registered before next())
        res.on('finish', _postResponseHook(ctx));

        // PHASE 7: Memory hydration (async — non-blocking, uses effective budget)
        _safeMemLoad(ctx).then(memResult => {
            if (!memResult) return;
            ec.hydrateContext(ctx, 'memory', {
                loaded:      true,
                episodic:    memResult.historical_context || [],
                semantic:    memResult.lessons            || [],
                procedural:  memResult.project_context ? [memResult.project_context] : [],
                tokenBudget: memResult.token_budget      || 0,
            });
        }).catch(() => {});

        next();

    } catch (err) {
        if (!req.apex) req.apex = { requestId: null, _error: err.message };
        next();
    }
}

module.exports = civilizationKernel;
