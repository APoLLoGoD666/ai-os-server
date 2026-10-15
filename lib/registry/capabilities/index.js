'use strict';
// lib/registry/capabilities.js — Capability Reasoning Layer (Phase F)
//
// Capabilities are named collections of entities that together deliver
// a business or architectural function (Authentication, AI Reasoning, etc.).
//
// This layer answers questions that the entity graph cannot:
//   "What capabilities degrade if ENT-001130 fails?"
//   "What is the current operational status of Authentication?"
//   "Which capabilities are at risk system-wide?"
//
// Each capability dependency has:
//   strength: 'required' | 'optional' | 'fallback'
//   reason:   why this entity is part of the capability
//
// Severity mapping when an entity fails:
//   required dep fails in CRITICAL capability → CRITICAL
//   required dep fails in HIGH capability     → HIGH
//   required dep fails in MEDIUM capability   → MEDIUM
//   required dep fails in LOW capability      → LOW
//   optional dep fails                        → REDUCED (one step below capability criticality)
//   fallback dep fails                        → MINIMAL (only matters if primary also fails)

const CAPS = require('./capabilities.json');
const { RegistryContext } = require('../context');

// ── Severity helpers ──────────────────────────────────────────────────────────

const CRITICALITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'];

function _degradedSeverity(capCriticality, depStrength) {
    if (depStrength === 'fallback') return 'MINIMAL';
    if (depStrength === 'optional') {
        const idx = CRITICALITY_ORDER.indexOf(capCriticality);
        return CRITICALITY_ORDER[Math.min(idx + 1, CRITICALITY_ORDER.length - 1)];
    }
    return capCriticality;   // required → full capability criticality
}

// ── Entity health check ───────────────────────────────────────────────────────
// Quick health check using registry status field (no projection overhead).
// Returns 'healthy' | 'degraded' | 'down' | 'unknown'

const HEALTHY_STATUSES  = new Set(['ACTIVE', 'Production', 'Active', 'production', 'PRODUCTION']);
const DOWN_STATUSES     = new Set(['INACTIVE', 'DECOMMISSIONED', 'REMOVED', 'DEPRECATED', 'Decommissioned']);

function _entityHealth(entity) {
    if (!entity) return 'unknown';
    if (HEALTHY_STATUSES.has(entity.status)) return 'healthy';
    if (DOWN_STATUSES.has(entity.status))    return 'down';
    return 'degraded';
}

// ── Public API ────────────────────────────────────────────────────────────────

/** All capability definitions. */
function all() {
    return Object.entries(CAPS).map(([id, cap]) => ({
        id,
        name:        cap.name,
        description: cap.description,
        criticality: cap.criticality,
        arch_refs:   cap.arch_refs || [],
        entity_count: cap.depends_on.length,
    }));
}

/** Get a single capability definition by id. */
function getCapability(id) {
    const cap = CAPS[id];
    if (!cap) return null;
    return { id, ...cap };
}

/**
 * Compute the operational status of a capability.
 * Checks all entity dependencies against their registry status.
 *
 * @param {string} capabilityId
 * @param {ProjectedGraph} [graph]  — optional projected graph for hypothetical evaluation
 * @returns {{ id, name, status: 'OPERATIONAL'|'DEGRADED'|'DOWN'|'UNKNOWN', issues, entity_count }}
 */
