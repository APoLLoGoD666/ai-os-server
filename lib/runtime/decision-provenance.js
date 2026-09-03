'use strict';
// lib/runtime/decision-provenance.js
// Decision provenance — reconstructs complete decision ancestry from pipeline stages.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// No imports. Pure functions on caller-supplied pre-computed data.
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No caches. No persistence. No hidden state.
//   C. No mutation of inputs. No shared references.
//   D. Deterministic: same input → same output.
//   E. All outputs deep-frozen.
//   F. generatedAt = null always.
//   G. authorityLevel: 'NONE' always.
//
// Exports ONLY:
//   buildProvenance(input)  → frozen provenanceSnapshot
//   createContext()         → frozen provenance context descriptor

const PROVENANCE_VERSION = '1.0.0';

const STAGES = Object.freeze([
    'execution', 'benchmark', 'counterfactual', 'registry',
    'lineage', 'improvement', 'strategy', 'resource', 'learning', 'adaptation',
]);

const STAGE_INPUT_KEYS = Object.freeze({
    execution:     'replay',
    benchmark:     'benchmark',
    counterfactual:'counterfactual',
    registry:      'registry',
    lineage:       'lineage',
    improvement:   'improvement',
    strategy:      'strategy',
    resource:      'resource',
    learning:      'learning',
    adaptation:    'adaptation',
});

const STAGE_ARTIFACT_PREFIXES = Object.freeze({
    execution:     'REPLAY',
    benchmark:     'BM',
    counterfactual:'CF',
    registry:      'REG',
    lineage:       'LIN',
    improvement:   'IMP',
    strategy:      'STR',
    resource:      'RES',
    learning:      'LED',
    adaptation:    'SIM',
});

// ── Deep freeze ───────────────────────────────────────────────────────────────

function _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) _deepFreeze(obj[i]);
    } else {
        for (const key of Object.keys(obj)) _deepFreeze(obj[key]);
    }
    return obj;
}

// ── Deterministic hash ────────────────────────────────────────────────────────

function _djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

function _canon(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(_canon).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

// ── Artifact ID extraction ────────────────────────────────────────────────────

function _extractArtifactId(stage, stageData) {
    const prefix = STAGE_ARTIFACT_PREFIXES[stage];
    if (!stageData || typeof stageData !== 'object') return `${prefix}-unknown`;

    // Try common hash/id fields in priority order
    const candidates = [
        stageData.replayHash, stageData.benchmarkHash, stageData.counterfactualHash,
        stageData.registryHash, stageData.lineageHash, stageData.improvementHash,
        stageData.strategyHash, stageData.planHash, stageData.ledgerHash,
        stageData.simulationHash, stageData.id,
    ];
    for (const c of candidates) {
        if (c && typeof c === 'string') return `${prefix}-${c}`;
    }
    return `${prefix}-unknown`;
}

// ── Ancestry construction ─────────────────────────────────────────────────────

function _buildAncestry(safeInput) {
    return STAGES.map((stage, index) => {
        const key       = STAGE_INPUT_KEYS[stage];
        const stageData = safeInput[key] || null;
        const present   = stageData !== null && typeof stageData === 'object';
        const artifact  = present ? _extractArtifactId(stage, stageData) : null;

        return _deepFreeze({
            stage,
            order:    index + 1,
            present,
            artifact,
        });
    });
}

// ── Critical transitions ──────────────────────────────────────────────────────

function _buildCriticalTransitions(ancestry) {
    const transitions = [];
    for (let i = 0; i < ancestry.length - 1; i++) {
        if (ancestry[i].present && ancestry[i + 1].present) {
            transitions.push(_deepFreeze({
                from:  ancestry[i].stage,
                to:    ancestry[i + 1].stage,
                order: i + 1,
            }));
        }
    }
    return _deepFreeze(transitions);
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        provenanceVersion:  PROVENANCE_VERSION,
        provenanceFields:   Object.freeze([
            'version', 'decisionId', 'provenanceHash', 'ancestry',
            'criticalTransitions', 'reconstructionScore', 'missingEvidence',
            'fullyExplained', 'stageCount', 'presentCount',
            'generatedAt', 'authorityLevel', 'descriptiveOnly', 'deterministic',
        ]),
        fieldCount:         14,
        stageCount:         STAGES.length,
        stages:             Object.freeze(STAGES.slice()),
        authorityLevel:     'NONE',
        deterministic:      true,
        descriptiveOnly:    true,
        runtimeIntegrated:  false,
        executionInfluence: false,
        createdAt:          null,
    });
}

function buildProvenance(input) {
    const safeInput = (input !== null && typeof input === 'object') ? input : {};

    const ancestry            = _buildAncestry(safeInput);
    const criticalTransitions = _buildCriticalTransitions(ancestry);

    const presentCount        = ancestry.filter(a => a.present).length;
    const reconstructionScore = parseFloat((presentCount / STAGES.length).toFixed(6));
    const missingEvidence     = _deepFreeze(ancestry.filter(a => !a.present).map(a => a.stage));
    const fullyExplained      = missingEvidence.length === 0;

    const decisionId   = 'D-' + _djb2(_canon(ancestry.map(a => a.artifact)));
    const provenanceHash = _djb2(_canon({ decisionId, ancestry: ancestry.map(a => ({ stage: a.stage, artifact: a.artifact })) }));

    return _deepFreeze({
        version:              PROVENANCE_VERSION,
        decisionId,
        provenanceHash,
        ancestry:             _deepFreeze(ancestry),
        criticalTransitions,
        reconstructionScore,
        missingEvidence,
        fullyExplained,
        stageCount:           STAGES.length,
        presentCount,
        generatedAt:          null,
        authorityLevel:       'NONE',
        descriptiveOnly:      true,
        deterministic:        true,
    });
}

module.exports = { buildProvenance, createContext };
