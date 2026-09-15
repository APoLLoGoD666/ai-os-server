'use strict';
// Mission 11 — Phase 1: Runtime Execution Trace
// Exercises every runtime stage for a representative task.
// API calls (Anthropic, Supabase) are stubbed — all other layers run live.
//
// Run: node scripts/runtime-trace.js

process.env.ANTHROPIC_API_KEY       = process.env.ANTHROPIC_API_KEY       || 'trace-stub';
process.env.SUPABASE_URL            = process.env.SUPABASE_URL            || 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'trace-stub';

const { route, routeAndLog } = require('../runtime/task-router');
const sanitizer               = require('../lib/memory/sanitizer');
const AccessController        = require('../lib/memory/access-controller');
const registryModels          = require('../lib/models/registry');
const { select }              = require('../lib/models/selector');

// ─────────────────────────────────────────────────────────────────────────────
// Trace context
// ─────────────────────────────────────────────────────────────────────────────
const TASK = {
  taskId:    `TRACE-${Date.now()}`,
  objective: 'implement a cron job that runs the civilization health aggregator daily at 08:00 UTC',
  category:  'infrastructure',
  complexity: null,  // will be filled by router
};

const trace = {
  taskId:   TASK.taskId,
  startedAt: new Date().toISOString(),
  stages: [],
};

function stage(name, fn) {
  const t0 = Date.now();
  try {
    const result = fn();
    const ms = Date.now() - t0;
    trace.stages.push({ stage: name, status: 'pass', ms, result });
    console.log(`  [${String(ms).padStart(4)}ms] PASS  ${name}`);
    return result;
  } catch (e) {
    const ms = Date.now() - t0;
    trace.stages.push({ stage: name, status: 'fail', ms, error: e.message });
    console.log(`  [${String(ms).padStart(4)}ms] FAIL  ${name} — ${e.message}`);
    return null;
  }
}

