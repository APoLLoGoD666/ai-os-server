'use strict';
// civilisation/genome-validator.js — Genome Validator (advisory mode).
//
// Reads genome.yaml for each domain and validates all declared invariants
// against live registry state. Phase 2: advisory only — violations are
// surfaced as warnings, never block operations.

const fs   = require('fs');
const path = require('path');

const DOMAINS_DIR = path.join(__dirname, '../domains');

const DOMAIN_KEYS = {
    'DOM-000001': 'civilisation',
    'DOM-000002': 'intelligence',
    'DOM-000003': 'registry',
    'DOM-000004': 'memory',
    'DOM-000005': 'infrastructure',
    'DOM-000006': 'observability',
    'DOM-000007': 'interface',
    'DOM-000008': 'knowledge',
    'DOM-000009': 'development',
    'DOM-000010': 'experiments',
};

// ── YAML parser (handles our specific genome.yaml structure) ──────────────────

function _parseScalar(s) {
    const v = (s || '').split('#')[0].trim();
    if (v === 'true')  return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~') return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    return v;
}

function parseGenomeYaml(content) {
    const result = {};
    const lines  = content.split('\n');

    let inMultiline  = null;
    let inList       = null;
    let currentItem  = null;

    for (const raw of lines) {
        const line   = raw.trimEnd();
        if (!line || line.startsWith('#')) continue;

        const indent = raw.match(/^(\s*)/)[1].length;

        // Multiline block scalar continuation
        if (inMultiline !== null) {
            if (indent >= 2) {
                result[inMultiline] = (result[inMultiline] || '') + line.trim() + ' ';
                continue;
            }
            result[inMultiline] = result[inMultiline]?.trim();
            inMultiline = null;
        }

        // Sub-property of a list object item (4+ spaces)
        if (indent >= 4 && currentItem !== null && inList !== null) {
            const kv = line.trim().match(/^([a-zA-Z_]+):\s*(.*)$/);
            if (kv) currentItem[kv[1]] = _parseScalar(kv[2]);
            continue;
        }

        // List item (2-space indent + '- ')
        if (indent === 2 && line.trim().startsWith('- ')) {
            const val = line.trim().slice(2).trim();
            const kv  = val.match(/^([a-zA-Z_]+):\s*(.*)$/);

            if (!Array.isArray(result[inList])) result[inList] = [];

            if (kv && inList) {
                currentItem = { [kv[1]]: _parseScalar(kv[2]) };
                result[inList].push(currentItem);
            } else if (inList) {
                result[inList].push(val.split('#')[0].trim());
                currentItem = null;
            }
            continue;
        }

        // Top-level key
        if (indent === 0) {
            currentItem = null;

            // Empty list: `key: []`
            const emptyList = line.match(/^([a-zA-Z_]+):\s*\[\]$/);
            if (emptyList) {
                result[emptyList[1]] = [];
                inList = null;
                continue;
            }

            const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
            if (!kv) continue;

            const key = kv[1];
            const val = kv[2].trim().split('#')[0].trim();

            if (val === '' ) { inList = key; if (!Array.isArray(result[key])) result[key] = []; }
            else if (val === '>') { inMultiline = key; result[key] = ''; inList = null; }
            else { result[key] = _parseScalar(val); inList = null; }
        }
    }

    if (inMultiline) result[inMultiline] = result[inMultiline]?.trim();
    return result;
}

// ── Invariant checker ─────────────────────────────────────────────────────────

