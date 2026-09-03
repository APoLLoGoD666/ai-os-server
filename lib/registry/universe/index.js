'use strict';
// lib/registry/universe/index.js — Inject all civilisation universe entities into the live graph.
//
// Injects DOM-* (domains), AGT-* (agents), SVC-* (services) as first-class
// graph nodes alongside ENT-* and CAP-*. All existing graph operations work
// on these entities immediately after injection.
//
// Called once from lib/registry/index.js after capability-graph.inject().

const { DOMAINS, DOMAIN_EDGES }              = require('./domain-entities');
const { buildAgentEntities, buildAgentEdges } = require('./agent-entities');
const { SERVICES, buildServiceEdges }         = require('./service-entities');

// RT-15 DomainAuthorityRecord + DomainProfile wiring (W2-06)
const { DomainAuthorityRecord, DomainProfile } = require('../../constitutional-types/domain-profile');
const constitutionalStore = require('../../runtime/constitutional-store');

let _injected = false;

function inject() {
    if (_injected) return;
    _injected = true;

    const engine = require('../engine');
    const rels   = require('../relationships');

    // ── Inject all synthetic entities ────────────────────────────────────────
    const allEntities = [
        ...DOMAINS,
        ...buildAgentEntities(),
        ...SERVICES,
    ];
    engine.inject(allEntities);

    // ── Add inter-entity edges ────────────────────────────────────────────────
    const allEdges = [
        ...DOMAIN_EDGES,
        ...buildAgentEdges(),
        ...buildServiceEdges(),
    ];

    for (const edge of allEdges) {
        try {
            rels.add(edge.from, edge.to, edge.type, edge.label || '', 'required', '');
        } catch (_) { /* duplicate edges are silently skipped */ }
    }

    // RT-15 DomainAuthorityRecord + DomainProfile — fire-and-forget (W2-06; CONSTITUTIONAL WIRING PATTERN V1.0)
    setImmediate(async () => {
        const _ts = new Date().toISOString();
        for (const dom of DOMAINS) {
            try {
                const _darId = 'dar-' + dom.id;
                const dar = DomainAuthorityRecord.create({
                    dar_id:                  _darId,
                    domain_id:               dom.id,
                    air_1_authority_holders: [],
                    air_2_authority_holders: [],
                    air_3_authority_holders: [],
                    air_4_authority_holders: [],
                    air_5_authority_holders: [],
                    air_compliance_status:   'NOT_ESTABLISHED',
                    last_updated_at:         _ts,
                });
                await constitutionalStore.write(dar);
                const dp = DomainProfile.create({
                    domain_profile_id:       'dp-' + dom.id,
                    domain_id:               dom.id,
                    domain_name:             dom.name,
                    reality_context:         dom.description,
                    internal_representation: dom.purpose,
                    authority_record_ref:    _darId,
                    knowledge_status:        'NOT_ESTABLISHED',
                    projection_status:       'NOT_ESTABLISHED',
                    last_updated_at:         _ts,
                });
                await constitutionalStore.write(dp);
            } catch (err) {
                console.error('[constitutional-record] RT-15 ' + dom.id + ' failed:', err?.message);
            }
        }
    });
}

module.exports = { inject };
