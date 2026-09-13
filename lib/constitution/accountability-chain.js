'use strict';
// lib/constitution/accountability-chain.js — Append-only hash-chained accountability log

const fs   = require('fs');
const path = require('path');
const logger = require('../logger');

const CHAIN_PATH = path.join(__dirname, 'accountability-chain.json');

const EVENT_TYPES = {
    CERTIFICATION_FAILURE: 'CERTIFICATION_FAILURE',
    CRISIS_TRANSITION:     'CRISIS_TRANSITION',
    AMENDMENT_PROPOSED:    'AMENDMENT_PROPOSED',
    AMENDMENT_APPROVED:    'AMENDMENT_APPROVED',
    AMENDMENT_ACTIVATED:   'AMENDMENT_ACTIVATED',
    ATTACK_DETECTED:       'ATTACK_DETECTED',
    STEWARD_ESCALATION:    'STEWARD_ESCALATION',
    DECISION_DEFERRED:     'DECISION_DEFERRED',
    OVERSIGHT_TICK:        'OVERSIGHT_TICK',
    RECOVERY:              'RECOVERY',
};

function _fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
}

function _chainHash(seq, eventType, payload, prevHash) {
    return _fnv(`${seq}:${eventType}:${JSON.stringify(payload)}:${prevHash}`);
}

function _loadChain() {
    if (!fs.existsSync(CHAIN_PATH)) return [];
    try { return JSON.parse(fs.readFileSync(CHAIN_PATH, 'utf8')); }
    catch { return []; }
}

function _saveChain(chain) {
    fs.writeFileSync(CHAIN_PATH, JSON.stringify(chain, null, 2), 'utf8');
}

function record(eventType, payload = {}) {
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
        throw new Error(`Unknown accountability event type: ${eventType}`);
    }
    const chain    = _loadChain();
    const seq      = chain.length;
    const prevHash = seq === 0 ? '00000000' : chain[seq - 1].chainHash;
    const hash     = _chainHash(seq, eventType, payload, prevHash);

    const entry = { seq, eventType, payload, timestamp: new Date().toISOString(), prevHash, chainHash: hash };
    chain.push(entry);
    _saveChain(chain);
    logger.info('accountability-chain', 'event recorded', { seq, eventType });
    return entry;
}

function getChain() { return _loadChain(); }

// Returns entries sorted by seq — proof of chronological order
function reconstruct() {
    const chain   = _loadChain();
    const ordered = [...chain].sort((a, b) => a.seq - b.seq);
    return { entries: ordered, count: ordered.length };
}

// Returns {intact, gaps, tampered, count}
function verify() {
    const chain    = _loadChain();
    const gaps     = [];
    const tampered = [];
    let prevHash   = '00000000';

    for (let i = 0; i < chain.length; i++) {
        const entry = chain[i];
        if (entry.seq !== i) gaps.push({ expected: i, found: entry.seq });

        const expected = _chainHash(entry.seq, entry.eventType, entry.payload, prevHash);
        if (entry.chainHash !== expected) {
            tampered.push({ seq: entry.seq, expected, found: entry.chainHash });
        }
        prevHash = entry.chainHash;
    }

    return { intact: gaps.length === 0 && tampered.length === 0, gaps, tampered, count: chain.length };
}

// Directly write raw chain (for tampering tests only)
function _writeRaw(chain) { _saveChain(chain); }

function clear() { _saveChain([]); }

module.exports = { record, getChain, reconstruct, verify, clear, _writeRaw, EVENT_TYPES };