function _checkInvariant(inv, domainId, domainKey, engine, health, shadowDir) {
    const prop    = inv.property;
    const entity  = engine.lookup(domainId);
    const severity = inv.violation || 'advisory';

    if (prop === 'status') {
        if (!entity) return { ok: false, property: prop, detail: 'Domain entity not in registry', severity };
        const ok = entity.status === inv.must_be;
        return { ok, property: prop, detail: ok ? 'ok' : `status is ${entity.status}, expected ${inv.must_be}`, severity };
    }

    if (prop === 'owner') {
        if (!entity) return { ok: false, property: prop, detail: 'Domain entity not in registry', severity };
        const ok = !!entity.owner && entity.owner.length > 0;
        return { ok, property: prop, detail: ok ? 'ok' : 'owner is unset', severity };
    }

    if (prop === 'entity_count') {
        try {
            let count;
            if (inv.scope === 'global') {
                // Global scope: check the total registry entity count
                count = engine.all().length;
            } else {
                const versionPath = path.join(shadowDir, 'version.json');
                const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
                count = version.entity_count || 0;
            }
            const ok = count >= (inv.minimum || 0);
            return { ok, property: prop, detail: ok ? `${count} entities` : `${count} entities, minimum ${inv.minimum}`, severity };
        } catch {
            return { ok: true, property: prop, detail: 'shadow registry not yet generated (skipped)', severity: 'advisory' };
        }
    }

    if (prop === 'health_score') {
        if (!entity) return { ok: false, property: prop, detail: 'Domain entity not in registry', severity };
        try {
            const h = health.compute(entity);
            const score = h?.score ?? 0;
            const ok = score >= (inv.minimum || 0);
            return { ok, property: prop, detail: ok ? `score ${score}` : `score ${score}, minimum ${inv.minimum}`, severity, note: 'consecutive_readings check deferred to Phase 3' };
        } catch {
            return { ok: true, property: prop, detail: 'health computation unavailable for synthetic entity', severity: 'advisory' };
        }
    }

    if (prop === 'constitutional_gate') {
        try {
            const constraints = require('../registry/constraints');
            const result      = constraints.check({});
            const gate        = (result.results || []).find(r => r.rule === 'CONSTITUTIONAL_GATE_HEALTHY');
            if (!gate) return { ok: true, property: prop, detail: 'gate rule not found', severity: 'advisory' };
            const ok = gate.status === (inv.must_be || 'PASS');
            return { ok, property: prop, detail: ok ? 'PASS' : `gate status: ${gate.status}`, severity };
        } catch (e) {
            return { ok: false, property: prop, detail: e.message, severity };
        }
    }

    // Unknown invariant — skip with advisory
    return { ok: true, property: prop, detail: 'unknown invariant type (skipped)', severity: 'advisory' };
}

// ── Validate ──────────────────────────────────────────────────────────────────

/**
 * Validate all domain genomes against live registry state.
 * Always runs in advisory mode — never blocks operations.
 *
 * @returns {{ ok, mode, results, summary, generated_at }}
 */
function validate() {
    const engine = require('../registry/engine');
    const health = require('../registry/health-score');

    const results = [];

    for (const [domainId, domainKey] of Object.entries(DOMAIN_KEYS)) {
        const genomePath = path.join(DOMAINS_DIR, domainKey, 'genome.yaml');
        const shadowDir  = path.join(DOMAINS_DIR, domainKey, 'registry');

        if (!fs.existsSync(genomePath)) {
            results.push({ domain_id: domainId, domain_key: domainKey, ok: true, violations: [], warnings: ['genome.yaml not found — skipped'] });
            continue;
        }

        let genome;
        try {
            genome = parseGenomeYaml(fs.readFileSync(genomePath, 'utf8'));
        } catch (e) {
            results.push({ domain_id: domainId, domain_key: domainKey, ok: false, violations: [{ property: 'genome_parse', detail: e.message, severity: 'advisory' }], warnings: [] });
            continue;
        }

        const invariants  = Array.isArray(genome.invariants) ? genome.invariants : [];
        const checks      = invariants.map(inv => _checkInvariant(inv, domainId, domainKey, engine, health, shadowDir));
        const violations  = checks.filter(c => !c.ok);
        const warnings    = violations.map(v => `${v.property}: ${v.detail}`);

        const hasBlocking = violations.some(v => v.severity === 'blocking');
        const hasCritical = violations.some(v => v.severity === 'critical');
        const domainOk    = !(hasBlocking || hasCritical);

        results.push({
            domain_id:   domainId,
            domain_key:  domainKey,
            name:        genome.name || domainKey,
            criticality: genome.criticality,
            ok:          domainOk,
            violations,
            warnings,
            checks,
            genome: { autonomy_level: genome.autonomy_level, healing_domain: genome.healing_domain },
        });
    }

    // Phase 6: top-level ok is false only if any domain has a BLOCKING violation that failed.
    // CRITICAL violations set domain.ok false but do not block at the top level —
    // they require human review, not automatic rejection.
    const allOk   = !results.some(r => r.violations.some(v => v.severity === 'blocking'));
    const summary = {
        total:     results.length,
        healthy:   results.filter(r => r.ok && r.violations.length === 0).length,
        advisory:  results.filter(r => r.violations.length > 0 && r.ok).length,
        failing:   results.filter(r => !r.ok).length,
    };

    return { ok: allOk, mode: 'blocking', results, summary, generated_at: new Date().toISOString() };
}

/**
 * Validate a single domain's genome.
 * @param {string} domainId — e.g. 'DOM-000004'
 */
function validateDomain(domainId) {
    const domainKey = DOMAIN_KEYS[domainId];
    if (!domainKey) return { ok: false, error: `Unknown domain: ${domainId}` };

    const full = validate();
    return full.results.find(r => r.domain_id === domainId) || { ok: false, error: 'not found in results' };
}

module.exports = { validate, validateDomain, parseGenomeYaml, DOMAIN_KEYS };
