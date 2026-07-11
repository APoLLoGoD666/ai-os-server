'use strict';
// lib/registry/scenario/index.js — Multi-Entity Scenario Simulation Engine
//
// Runs what-if scenarios across the full intelligence stack:
//   Entity health impact → Capability degradation → Constraint violations → Executive recommendation
//
// Unlike prediction.js (single-entity, deterministic), scenario.js handles:
//   - Multiple simultaneous entity changes
//   - Full capability degradation chain per change
//   - Aggregate constraint violation scan
//   - Executive recommendation with urgency and confidence score
//
// All outputs are tagged INFERENCE — do not drive policy from these results.

const { RegistryContext }                   = require('../context');
const { ProjectedGraph }                    = require('../projected-graph');
const { entityImpact }                      = require('./entity-impact');
const { URGENCY_RANK, capabilityImpacts }   = require('./capability-impact');
const { constraintCheck }                   = require('./constraint-check');
const { computeUrgency, computeConfidence } = require('./score');
const { buildRationale }                    = require('./rationale');
const { buildExecutive }                    = require('./executive');

/**
 * Run a multi-entity scenario simulation.
 *
 * @param {{ name?: string, changes: Array<{ entity_id: string, proposed: object }>, ctx?: RegistryContext }} opts
 * @returns {{ ok, scenario, entity_impacts, capability_impacts, constraint_check, recommendation, _inference }}
 *
 * Result is tagged INFERENCE — probabilistic. Do not use to drive policy.
 */
function runScenario(opts = {}) {
    const t0      = Date.now();
    const changes  = opts.changes || [];
    const name     = opts.name || `scenario-${Date.now()}`;
    const ctx      = opts.ctx || RegistryContext;

    if (!changes.length) {
        return { ok: false, error: 'No changes provided. Specify at least one { entity_id, proposed } change.' };
    }

    // Build projected graph once — immutable overlay, no engine mutation.
    // edge_patches allow relationship-level what-if (add/remove edges in the projected world).
    const graph = new ProjectedGraph(changes, opts.edge_patches || []);

    // Step 1: Entity-level health impact — each simulation is aware of sibling changes
    const entityImpacts = changes.map(c => entityImpact(c.entity_id, c.proposed, graph, ctx));

    // Step 2: Capability degradation + projected capability status
    const affectedIds   = entityImpacts.filter(e => e.ok).map(e => e.entity_id);
    const capImpacts    = capabilityImpacts(affectedIds, graph, ctx);

    // Step 3: Constraint violations against the projected graph
    const constraintResult = constraintCheck(changes, graph);

    // Step 4: Executive recommendation
    const urgency    = computeUrgency(capImpacts, constraintResult);
    const confidence = computeConfidence(entityImpacts, capImpacts);
    const rationale  = buildRationale(urgency, entityImpacts, capImpacts, constraintResult);

    const executive = buildExecutive(urgency, confidence, rationale, entityImpacts, capImpacts, constraintResult, changes, ctx);

    const result = {
        ok: true,
        scenario: {
            name,
            change_count:  changes.length,
            entity_ids:    changes.map(c => c.entity_id),
        },
        executive,
        entity_impacts:    entityImpacts,
        capability_impacts: capImpacts,
        constraint_check: {
            summary:  constraintResult.summary,
            failures: constraintResult.results.filter(r => r.status !== 'PASS'),
        },
        _inference: {
            warning:    'Probabilistic result. Do not treat as ground truth or use to drive policy.',
            data_type:  'inference',
            confidence,
        },
        duration_ms: Date.now() - t0,
    };

    // Persist to decision memory when urgency warrants review.
    // Only runs when opts.record_decision is explicitly set — never automatic.
    // decision_memory_id is generated synchronously so it can be returned in the result
    // and later passed to POST /api/registry/scenario/outcome for outcome tracking.
    if (opts.record_decision && (urgency === 'HALT' || urgency === 'REVIEW_REQUIRED')) {
        const decisionMemoryId = `registry-scenario-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        result.decision_memory_id = decisionMemoryId;

        const _snap = {
            id:         decisionMemoryId,
            decision:   `Registry scenario: ${name} — ${urgency}`,
            type:       urgency,
            entity_ids: changes.map(c => c.entity_id),
            context: {
                entity_ids:           changes.map(c => c.entity_id),
                capability_impacts:   capImpacts.map(c => ({ id: c.capability_id, severity: c.severity, projected: c.projected_status })),
                constraints_violated: constraintResult.summary.fail,
                migrations_at_risk:   executive.migrations_at_risk,
            },
        };

        setImmediate(async () => {
            try {
                if (!process.env.SUPABASE_URL) return;
                const { createClient } = require('@supabase/supabase-js');
                const sb = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
                );
                await sb.from('decision_memory').insert({
                    memory_id:               _snap.id,
                    decision:                _snap.decision,
                    decision_type:           'architectural',
                    source:                  'registry_scenario',
                    confidence,
                    rationale,
                    context:                 _snap.context,
                    alternatives_considered: changes.map(c => `Keep ${c.entity_id} at current state`),
                    status:                  'candidate',
                    validation_state:        'pending',
                }).catch(() => {});
            } catch (_) {}
        });
    }

    return result;
}

module.exports = { runScenario };
