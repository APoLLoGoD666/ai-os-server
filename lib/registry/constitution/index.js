'use strict';
// lib/registry/constitution/index.js — Constitutional Governance Engine.
//
// Loads law files from constitution/laws/*.yaml, computes a hash over them
// (any change to the laws changes the hash — detectable in git), and exposes
// check() for evaluating proposed operations against all laws.

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const { EventBus, EVENTS } = require('../events');
const LAWS_DIR = path.join(__dirname, '../../../constitution/laws');

// ── Law loader ────────────────────────────────────────────────────────────────

function _parseYamlValue(s) {
    if (s === 'true')  return true;
    if (s === 'false') return false;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return s;
}

function parseConstitutionYaml(content) {
    const result = {};
    let   key    = null;
    let   multiline = null;

    for (const raw of content.split('\n')) {
        const line = raw.trimEnd();
        if (!line || line.startsWith('#')) continue;

        // Multiline block scalar (> or |)
        if (multiline !== null) {
            if (line.startsWith('  ') || line.startsWith('\t')) {
                result[multiline] = (result[multiline] || '') + line.trim() + ' ';
                continue;
            }
            result[multiline] = result[multiline]?.trim();
            multiline = null;
        }

        const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
        if (!kv) continue;
        key = kv[1];
        const val = kv[2].trim();
        if (val === '>') { multiline = key; result[key] = ''; }
        else result[key] = _parseYamlValue(val);
    }
    if (multiline) result[multiline] = result[multiline]?.trim();
    return result;
}

function loadLaws() {
    const laws = [];
    let files;
    try { files = fs.readdirSync(LAWS_DIR).filter(f => f.endsWith('.yaml')).sort(); }
    catch { return []; }
    for (const file of files) {
        try {
            const raw = fs.readFileSync(path.join(LAWS_DIR, file), 'utf8');
            laws.push(parseConstitutionYaml(raw));
        } catch { /* skip malformed */ }
    }
    return laws;
}

// ── Constitutional hash ───────────────────────────────────────────────────────

function computeHash(laws) {
    const content = JSON.stringify(laws);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ── Check engine ──────────────────────────────────────────────────────────────

/**
 * Check a proposed operation against all constitutional laws.
 *
 * @param {string}  operation  — e.g. 'entity.delete', 'code.edit'
 * @param {object}  context    — { entity_id?, blast_radius?, agent?, ... }
 * @returns {{ ok, violations, warnings, hash }}
 */
function check(operation, context = {}) {
    const laws      = loadLaws();
    const hash      = computeHash(laws);
    const violations = [];
    const warnings   = [];

    for (const law of laws) {
        const cond = law.condition || {};

        // Check operation match
        if (cond.operation && cond.operation !== operation) continue;

        // LAW-001: impact threshold check
        if (law.id === 'LAW-001' && operation === 'entity.delete') {
            const total = context.blast_radius?.total || 0;
            const threshold = (cond.threshold || {}).blast_radius_total || 10;
            if (total >= threshold) {
                const v = { law: law.id, name: law.name, severity: law.severity, remedy: law.remedy, blocking: law.enforcement === 'blocking' };
                law.enforcement === 'blocking' ? violations.push(v) : warnings.push(v);
            }
        }

        // LAW-002: agent code boundary — forbidden ops hardcoded (YAML parser doesn't handle nested objects)
        if (law.id === 'LAW-002' && context.agent) {
            const FORBIDDEN = ['code.edit', 'env.write', 'secret.write', 'github.push'];
            if (FORBIDDEN.includes(operation)) {
                const v = { law: law.id, name: law.name, severity: law.severity, remedy: law.remedy, blocking: true };
                violations.push(v);
            }
        }

        // LAW-003: constitutional gate
        if (law.id === 'LAW-003' && context.constraint_result) {
            const gate = (context.constraint_result.results || []).find(r => r.rule === 'CONSTITUTIONAL_GATE_HEALTHY');
            if (gate && gate.status === 'FAIL') {
                const v = { law: law.id, name: law.name, severity: law.severity, remedy: law.remedy, blocking: true };
                violations.push(v);
            }
        }
    }

    const ok = violations.length === 0;

    if (!ok) {
        EventBus.emit(EVENTS.GOVERNANCE_VIOLATION, { operation, context, violations, hash });
    }

    return { ok, violations, warnings, hash, law_count: laws.length };
}

function laws()  { return loadLaws(); }
function hash()  { return computeHash(loadLaws()); }
function count() { return loadLaws().length; }

module.exports = { check, laws, hash, count };
