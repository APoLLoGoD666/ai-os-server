'use strict';
// lib/epistemics/epistemic-protocol-registry.js
// T3-P3: EpistemicProtocol Bootstrap Registry (RT09-STATE-07).
//
// Authority: APEX-CONSTITUTION-v1.0; R9-v1.0 RS-07 RS-10 RS-12; D6 §4.3 AIR-2;
//            D3 Epistemic Chain Stages 2–5; T3-P3-PHASE-0-AUDIT.md (AUTHORIZED).
//
// Bootstraps 36 EpistemicProtocol records: 3 types × 12 constitutional domains.
// Protocol types: INTERPRETATION (T3-10/EvidenceObject), INFERENCE (T3-10B/InterpretationRecord),
//                 VALIDATION (T3-10D/KnowledgeClaim).
//
// CONSTITUTIONAL LIMITATIONS (T3-P3-PHASE-0-AUDIT.md §L-01 through L-04):
// L-01: Registration authority constitutionally undefined (R9-v1.0 RS-12 Open Question).
//       Bootstrap proceeds under same pre-constitutional basis as T3-06 and T3-08.
// L-02: In-memory only. No write to constitutional_records. Re-registers on each
//       server start. Persistence deferred until RS-12 registration authority defined.
// L-03: Single version (1.0). No versioning mechanism implemented. Supersession
//       deferred to operational RT-09.
// L-04: Generic methodology. No domain-specific interpretation rules. Domain-specific
//       rules deferred until constitutional amendment defines registration authority.
//
// Storage: runtime-local (in-memory Map). Re-registration on each server start.

const { EpistemicProtocol } = require('../constitutional-types/knowledge-record');
const { DOMAIN_MAP }         = require('../../civilisation/domain-loader');

// ── Descriptions ───────────────────────────────────────────────────────────────
// Source: D6 §4.3 AIR-2; D3 Epistemic Chain; R9-v1.0 RS-12.

const DESCRIPTION = Object.freeze({
    INTERPRETATION:
        'Bootstrap APEX interpretation protocol applied to Observation Projections during ' +
        'EvidenceObject formation (D3 Epistemic Chain Stage 2; D5 §3.2 Stage 4; RT09-PROC-01). ' +
        'Applies D6 §4.3 AIR-2 obligations: registered versioned protocol; version recorded; ' +
        'no distortion toward expected results; interpretive disagreements escalated. ' +
        'Registration authority constitutionally undefined (R9-v1.0 RS-12 Open Question).',

    INFERENCE:
        'Bootstrap APEX inference protocol applied to EvidenceObject records during ' +
        'InterpretationRecord formation (D3 Epistemic Chain Stage 3; RT09-PROC-02). ' +
        'Applies inferential reasoning to Evidence while preserving epistemic uncertainty ' +
        'and detecting contradictions per RT09-INV-3. ' +
        'Registration authority constitutionally undefined (R9-v1.0 RS-12 Open Question).',

    VALIDATION:
        'Bootstrap APEX validation protocol applied at KnowledgeClaim EP-T4 gate ' +
        '(D3 Epistemic Chain Stage 5; D3 EP-T4). Gate conditions: ' +
        'confirmations >= MIN_CONFIRMATIONS && confidence >= MIN_CONFIDENCE && ' +
        'contradictions.length === 0. ' +
        'Registration authority constitutionally undefined (R9-v1.0 RS-12 Open Question).',
});

// TYPE_CODE maps protocol_type enum to the 5-char code used in protocol_id.
const TYPE_CODE = Object.freeze({
    INTERPRETATION: 'INTERP',
    INFERENCE:      'INFER',
    VALIDATION:     'VALID',
});

// ── Registry ───────────────────────────────────────────────────────────────────

const _registry = new Map(); // protocol_id → frozen EpistemicProtocol record

// ── Bootstrap ──────────────────────────────────────────────────────────────────

function _bootstrap() {
    const timestamp = new Date().toISOString();

    for (const domainId of Object.keys(DOMAIN_MAP)) {
        for (const protocolType of ['INTERPRETATION', 'INFERENCE', 'VALIDATION']) {
            const protocolId = `EP-${domainId}-${TYPE_CODE[protocolType]}-v1.0`;

            const record = {
                protocol_id:          protocolId,
                protocol_version:     '1.0',
                protocol_type:        protocolType,
                protocol_description: DESCRIPTION[protocolType],
                registration_status:  'CURRENT',
                registration_timestamp: timestamp,
            };

            const { valid, errors } = EpistemicProtocol.validate(record);
            if (!valid) {
                throw new Error(
                    `EpistemicProtocol bootstrap validation failed for ${protocolId}: ${errors.join('; ')}`
                );
            }

            if (_registry.has(protocolId)) {
                throw new Error(
                    `EpistemicProtocol bootstrap: duplicate protocol_id '${protocolId}'`
                );
            }

            _registry.set(protocolId, Object.freeze(record));
        }
    }
}

_bootstrap();

// ── Query API ──────────────────────────────────────────────────────────────────

function getProtocol(protocolId) {
    return _registry.get(protocolId) ?? null;
}

function getProtocolForDomain(domainId, protocolType) {
    if (typeof domainId !== 'string' || typeof protocolType !== 'string') return null;
    const code = TYPE_CODE[protocolType];
    if (!code) return null;
    return _registry.get(`EP-${domainId}-${code}-v1.0`) ?? null;
}

function listProtocols() {
    return Array.from(_registry.values());
}

function listByType(protocolType) {
    return Array.from(_registry.values()).filter(p => p.protocol_type === protocolType);
}

function listByDomain(domainId) {
    if (typeof domainId !== 'string') return [];
    return Array.from(_registry.values()).filter(p => p.protocol_id.startsWith(`EP-${domainId}-`));
}

function isRegistered(protocolId) {
    return _registry.has(protocolId);
}

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    getProtocol,
    getProtocolForDomain,
    listProtocols,
    listByType,
    listByDomain,
    isRegistered,
    PROTOCOL_TYPES: Object.freeze(['INTERPRETATION', 'INFERENCE', 'VALIDATION']),
    TYPE_CODE,
});
