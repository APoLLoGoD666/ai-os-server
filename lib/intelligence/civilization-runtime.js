'use strict';
// lib/intelligence/civilization-runtime.js
// Autonomous civilization loop: Observe → Analyze → Deliberate → Plan → Execute → Learn → Update Memory → Repeat

const logger = require('../logger');

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let _timer          = null;
let _running        = false;
let _cycleCount     = 0;
let _retryScheduled = false;

// ─── Main loop ────────────────────────────────────────────────────────────────

async function start(intervalMs = DEFAULT_INTERVAL_MS) {
  if (_running) { logger.warn('civilization-runtime', 'already running'); return; }
  _running = true;
  logger.debug('civilization-runtime', 'starting', { intervalMs });

  // Initialise all domain event handlers
  try { require('../../civilisation/domain-loader').init(); } catch (e) { logger.warn('civilization-runtime', 'domain init error', { error: e.message }); }

  // Hydrate consensus sessions from Supabase (restores flat files on fresh deploys)
  try { await require('../../civilisation/consensus').init(); } catch (e) { logger.warn('civilization-runtime', 'consensus init error', { error: e.message }); }

  // Run immediately, then on interval
  _tick().catch(e => logger.warn('civilization-runtime', 'first tick error', { error: e.message }));
  _timer = setInterval(() => {
    _tick().catch(e => logger.warn('civilization-runtime', 'tick error', { error: e.message }));
  }, intervalMs);
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _running = false;
  logger.debug('civilization-runtime', 'stopped', { cyclesCompleted: _cycleCount });
}

function isRunning() { return _running; }
function getCycleCount() { return _cycleCount; }

// ─── Single tick (one full civilization loop cycle) ───────────────────────────

