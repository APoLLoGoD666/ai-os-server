'use strict';

// Governance Event Store V1 — Persistent Append-Only JSONL Event Log
// Every event emitted by governance_event_bus is mirrored here.
// Survives process restarts. No overwrites. No deletes. No updates.
// Failure contract: STORE_WRITE_FAILED returned, never throws, never halts.

const fs   = require('fs');
const path = require('path');

const _storePath = path.join(process.cwd(), 'data', 'governance_events.jsonl');

// Ensure data directory exists once at module load
try {
    const dir = path.dirname(_storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch (_) {}

// ── Append ────────────────────────────────────────────────────────────────────

function append_event(event) {
    try {
        const line = JSON.stringify(event) + '\n';
        fs.appendFileSync(_storePath, line, 'utf8');
        return true;
    } catch (_) {
        return { status: 'STORE_WRITE_FAILED' };
    }
}

// ── Load all ──────────────────────────────────────────────────────────────────

function load_all() {
    try {
        if (!fs.existsSync(_storePath)) return Object.freeze([]);
        const content = fs.readFileSync(_storePath, 'utf8');
        return Object.freeze(
            content.split('\n')
                .filter(line => line.trim())
                .map(line => { try { return JSON.parse(line); } catch (_) { return null; } })
                .filter(Boolean)
        );
    } catch (_) {
        return Object.freeze([]);
    }
}

// ── Load by execution_id ──────────────────────────────────────────────────────

function load_events(execution_id) {
    if (!execution_id) return Object.freeze([]);
    try {
        return Object.freeze(load_all().filter(e => e.payload?.execution_id === execution_id));
    } catch (_) {
        return Object.freeze([]);
    }
}

module.exports = { append_event, load_all, load_events };
