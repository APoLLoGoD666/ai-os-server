'use strict';

// SRE — Synthetic Evidence Store
// ALL writes go to data/synthetic/evidence/ via Node.js fs.
// NEVER writes to Supabase, production tables, governance chains, or production logs.
// Isolation contract: no production module imports.

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const { assertSyntheticMode } = require('./execution-mode');

const EVIDENCE_DIR = path.resolve(__dirname, '../../data/synthetic/evidence');
const INDEX_FILE   = path.join(EVIDENCE_DIR, '_index.json');

function _ensureDir() {
    if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function _loadIndex() {
    _ensureDir();
    if (!fs.existsSync(INDEX_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch { return []; }
}

function _saveIndex(idx) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(idx, null, 2), 'utf8');
}

/**
 * Store one evidence record for a completed synthetic run.
 * Returns { evidenceId, file }.
 */
function storeEvidence(mode, record) {
    assertSyntheticMode(mode, 'SyntheticEvidenceStore.storeEvidence');
    _ensureDir();

    const ts         = Date.now();
    const evidenceId = `SRE-${record.scenarioId}-${ts}`;
    const file       = path.join(EVIDENCE_DIR, `${evidenceId}.json`);

    const definitionHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(record.scenarioDefinition ?? {}))
        .digest('hex')
        .slice(0, 16);

    const payload = Object.assign({}, record, {
        _evidenceId:      evidenceId,
        _storedAt:        new Date(ts).toISOString(),
        _definitionHash:  definitionHash,
        _isolationProof:  'data/synthetic/evidence — no Supabase writes',
    });

    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');

    const idx = _loadIndex();
    idx.push({ evidenceId, file, scenarioId: record.scenarioId, storedAt: payload._storedAt, level: record.level });
    _saveIndex(idx);

    return { evidenceId, file };
}

/**
 * Load all evidence records for a given scenarioId.
 */
function loadEvidence(mode, scenarioId) {
    assertSyntheticMode(mode, 'SyntheticEvidenceStore.loadEvidence');
    _ensureDir();
    return _loadIndex()
        .filter(e => e.scenarioId === scenarioId)
        .map(e => {
            try { return JSON.parse(fs.readFileSync(e.file, 'utf8')); } catch { return null; }
        })
        .filter(Boolean);
}

/**
 * List the full index of stored evidence.
 */
function listEvidence(mode) {
    assertSyntheticMode(mode, 'SyntheticEvidenceStore.listEvidence');
    return _loadIndex();
}

/**
 * Load a single evidence record by evidenceId.
 */
function getEvidence(mode, evidenceId) {
    assertSyntheticMode(mode, 'SyntheticEvidenceStore.getEvidence');
    _ensureDir();
    const file = path.join(EVIDENCE_DIR, `${evidenceId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { storeEvidence, loadEvidence, listEvidence, getEvidence };