function statusOf(capabilityId, graph, ctx = RegistryContext) {
    const cap = CAPS[capabilityId];
    if (!cap) return null;

    const _lookup = graph ? id => graph.lookup(id) : ctx.engine.lookup.bind(ctx.engine);
    const issues = [];
    let worstStatus = 'OPERATIONAL';
    let confidence  = 1.0;

    for (const dep of cap.depends_on) {
        const entity = _lookup(dep.id);
        const health = _entityHealth(entity);

        // Confidence propagation: required deps multiply the capability confidence
        if (dep.strength === 'required') {
            const hConf = health === 'healthy' ? 1.0 : health === 'down' ? 0.3 : health === 'degraded' ? 0.7 : 0.5;
            confidence *= hConf;
        }

        if (health === 'unknown') {
            issues.push({ id: dep.id, name: null, strength: dep.strength, reason: dep.reason, health: 'unknown', detail: 'Not found in registry' });
            if (dep.strength === 'required' && worstStatus === 'OPERATIONAL') worstStatus = 'DEGRADED';
            continue;
        }

        if (health === 'down') {
            const impact = dep.strength === 'required' ? 'DOWN'
                         : dep.strength === 'optional' ? 'DEGRADED'
                         : 'OPERATIONAL';
            issues.push({ id: dep.id, name: entity.name, strength: dep.strength, reason: dep.reason, health: 'down', detail: `status: ${entity.status}`, capability_impact: impact });
            if (impact === 'DOWN')     worstStatus = 'DOWN';
            else if (impact === 'DEGRADED' && worstStatus !== 'DOWN') worstStatus = 'DEGRADED';
        } else if (health === 'degraded') {
            if (dep.strength === 'required' && worstStatus === 'OPERATIONAL') worstStatus = 'DEGRADED';
            issues.push({ id: dep.id, name: entity.name, strength: dep.strength, reason: dep.reason, health: 'degraded', detail: `status: ${entity.status}`, capability_impact: 'DEGRADED' });
        }
    }

    return {
        id:           capabilityId,
        name:         cap.name,
        criticality:  cap.criticality,
        status:       worstStatus,
        confidence:   parseFloat(confidence.toFixed(3)),
        issues,
        entity_count: cap.depends_on.length,
        healthy_deps: cap.depends_on.length - issues.length,
    };
}

/**
 * Which capabilities degrade if entity X fails?
 * Core intelligence function — translates entity-level impact into capability-level meaning.
 *
 * @param {string} entityId
 * @returns {{ entity_id, affected: [{ capability_id, name, criticality, severity, strength, reason }] }}
 */
function degradationFrom(entityId) {
    const affected = [];

    for (const [capId, cap] of Object.entries(CAPS)) {
        const dep = cap.depends_on.find(d => d.id === entityId);
        if (!dep) continue;

        const severity = _degradedSeverity(cap.criticality, dep.strength);
        affected.push({
            capability_id: capId,
            name:          cap.name,
            criticality:   cap.criticality,
            severity,
            strength:      dep.strength,
            reason:        dep.reason,
            evidence: [{
                source:      'capabilities.json',
                derived_from: 'lib/registry/capabilities.json',
                confidence:   1.0,
                declaration: `${capId}.depends_on[${entityId}] strength=${dep.strength}`,
                note:         dep.reason,
            }],
        });
    }

    // Sort: CRITICAL first, then HIGH, MEDIUM, LOW, MINIMAL
    affected.sort((a, b) => CRITICALITY_ORDER.indexOf(a.severity) - CRITICALITY_ORDER.indexOf(b.severity));

    const worstSeverity = affected.length ? affected[0].severity : null;

    return {
        entity_id:      entityId,
        affected_count: affected.length,
        worst_severity: worstSeverity,
        affected,
    };
}

/**
 * System-wide capability status report.
 * Shows which capabilities are OPERATIONAL, DEGRADED, or DOWN right now.
 *
 * @param {ProjectedGraph} [graph]  — optional projected graph for hypothetical evaluation
 * @returns {{ capabilities: [...statusOf results], summary }}
 */
function fullReport(graph, ctx = RegistryContext) {
    const capabilities = Object.keys(CAPS).map(id => statusOf(id, graph, ctx));
    const summary = {
        operational: capabilities.filter(c => c.status === 'OPERATIONAL').length,
        degraded:    capabilities.filter(c => c.status === 'DEGRADED').length,
        down:        capabilities.filter(c => c.status === 'DOWN').length,
        unknown:     capabilities.filter(c => c.status === 'UNKNOWN').length,
        total:       capabilities.length,
    };
    return { summary, capabilities };
}

module.exports = { all, getCapability, statusOf, degradationFrom, fullReport };
