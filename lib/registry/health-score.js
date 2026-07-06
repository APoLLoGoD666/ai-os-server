'use strict';
// lib/registry/health-score.js — Evidence-based health scoring for the Digital Twin.
//
// Instead of a heuristic label (ACTIVE / INACTIVE), health is computed as:
//   score:      0–100  (weighted average of all applicable evidence signals)
//   confidence: 0–1    (fraction of evidence signals that were applicable)
//   label:      active | present | degraded | inactive | missing | external | unknown
//
// Evidence weights are deliberate: physical and runtime are load-bearing;
// documentation and repository are supporting; others provide context.

const EVIDENCE = {
    physical:      { weight: 0.28 },
    repository:    { weight: 0.12 },
    runtime:       { weight: 0.22 },
    documentation: { weight: 0.14 },
    knowledge:     { weight: 0.08 },
    monitoring:    { weight: 0.10 },
    memory:        { weight: 0.04 },
    dashboard:     { weight: 0.02 },
};

const STATUS_VALUE = { SYNC: 1.0, DRIFT: 0.0, NOT_IMPLEMENTED: 0.5 };
// SKIP = signal not applicable; excluded from denominator

// Label thresholds
function _label(score) {
    if (score >= 90) return 'active';
    if (score >= 70) return 'present';
    if (score >= 45) return 'degraded';
    if (score >= 1)  return 'inactive';
    return 'missing';
}

/**
 * Compute an evidence-based health score for a single entity.
 *
 * @param {object} entity  — Registry entity
 * @param {Array}  projections  — result of checkAllProjections(entity)
 * @param {object} [opts]
 * @param {number} [opts.relationshipCount=0]  — outgoing + incoming edge count
 * @param {number} [opts.migrationCompliance]  — 0–1 if entity owns migrations
 * @returns {{ score, confidence, label, evidence }}
 */
function compute(entity, projections, opts = {}) {
    const { relationshipCount = 0 } = opts;

    // Detect external entities (Supabase, EXTERNAL, http) — not scored the same way
    const rawPath = (entity.path || '').trim();
    const isExternal = rawPath.startsWith('Supabase') || rawPath.startsWith('EXTERNAL') || rawPath.startsWith('http');
    if (isExternal) {
        return {
            score:      null,
            confidence: null,
            label:      'external',
            evidence:   [],
        };
    }

    const signals = [];

    // Projection signals
    for (const p of projections) {
        const cfg = EVIDENCE[p.projection];
        if (!cfg) continue;
        if (p.status === 'SKIP') continue;

        const value = STATUS_VALUE[p.status] !== undefined ? STATUS_VALUE[p.status] : null;
        if (value === null) continue;

        signals.push({
            source:     p.projection,
            weight:     cfg.weight,
            value,
            status:     p.status,
            confidence: p.confidence || (p.status === 'SYNC' ? 1.0 : 0.0),
        });
    }

    if (signals.length === 0) {
        return { score: 0, confidence: 0, label: 'unknown', evidence: [] };
    }

    const totalWeight   = signals.reduce((s, sig) => s + sig.weight, 0);
    const weightedSum   = signals.reduce((s, sig) => s + sig.weight * sig.value, 0);
    const rawScore      = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const score         = Math.round(rawScore * 100);
    const confidence    = parseFloat((signals.length / Object.keys(EVIDENCE).length).toFixed(2));

    // Physical DRIFT always forces missing regardless of other signals
    const physSignal = signals.find(s => s.source === 'physical');
    const label = (physSignal && physSignal.status === 'DRIFT') ? 'missing' : _label(score);

    return { score, confidence, label, evidence: signals };
}

module.exports = { compute, EVIDENCE };