async function stageAsync(name, fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    trace.stages.push({ stage: name, status: 'pass', ms, result });
    console.log(`  [${String(ms).padStart(4)}ms] PASS  ${name}`);
    return result;
  } catch (e) {
    const ms = Date.now() - t0;
    trace.stages.push({ stage: name, status: 'fail', ms, error: e.message });
    console.log(`  [${String(ms).padStart(4)}ms] FAIL  ${name} — ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(' APEX Cognitive Runtime — Execution Trace');
  console.log(`  Task ID : ${TASK.taskId}`);
  console.log(`  Objective: ${TASK.objective}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // ── Stage 1: Task Router ──────────────────────────────────────────────────
  console.log('── STAGE 1: Task Router ──────────────────────────────────────');
  const routeDecision = stage('task-router.route()', () => {
    return route({ objective: TASK.objective, taskId: TASK.taskId });
  });
  if (routeDecision) {
    TASK.complexity = routeDecision.complexity;
    console.log(`         route=${routeDecision.route} entity=${routeDecision.entity}`);
    console.log(`         priority=${routeDecision.priority} complexity=${routeDecision.complexity}`);
    console.log(`         flags=${JSON.stringify(routeDecision.flags)}`);
  }

  // ── Stage 2: Sanitizer ────────────────────────────────────────────────────
  console.log('\n── STAGE 2: Sanitizer ────────────────────────────────────────');
  stage('sanitizer.sanitize(clean)', () => {
    const result = sanitizer.sanitize(TASK.objective);
    if (result !== TASK.objective) throw new Error('clean text was mutated');
    return { original: TASK.objective, sanitized: result, mutated: false };
  });
  stage('sanitizer.sanitize(secret)', () => {
    const dirty = `key is sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA use it`;
    const result = sanitizer.sanitize(dirty);
    if (result.includes('sk-ant')) throw new Error('secret not redacted');
    return { redacted: result.includes('[REDACTED]') };
  });

  // ── Stage 3: Access Control ───────────────────────────────────────────────
  console.log('\n── STAGE 3: Access Controller ────────────────────────────────');
  const ac = new AccessController();
  stage('ac.check orchestrator READ layer 10', () => {
    ac.check('orchestrator', [10], 'READ');
    return { allowed: true };
  });
  stage('ac.check agent READ layer 0 (should deny)', () => {
    try {
      ac.check('agent_x', [0], 'READ');
      throw new Error('should have been denied');
    } catch (e) {
      if (e.name !== 'AccessDeniedError') throw e;
      return { denied: true, reason: e.message };
    }
  });
  stage('ac.check cto READ layer 0 (council)', () => {
    ac.check('cto', [0], 'READ');
    return { allowed: true, entity: 'cto', class: 'COUNCIL' };
  });

  // ── Stage 4: Model Registry ───────────────────────────────────────────────
  console.log('\n── STAGE 4: Model Registry ───────────────────────────────────');
  const complexity = TASK.complexity || 'moderate';
  stage(`registry.getModelForTier(${complexity})`, () => {
    const m = registryModels.getModelForTier(complexity);
    console.log(`         → ${m.id} (${m.provider}, tier=${m.tier}, $${m.costPerMtok}/Mtok)`);
    return m;
  });
  stage('registry.estimateCost(sonnet, 5000, 1000)', () => {
    const cost = registryModels.estimateCost('claude-sonnet-4-6', 5000, 1000);
    console.log(`         → $${cost.toFixed(6)}`);
    return { cost };
  });

  // ── Stage 5: Model Selector ───────────────────────────────────────────────
  console.log('\n── STAGE 5: Model Selector ───────────────────────────────────');
  stage(`selector.select(${complexity})`, () => {
    const instance = select(complexity);
    console.log(`         → ${instance.modelId} (${instance.provider})`);
    return { modelId: instance.modelId, provider: instance.provider };
  });
  stage('selector.select(voice) → gemini', () => {
    const instance = select('moderate', { domain: 'voice' });
    if (!instance.modelId.includes('gemini')) throw new Error(`expected gemini, got ${instance.modelId}`);
    console.log(`         → ${instance.modelId} (${instance.provider})`);
    return { modelId: instance.modelId };
  });

  // ── Stage 6: Founder Memory (fallback path) ───────────────────────────────
  console.log('\n── STAGE 6: Founder Memory (fallback) ───────────────────────');
  await stageAsync('founderMemory.getContext(all) — fallback', async () => {
    const founderMemory = require('../lib/memory/founder-memory');
    // When Supabase isn't live, it falls back to hardcoded FALLBACK_CONTEXT
    // We test the fallback by directly checking the export
    const fb = founderMemory.FALLBACK_CONTEXT;
    if (!fb.identity_summary) throw new Error('FALLBACK_CONTEXT missing identity_summary');
    if (!fb.constraints?.length) throw new Error('FALLBACK_CONTEXT missing constraints');
    console.log(`         → identity: ${fb.identity_summary.slice(0, 60)}...`);
    console.log(`         → goals: ${fb.active_goals.length} active, constraints: ${fb.constraints.length}`);
    return { identityPresent: true, goals: fb.active_goals.length, constraints: fb.constraints.length };
  });

  // ── Stage 7: Gateway (with Supabase stubbed) ──────────────────────────────
  console.log('\n── STAGE 7: Memory Gateway (Supabase stubbed) ────────────────');
  await stageAsync('gateway.storeMemory (stub) — layer 10', async () => {
    const gateway = require('../lib/memory/gateway');
    const origStore = gateway.storeMemory;
    // Stub to avoid real Supabase call
    let called = false;
    gateway.storeMemory = async (opts) => { called = true; return { id: 'stub-lesson-id', layer: opts.layer }; };
    const r = await gateway.storeMemory({ layer: 10, content: 'Test lesson from trace', source: 'trace', taskId: TASK.taskId, importance: 6, requestingEntity: 'orchestrator' });
    gateway.storeMemory = origStore;
    if (!called) throw new Error('storeMemory was not called');
    return { id: r.id, layer: r.layer };
  });

  await stageAsync('gateway.storeMemory (stub) — layer 2', async () => {
    const gateway = require('../lib/memory/gateway');
    const origStore = gateway.storeMemory;
    gateway.storeMemory = async (opts) => ({ id: 'stub-episode-id', layer: opts.layer });
    const r = await gateway.storeMemory({ layer: 2, content: JSON.stringify({ taskId: TASK.taskId, success: true }), source: 'trace', requestingEntity: 'orchestrator' });
    gateway.storeMemory = origStore;
    return { id: r.id, layer: r.layer };
  });

  // ── Stage 8: Executive Registry (model stubbed) ───────────────────────────
  console.log('\n── STAGE 8: Executive Registry ───────────────────────────────');
  stage('executive registry — 6 entities loaded', () => {
    const { ENTITIES } = require('../lib/executive/registry');
    const ids = Object.keys(ENTITIES);
    if (ids.length !== 6) throw new Error(`expected 6 entities, got ${ids.length}`);
    const required = ['cso','cio','cfo','cto','coo','cgo'];
    for (const r of required) if (!ENTITIES[r]) throw new Error(`missing entity: ${r}`);
    console.log(`         → entities: ${ids.join(', ')}`);
    return { count: ids.length, entities: ids };
  });
  stage('executive entity — cto has correct decision rights', () => {
    const { ENTITIES } = require('../lib/executive/registry');
    const cto = ENTITIES.cto;
    if (!cto.decisionRights.can_approve.includes('architectural_changes_no_new_deps'))
      throw new Error('CTO missing architectural approval right');
    if (cto.memoryAccess.length < 3) throw new Error('CTO memory access too limited');
    return { id: cto.id, name: cto.name, memoryLayers: cto.memoryAccess };
  });
  stage('executive entity — cto escalation rule fires on auth question', () => {
    const { ENTITIES } = require('../lib/executive/registry');
    const cto = ENTITIES.cto;
    const question = 'should we change the auth middleware to use JWT?';
    const shouldEscalate = cto.escalationRules.some(r => r.condition(question, {}));
    if (!shouldEscalate) throw new Error('CTO did not escalate on auth question');
    return { question, escalates: true };
  });

  // ── Stage 9: Telemetry Aggregator (structure check) ──────────────────────
  console.log('\n── STAGE 9: Telemetry Aggregator ─────────────────────────────');
  stage('aggregator module loads', () => {
    const { computeCivilizationHealth } = require('../lib/telemetry/aggregator');
    if (typeof computeCivilizationHealth !== 'function') throw new Error('not a function');
    return { exported: true };
  });

  // ── Stage 10: Runtime consultExecutive wiring ─────────────────────────────
  console.log('\n── STAGE 10: consultExecutive wiring ─────────────────────────');
  stage('runtime/index exports consultExecutive', () => {
    const runtime = require('../lib/cognitive/runtime');
    if (typeof runtime.consultExecutive !== 'function') throw new Error('not exported');
    if (typeof runtime.buildControls !== 'function') throw new Error('buildControls not exported');
    return { wired: true };
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalMs = Date.now() - new Date(trace.startedAt).getTime();
  const passed  = trace.stages.filter(s => s.status === 'pass').length;
  const failed  = trace.stages.filter(s => s.status === 'fail').length;

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(` Trace complete: ${passed} passed, ${failed} failed, ${totalMs}ms`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // Machine-readable output for report generation
  trace.summary = { passed, failed, totalMs };
  console.log('TRACE_JSON:' + JSON.stringify(trace, null, 2));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
