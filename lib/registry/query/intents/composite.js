'use strict';
module.exports = function registerCompositeIntents(register) {
    register(
        'composite.entity_full',
        'Everything about one entity in a single call: record, all projections, health score, relationships, and impact summary',
        {
            id:           'ENT-NNNNNN (required)',
            impact_depth: 'number (default 3)',
        },
        ({ id, impact_depth = 3 }) => {
            if (!id) throw new Error('id is required');

            const engine    = require('../../engine');
            const proj      = require('../../projections');
            const rels      = require('../../relationships');
            const impactMod = require('../../impact');
            const healthMod = require('../../health-score');

            const e = engine.lookup(id);
            if (!e) throw new Error(`Not found: ${id}`);

            const capsMod     = require('../../capabilities');
            const projections = proj.checkAllProjections(e);
            const outgoing    = rels.relationsOf(id);
            const incoming    = rels.reverseRelationsOf(id);
            const capRole     = capsMod.degradationFrom(id);
            const health      = healthMod.compute(e, projections, {
                relationshipCount: outgoing.length + incoming.length,
                capabilityRole:    capRole.affected_count > 0 ? capRole : null,
            });
            const impactReport = impactMod.analyze(id, { depth: parseInt(impact_depth), direction: 'upstream' });

            return {
                entity: e,
                projections,
                health: {
                    label:          health.label,
                    score:          health.score,
                    confidence:     health.confidence,
                    evidence:       health.evidence,
                    capability_role: capRole.affected_count > 0 ? {
                        worst_severity: capRole.worst_severity,
                        affected_count: capRole.affected_count,
                        capabilities:   capRole.affected.map(a => ({ id: a.capability_id, name: a.name, severity: a.severity })),
                    } : null,
                },
                relationships: {
                    outgoing,
                    incoming,
                },
                impact: impactReport ? {
                    blast_radius:   impactReport.blast_radius,
                    risk_level:     impactReport.risk_level,
                    top_dependents: impactReport.affected.direct.slice(0, 5),
                    migrations:     impactReport.affected.migrations,
                } : null,
            };
        }
    );

    register(
        'composite.system_health',
        'System-wide health summary: capability overview first, then health distribution, drift counts, high-risk entities, migration compliance',
        {},
        () => {
            const engine    = require('../../engine');
            const proj      = require('../../projections');
            const ml        = require('../../migration-lifecycle');
            const impactMod = require('../../impact');
            const healthMod = require('../../health-score');
            const capsMod   = require('../../capabilities');

            const all        = engine.all();
            const compliance = ml.complianceReport();
            const capReport  = capsMod.fullReport();
            const healthDist = { active: 0, present: 0, degraded: 0, inactive: 0, missing: 0, external: 0, unknown: 0 };
            const driftCount = { physical: 0, runtime: 0, documentation: 0, monitoring: 0, knowledge: 0 };
            const highRisk   = [];

            for (const e of all) {
                // Skip external entities cheaply
                const rawPath = (e.path || '').trim();
                if (rawPath.startsWith('Supabase') || rawPath.startsWith('EXTERNAL') || rawPath.startsWith('http')) {
                    healthDist.external++;
                    continue;
                }

                const projections = proj.checkAllProjections(e);
                const health      = healthMod.compute(e, projections);
                const label       = health.label || 'unknown';
                healthDist[label] = (healthDist[label] || 0) + 1;

                for (const p of projections) {
                    if (p.status === 'DRIFT' && driftCount[p.projection] !== undefined) {
                        driftCount[p.projection]++;
                    }
                }

                const risk = impactMod.quickRisk(e.id);
                if (risk === 'CRITICAL' || risk === 'HIGH') {
                    highRisk.push({ id: e.id, name: e.name, family: e.family, type: e.type, risk_level: risk });
                }
            }

            return {
                // Capability layer — leads the response
                capabilities: {
                    summary: capReport.summary,
                    status:  capReport.capabilities.map(c => ({
                        id:          c.id,
                        name:        c.name,
                        criticality: c.criticality,
                        status:      c.status,
                        issues:      c.issues.length,
                    })),
                },
                total_entities: all.length,
                health_distribution: healthDist,
                drift_summary: driftCount,
                high_risk_entities: highRisk
                    .sort((a, b) => (a.risk_level === 'CRITICAL' ? -1 : 1))
                    .slice(0, 20),
                migration_compliance: {
                    governed:       compliance.governed,
                    ungoverned:     compliance.ungoverned,
                    total:          compliance.total,
                    compliance_pct: compliance.compliance,
                },
            };
        }
    );

    register(
        'composite.capability_health',
        'Capability-first system view — all 8 named capabilities with status, issues, and optional entity breakdown',
        { include_entities: 'boolean (default false) — include full dependency list per capability' },
        ({ include_entities }) => {
            const capsMod = require('../../capabilities');
            const engine  = require('../../engine');
            const report  = capsMod.fullReport();

            return {
                summary: report.summary,
                capabilities: report.capabilities.map(cap => {
                    const def = capsMod.getCapability(cap.id);
                    const out = {
                        id:           cap.id,
                        name:         cap.name,
                        criticality:  cap.criticality,
                        status:       cap.status,
                        entity_count: cap.entity_count,
                        healthy_deps: cap.healthy_deps,
                        issues:       cap.issues,
                    };
                    if (include_entities === 'true' || include_entities === true) {
                        out.dependencies = (def?.depends_on || []).map(dep => {
                            const e = engine.lookup(dep.id);
                            return {
                                id:       dep.id,
                                name:     e?.name   || null,
                                status:   e?.status || null,
                                strength: dep.strength,
                                reason:   dep.reason,
                            };
                        });
                    }
                    return out;
                }),
            };
        }
    );
};
