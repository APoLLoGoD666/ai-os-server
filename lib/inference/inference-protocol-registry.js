'use strict';
// lib/inference/inference-protocol-registry.js
// T3-P4: InferenceProtocol Bootstrap Registry (RT10-STATE-02).
//
// Authority: APEX-CONSTITUTION-v1.0; R10-v1.1-canonical.md RS-10.2 RT10-INV-3;
//            D-2 §VII (interpretability); D6 §4.3 AIR-2;
//            T3-P4-PHASE-0-AUDIT.md (AUTHORIZED).
//
// Bootstraps 12 InferenceProtocol records: one per constitutional domain.
// Consumer: DomainUnderstandingModel.inference_protocol_ref (RT10-INV-3).
//
// CONSTITUTIONAL LIMITATIONS (T3-P4-PHASE-0-AUDIT.md §L-01 through L-04):
// L-01: Registration authority constitutionally undefined (R10-v1.1 RS-10.2;
//       R9-v1.0 RS-12 Open Question). Bootstrap proceeds under same
//       pre-constitutional basis as T3-P3 (EpistemicProtocol), T3-06, T3-08.
// L-02: In-memory only. No write to constitutional_records. Re-registers on
//       each server start. Persistence deferred until RS-10.2/RS-12 resolved.
// L-03: Single version (1.0). No versioning mechanism implemented. Supersession
//       deferred to operational RT-10.
// L-04: Generic methodology. No domain-specific inference rules. Domain-specific
//       rules deferred until constitutional amendment defines registration authority.
//
// Storage: runtime-local (in-memory Map). Re-registration on each server start.

const { InferenceProtocol } = require('../constitutional-types/learning-record');
const { DOMAIN_MAP }         = require('../../civilisation/domain-loader');

// ── Description ────────────────────────────────────────────────────────────────
// Source: D-2 §VII (interpretability); D6 §4.3 AIR-2; R10-v1.1 RS-10.2;
//         RT10-INV-3; R9-v1.0 RS-12.

const PROTOCOL_DESCRIPTION =
    'Bootstrap APEX inference protocol applied to Knowledge Records during ' +
    'DomainUnderstandingModel formation (R10-v1.1-canonical.md RT10-PROC-01 Step 1; ' +
    'RT10-INV-3: only registered InferenceProtocols may be applied to DUM formation). ' +
    'Applies D6 §4.3 AIR-2 obligations: registered versioned protocol; version recorded ' +
    'in every DomainUnderstandingModel; no suppression of interpretive uncertainty. ' +
    'D-2 §VII interpretability obligation: protocol methodology is documented and its ' +
    'operation interpretable. ' +
    'Registration authority constitutionally undefined (R10-v1.1 RS-10.2; R9-v1.0 RS-12 Open Question).';

// ── Registry ───────────────────────────────────────────────────────────────────

const _registry = new Map(); // protocol_id → frozen InferenceProtocol record

// ── Bootstrap ──────────────────────────────────────────────────────────────────

function _bootstrap() {
    const timestamp = new Date().toISOString();

    for (const domainId of Object.keys(DOMAIN_MAP)) {
        const protocolId = `IP-${domainId}-v1.0`;

        const record = {
            protocol_id:            protocolId,
            protocol_version:       '1.0',
            protocol_description:   PROTOCOL_DESCRIPTION,
            registration_status:    'CURRENT',
            registration_timestamp: timestamp,
        };

        const { valid, errors } = InferenceProtocol.validate(record);
        if (!valid) {
            throw new Error(
                `InferenceProtocol bootstrap validation failed for ${protocolId}: ${errors.join('; ')}`
            );
        }

        if (_registry.has(protocolId)) {
            throw new Error(
                `InferenceProtocol bootstrap: duplicate protocol_id '${protocolId}'`
            );
        }

        _registry.set(protocolId, Object.freeze(record));
    }
}

_bootstrap();

// ── Query API ──────────────────────────────────────────────────────────────────

function getProtocol(protocolId) {
    return _registry.get(protocolId) ?? null;
}

function getProtocolForDomain(domainId) {
    if (typeof domainId !== 'string') return null;
    return _registry.get(`IP-${domainId}-v1.0`) ?? null;
}

function listProtocols() {
    return Array.from(_registry.values());
}

function isRegistered(protocolId) {
    return _registry.has(protocolId);
}

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    getProtocol,
    getProtocolForDomain,
    listProtocols,
    isRegistered,
});
