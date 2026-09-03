'use strict';

// lib/runtime/assembler.js
// Observability chain — runs all 10 runtime analysis modules for a completed task.
// Each module is wrapped individually so one failure never stops the rest.
// Called via setImmediate from orchestrator — fully non-blocking, never throws.

const _execEval    = require('./execution-evaluator');
const _decBench    = require('./decision-benchmark');
const _cfEval      = require('./counterfactual-evaluator');
const _outReg      = require('./outcome-registry');
const _outLin      = require('./outcome-lineage');
const _impLab      = require('./improvement-lab');
const _stratEng    = require('./strategy-engine');
const _learnLed    = require('./learning-ledger');
const _adaptSim    = require('./adaptation-simulator');
const _decProv     = require('./decision-provenance');

async function runObservabilityChain(taskId, ctx) {
    // 1. execution-evaluator — recordOutcome + evaluate
    try {
        _execEval.recordOutcome({
            taskId,
            agentType:  ctx.agentType,
            duration:   ctx.duration,
            tokenCount: ctx.tokenCount,
            outcome:    ctx.outcome,
            retries:    ctx.retries,
            cost:       ctx.cost,
            traceId:    ctx.traceId,
            error:      ctx.error || null,
        });
        _execEval.evaluate();
    } catch (e) {
        console.error('[assembler] execution-evaluator error:', e.message);
    }

    // 2. decision-benchmark
    try {
        _decBench.benchmark([{
            taskId,
            agentType:  ctx.agentType,
            duration:   ctx.duration,
            tokenCount: ctx.tokenCount,
            outcome:    ctx.outcome,
            cost:       ctx.cost,
            traceId:    ctx.traceId,
        }]);
    } catch (e) {
        console.error('[assembler] decision-benchmark error:', e.message);
    }

    // 3. counterfactual-evaluator
    try {
        _cfEval.evaluate({
            taskId,
            agentType:  ctx.agentType,
            outcome:    ctx.outcome,
            duration:   ctx.duration,
            tokenCount: ctx.tokenCount,
            cost:       ctx.cost,
            retries:    ctx.retries,
            traceId:    ctx.traceId,
            error:      ctx.error || null,
        });
    } catch (e) {
        console.error('[assembler] counterfactual-evaluator error:', e.message);
    }

    // 4. outcome-registry
    try {
        _outReg.buildRegistry([{
            taskId,
            agentType:  ctx.agentType,
            outcome:    ctx.outcome,
            cost:       ctx.cost,
            duration:   ctx.duration,
            traceId:    ctx.traceId,
        }]);
    } catch (e) {
        console.error('[assembler] outcome-registry error:', e.message);
    }

    // 5. outcome-lineage
    try {
        _outLin.buildLineage({
            taskId,
            agentType:  ctx.agentType,
            outcome:    ctx.outcome,
            cost:       ctx.cost,
            duration:   ctx.duration,
            traceId:    ctx.traceId,
            decision:   ctx.decision,
            inputHash:  ctx.inputHash,
            outputHash: ctx.outputHash,
        });
    } catch (e) {
        console.error('[assembler] outcome-lineage error:', e.message);
    }

    // 6. improvement-lab
    try {
        _impLab.analyze({
            taskId,
            agentType:  ctx.agentType,
            outcome:    ctx.outcome,
            duration:   ctx.duration,
            tokenCount: ctx.tokenCount,
            cost:       ctx.cost,
            retries:    ctx.retries,
            error:      ctx.error || null,
            traceId:    ctx.traceId,
        });
    } catch (e) {
        console.error('[assembler] improvement-lab error:', e.message);
    }

    // 7. strategy-engine
    try {
        _stratEng.formulate({
            taskId,
            agentType:       ctx.agentType,
            outcome:         ctx.outcome,
            cost:            ctx.cost,
            duration:        ctx.duration,
            policyDecisions: ctx.policyDecisions || [],
            traceId:         ctx.traceId,
        });
    } catch (e) {
        console.error('[assembler] strategy-engine error:', e.message);
    }

    // 8. learning-ledger
    try {
        _learnLed.buildLedger({
            taskId,
            agentType:  ctx.agentType,
            outcome:    ctx.outcome,
            cost:       ctx.cost,
            duration:   ctx.duration,
            tokenCount: ctx.tokenCount,
            retries:    ctx.retries,
            traceId:    ctx.traceId,
            error:      ctx.error || null,
        });
    } catch (e) {
        console.error('[assembler] learning-ledger error:', e.message);
    }

    // 9. adaptation-simulator
    try {
        _adaptSim.simulate({
            taskId,
            agentType:  ctx.agentType,
            outcome:    ctx.outcome,
            cost:       ctx.cost,
            duration:   ctx.duration,
            retries:    ctx.retries,
            traceId:    ctx.traceId,
        });
    } catch (e) {
        console.error('[assembler] adaptation-simulator error:', e.message);
    }

    // 10. decision-provenance
    try {
        _decProv.buildProvenance({
            taskId,
            agentType:       ctx.agentType,
            outcome:         ctx.outcome,
            decision:        ctx.decision,
            policyDecisions: ctx.policyDecisions || [],
            inputHash:       ctx.inputHash,
            outputHash:      ctx.outputHash,
            traceId:         ctx.traceId,
        });
    } catch (e) {
        console.error('[assembler] decision-provenance error:', e.message);
    }
}

module.exports = { runObservabilityChain };