async function _tick() {
  const cycleId = `CIV-${Date.now()}`;
  const cycleStart = Date.now();
  logger.debug('civilization-runtime', 'tick start', { cycleId });

  const result = {
    cycleId,
    startedAt:       new Date().toISOString(),
    phases:          {},
    errors:          [],
  };

  // PHASE 1: OBSERVE — gather global intelligence + graph context baseline
  result.phases.observe = await _phase('observe', cycleId, async () => {
    const gig = require('./global-intelligence-engine');
    // Observe = read recent real events (significance ≥ 0.3); do not write synthetic ticks
    const recentEvents = await gig.getRecentEvents({ limit: 10, minSignificance: 0.3 }).catch(() => []);

    // Auto-measure pending council decisions from prior cycles based on health trajectory
    try {
      const outcomes = require('./decision-outcome-engine');
      const pending = await outcomes.getPending(5);
      if (pending.length) {
        const gateway = require('../memory/gateway');
        const healthSnap = await require('./civilization-health-engine').snapshot().catch(() => null);
        const currentHealth = healthSnap?.score || 0;
        await Promise.allSettled(pending.map(d =>
          outcomes.measure({
            id: d.id,
            actualOutcome: currentHealth >= 70 ? 'positive' : currentHealth >= 50 ? 'mixed' : 'negative',
            variance: null,
            lessonsLearned: `Health at measurement: ${currentHealth}`,
          })
        ));
      }
    } catch {}

    // Constitutional gate: genome + clock snapshot for this cycle
    let genomeOk = null, clockDomains = 0;
    try {
      const { Registry } = require('../../registry/kernel');
      const gv = Registry.genome.validate();
      genomeOk = gv.ok;
      if (!gv.ok) logger.warn('civilization-runtime', 'constitutional gate FAIL — blocking genome violations present');
      const clk = Registry.clock.status();
      clockDomains = Object.keys(clk.domains || {}).length;
    } catch {}
    // Graph baseline: detect any active anti-goal threats in current context
    let graphThreats = [];
    try {
      const founderGraph = require('../founder/graph');
      const graphCtx = await founderGraph.getFounderGraphContext('civilization observe cycle empire building');
      if (graphCtx && !graphCtx.anti_goal_clean) {
        graphThreats = graphCtx.graph_paths || [];
        logger.warn('civilization-runtime', 'observe: graph anti-goal signal', { paths: graphThreats });
      }
    } catch {}

    logger.debug('civilization-runtime', 'observe complete', { cycleCount: _cycleCount, eventsDetected: recentEvents.length });

    // Feed Reality Fabric projectors — non-blocking, never delays cycle
    setImmediate(async () => {
      try {
        await Promise.allSettled([
          require('../reality/projections/civilisation').project(),
          require('../reality/projections/intelligence').project(),
          require('../reality/projections/governance').project(),
        ]);
      } catch (_) {}
    });

    return { eventsDetected: recentEvents.length, recentEvents: recentEvents.slice(0, 3), graph_threats: graphThreats, genome_ok: genomeOk, clock_domains: clockDomains };
  });

  // PHASE 2: ANALYZE — compute civilization health + detect opportunities
  result.phases.analyze = await _phase('analyze', cycleId, async () => {
    const [healthResult, oppResult] = await Promise.allSettled([
      require('./civilization-health-engine').snapshot(),
      require('./opportunity-engine').runCycle(),
    ]);
    return {
      health: healthResult.status === 'fulfilled' ? { score: healthResult.value?.score, classification: healthResult.value?.classification } : null,
      opportunitiesFound: oppResult.status === 'fulfilled' ? oppResult.value?.length : 0,
    };
  });

  const healthScore = result.phases.analyze?.output?.health?.score || 0;
  const CYCLE_BUDGET_USD = parseFloat(process.env.CIVILIZATION_CYCLE_BUDGET_USD || '0.50');
  let _cycleCost = 0;

  // PHASE 3: DELIBERATE — if health degraded or significant events, convene council
  if (_cycleCost >= CYCLE_BUDGET_USD) {
    result.phases.deliberate = { status: 'skipped', reason: 'budget_exceeded', output: null };
  } else {
    result.phases.deliberate = await _phase('deliberate', cycleId, async () => {
      const gig    = require('./global-intelligence-engine');
      const council = require('../executive/executive-council');

      const alerts = await gig.getAlerts();
      if (!alerts.length && healthScore >= 70) {
        return { deliberation: null, reason: 'health good, no alerts' };
      }

      const alertSummary = alerts.slice(0, 3).map(a => `- [${a.category}] ${a.title}`).join('\n');
      const question = `Civilization health is ${healthScore}${alerts.length ? `. Alerts:\n${alertSummary}` : ''}. What is the council's priority for the next cycle?`;

      const deliberation = await council.deliberate(question, { cycleId, healthScore });
      // C2: persist council recommendation to layer 10 for future retrieval
      if (deliberation.recommendation) {
        const gw = require('../memory/gateway');
        gw.storeMemory({ layer: 10, content: `Council recommendation (${cycleId}): ${deliberation.recommendation.slice(0, 400)}`, tags: ['council', 'deliberation', cycleId], source: 'civilization_runtime', requestingEntity: 'civilization_runtime' }).catch(() => {});
      }
      return { deliberationId: deliberation.deliberationId, consensusLevel: deliberation.consensusLevel, recommendation: deliberation.recommendation };
    });
    _cycleCost += 0.04;
  }

  // PHASE 4: PLAN — generate or refresh strategy if needed (all 4 horizons)
  if (_cycleCost >= CYCLE_BUDGET_USD) {
    result.phases.plan = { status: 'skipped', reason: 'budget_exceeded', output: null };
  } else {
  result.phases.plan = await _phase('plan', cycleId, async () => {
    const strategyEngine = require('./strategy-engine');
    const existingPlans  = await strategyEngine.getLatestPlans();

    // Each horizon has a max age before regeneration
    const maxAgeDays = { '90_day': 30, '1_year': 90, '3_year': 180, '10_year': 365 };
    const generators  = {
      '90_day':  () => strategyEngine.generate90Day(),
      '1_year':  () => strategyEngine.generate1Year(),
      '3_year':  () => strategyEngine.generate3Year(),
      '10_year': () => strategyEngine.generate10Year(),
    };

    const needed = Object.keys(maxAgeDays).filter(horizon => {
      const existing = existingPlans.find(p => p.horizon === horizon);
      if (!existing) return true;
      const ageDays = (Date.now() - new Date(existing.created_at).getTime()) / 86_400_000;
      return ageDays > maxAgeDays[horizon];
    });

    if (!needed.length) return { planGenerated: null, reason: 'all plans current' };
    // Generate one per cycle to keep token cost predictable; remaining handled next cycle
    const horizon = needed[0];
    const plan = await generators[horizon]();
    // C2: persist generated strategy summary to layer 5
    if (plan?.summary || plan?.id) {
      const gw = require('../memory/gateway');
      gw.storeMemory({ layer: 5, content: `Strategy plan (${horizon}, ${cycleId}): ${(plan.summary || `planId=${plan.id}`).slice(0, 300)}`, tags: ['strategy', horizon, cycleId], source: 'civilization_runtime', requestingEntity: 'civilization_runtime' }).catch(() => {});
    }
    return { planGenerated: horizon, planId: plan?.id, remaining: needed.slice(1) };
  });
  _cycleCost += 0.05;
  } // end Phase 4 budget gate

  // PHASE 5: EXECUTE — route any high-urgency opportunities to task router
  result.phases.execute = await _phase('execute', cycleId, async () => {
    const oppEngine = require('./opportunity-engine');
    const opps = await oppEngine.getTopOpportunities(5);
    const immediate = opps.filter(o =>
      (o.roi_forecast?.urgency === 'immediate' && o.composite_score >= 0.65) ||
      (o.roi_forecast?.urgency === 'this_week' && o.composite_score >= 0.8)
    );

    if (!immediate.length) return { tasksQueued: 0 };

    // Anti-goal gate: block execution if any opportunity violates founder anti-goals
    let gatePassed = [];
    try {
      const founderOS = require('../founder');
      const checks = await Promise.allSettled(
        immediate.map(o => founderOS.checkAntiGoals(`${o.title} ${o.description || ''}`, { triggerSource: 'civilization_execute' }))
      );
      for (let i = 0; i < immediate.length; i++) {
        const check = checks[i].status === 'fulfilled' ? checks[i].value : { clean: true };
        if (check.clean) gatePassed.push(immediate[i]);
      }
    } catch {
      gatePassed = immediate; // fail open if founder OS unavailable
    }

    if (!gatePassed.length) return { tasksQueued: 0, blocked: immediate.length, reason: 'anti_goal_violation' };

    let queued = 0;
    for (const opp of gatePassed.slice(0, 2)) { // cap at 2 auto-queued per cycle
      try {
        const taskRouter = require('../../runtime/task-router');
        const route = taskRouter.routeAndLog({ objective: opp.description || opp.title, taskId: cycleId });
        if (route.route === 'agent_pipeline' || route.route === 'research_system') {
          // Emit to agent queue via event bus
          const eventBus = require('../event-bus');
          eventBus.emit('civilization:opportunity:execute', { opportunityId: opp.id, objective: opp.title, route });
          queued++;
        }
      } catch {}
    }
    return { tasksQueued: queued };
  });

  // PHASE 6: LEARN — persist cycle outcomes as lessons
  result.phases.learn = await _phase('learn', cycleId, async () => {
    const gateway = require('../memory/gateway');
    const cycleMs = Date.now() - cycleStart;
    const classification = result.phases.analyze?.output?.health?.classification || 'unknown';
    const failedPhases = Object.entries(result.phases).filter(([, p]) => p.status === 'error').map(([n]) => n);
    const recommendation = result.phases.deliberate?.output?.recommendation || '';

    // Layer 10: structured lesson record
    await gateway.storeMemory({
      layer:   10,
      content: JSON.stringify({
        cycleId, healthScore, classification, failedPhases,
        phases: Object.entries(result.phases).map(([name, phase]) => ({ name, status: phase.status })),
        durationMs: cycleMs,
      }),
      tags:    ['civilization_cycle', `health_${classification}`],
      source:  'civilization_runtime',
      taskId:  cycleId,
      importance: healthScore < 50 ? 8 : 5,
      requestingEntity: 'civilization_runtime',
    }).catch(() => {});

    // Layer 11: reflexion record — feeds organizational-learning-engine weekly report
    const reflexionContent = `Civilization cycle ${cycleId}: health=${healthScore} (${classification}). ` +
      (failedPhases.length ? `Failed phases: ${failedPhases.join(', ')}. ` : 'All phases succeeded. ') +
      (recommendation ? recommendation.slice(0, 300) : '');
    await gateway.storeMemory({
      layer:   11,
      content: reflexionContent,
      tags:    ['civilization_cycle', `health_${classification}`],
      source:  'civilization_runtime',
      taskId:  cycleId,
      importance: healthScore < 50 ? 8 : 5,
      requestingEntity: 'civilization_runtime',
    }).catch(() => {});

    return { lessonPersisted: true, reflexionPersisted: true, durationMs: cycleMs };
  });

  // PHASE 7: HOUSEKEEPING — auto-reject stale email tasks (>48h waiting_approval)
  result.phases.housekeeping = await _phase('housekeeping', cycleId, async () => {
    const sb = require('../clients').getSupabaseClient();
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from('agent_tasks')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('status', 'waiting_approval')
      .lt('created_at', cutoff)
      .select('id');
    return { dismissed: error ? 0 : (data?.length || 0) };
  });

  // PHASE 8: UPDATE MEMORY — store strategic summary at layer 5
  result.phases.update_memory = await _phase('update_memory', cycleId, async () => {
    const gateway = require('../memory/gateway');
    await gateway.storeMemory({
      layer:   5,
      content: `Civilization cycle ${cycleId} complete. Health: ${healthScore}. ` +
               `Opportunities: ${result.phases.analyze?.output?.opportunitiesFound || 0}. ` +
               (result.phases.deliberate?.output?.recommendation?.slice(0, 200) || ''),
      tags:    ['civilization', 'cycle_summary'],
      source:  'civilization_runtime',
      taskId:  cycleId,
      requestingEntity: 'civilization_runtime',
    }).catch(() => {});
    return { updated: true };
  });

  // Score reality health + evaluate self-model predictions post-cycle (non-blocking)
  setImmediate(async () => {
    try {
      await require('../reality/fabric').getSystemRealityHealth();
      await require('../reality/self-model').evaluatePredictions();
    } catch (_) {}
  });

  // D1: notify on high-score opportunities detected this cycle
  setImmediate(async () => {
    try {
      const sb = require('../clients').getSupabaseClient();
      const { data: topOpps } = await sb.from('opportunities')
        .select('id, title, composite_score')
        .gte('composite_score', 0.7)
        .eq('status', 'detected')
        .order('composite_score', { ascending: false })
        .limit(3);
      if (!topOpps?.length) return;
      await sb.from('apex_notifications').insert(
        topOpps.map(o => ({
          type: 'opportunity',
          title: `High-value opportunity: ${o.title}`,
          body: `Score ${Math.round((o.composite_score || 0) * 100)}/100 detected in cycle ${cycleId}`,
          read: false,
          created_at: new Date().toISOString(),
        }))
      ).catch(() => {});
    } catch {}
  });

  _cycleCount++;
  result.completedAt  = new Date().toISOString();
  result.durationMs   = Date.now() - cycleStart;

  // Surface phase failures as system notifications — silent failures are the worst kind
  const _failedPhases = Object.entries(result.phases).filter(([, p]) => p.status === 'error').map(([n]) => n);
  if (_failedPhases.length >= 2) {
    const { getSupabaseClient } = require('../clients');
    getSupabaseClient()?.from('apex_notifications').insert({
      type: 'system',
      title: `Civilization cycle ${cycleId}: ${_failedPhases.length} phases failed`,
      body: `Failed phases: ${_failedPhases.join(', ')}. Duration: ${result.durationMs}ms.`,
      read: false,
      created_at: new Date().toISOString(),
    }).catch(() => {});
    logger.warn('civilization-runtime', 'cycle degraded', { cycleId, failedPhases: _failedPhases });
    // G2: broadcast WebSocket alert to dashboard
    if (typeof global._wsBroadcast === 'function') {
      global._wsBroadcast({ type: 'civilization_alert', data: { cycleId, failedPhases: _failedPhases, healthScore, durationMs: result.durationMs } });
    }
  }

  // A4: 30-min retry when a critical phase fails
  const _CRITICAL_PHASES = new Set(['deliberate', 'learn', 'update_memory']);
  if (!_retryScheduled && _failedPhases.some(p => _CRITICAL_PHASES.has(p))) {
    _retryScheduled = true;
    setTimeout(() => { _retryScheduled = false; _tick().catch(() => {}); }, 30 * 60 * 1000);
    logger.warn('civilization-runtime', 'critical phase failed — retry in 30 min', { cycleId, failedPhases: _failedPhases });
  }

  require('../consumption-log').record({ subsystem: 'civilization_cycle', output_key: 'tick', consumer: 'civilization_runtime', task_id: cycleId, meta: { estimated_cost_usd: _cycleCost, durationMs: result.durationMs } });

  // A3: Write audit row to civilization_cycle_log
  try {
    await require('../clients').getSupabaseClient()?.from('civilization_cycle_log').upsert({
      cycle_id:       cycleId,
      started_at:     result.startedAt,
      completed_at:   result.completedAt,
      duration_ms:    result.durationMs,
      health_score:   healthScore,
      phases:         JSON.stringify(Object.fromEntries(Object.entries(result.phases).map(([k, v]) => [k, v.status]))),
      cycle_cost_usd: _cycleCost,
    }, { onConflict: 'cycle_id' });
  } catch {}

  try { require('../viz-broadcaster').emit({ type: 'civ', cycleId, health: healthScore, phases: Object.keys(result.phases).length, tasksQueued: result.phases.execute?.output?.tasksQueued || 0 }); } catch (_) {}
  logger.debug('civilization-runtime', 'tick complete', { cycleId, durationMs: result.durationMs, healthScore });
  return result;
}

async function _phase(name, cycleId, fn) {
  const start = Date.now();
  try {
    const output = await fn();
    return { status: 'ok', output, durationMs: Date.now() - start };
  } catch (e) {
    logger.warn('civilization-runtime', `phase ${name} failed`, { cycleId, error: e.message });
    return { status: 'error', error: e.message, durationMs: Date.now() - start };
  }
}

// Run a single cycle immediately (for testing / manual trigger)
async function runOnce() {
  return _tick();
}

module.exports = { start, stop, isRunning, getCycleCount, runOnce };
