'use strict';
// civilisation/contract-validator.js — Contract Validator (advisory mode).
//
// Reads contracts/emit.yaml and contracts/accept.yaml for every domain and
// checks three invariants:
//   1. Phantom  — domain A accepts event E from B, but B doesn't emit E.
//   2. Orphan   — domain A emits event E with no domain accepting it.
//   3. Mismatch — emit.yaml consumers list doesn't match actual accept.yaml.
//
// Phase 3: advisory only — all findings are surfaced as warnings, never blocks.

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

// ── YAML parser (targeted for contract file structure) ────────────────────────

function parseContractYaml(content) {
    const result = { domain: null, events: [] };
    const lines  = content.split('\n');

    let currentEvent = null;
    let inConsumers  = false;
    let inSchema     = false;

    for (const raw of lines) {
        const line = raw.trimEnd();
        if (!line || line.startsWith('#')) continue;

        const indent  = raw.match(/^(\s*)/)[1].length;
        const trimmed = line.trim();

        if (indent === 0) {
            inConsumers = false;
            inSchema    = false;
            if (/^events:\s*\[\]/.test(trimmed)) { result.events = []; continue; }
            const kv = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
            if (kv && kv[1] === 'domain') result.domain = kv[2].trim().split('#')[0].trim();
            continue;
        }

        // Event list item: '  - name: ...'
        if (indent === 2 && trimmed.startsWith('- ')) {
            inConsumers = false;
            inSchema    = false;
            const val = trimmed.slice(2).trim();
            const kv  = val.match(/^([a-zA-Z_]+):\s*(.*)$/);
            if (kv && kv[1] === 'name') {
                currentEvent = { name: kv[2].trim(), from: null, handler: null, consumers: [] };
                result.events.push(currentEvent);
            }
            continue;
        }

        if (!currentEvent) continue;

        // Event sub-properties: '    key: val'
        if (indent === 4) {
            const kv = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
            if (!kv) continue;
            inConsumers = false;
            inSchema    = false;
            const val   = kv[2].trim().split('#')[0].trim();
            if      (kv[1] === 'from')      currentEvent.from    = val || null;
            else if (kv[1] === 'handler')   currentEvent.handler = val;
            else if (kv[1] === 'consumers') inConsumers = true;
            else if (kv[1] === 'schema')    inSchema    = true;
            continue;
        }

        // Consumer items: '      - DOM-000006   # ...'
        if (indent === 6 && inConsumers && trimmed.startsWith('- ') && currentEvent) {
            const val = trimmed.slice(2).split('#')[0].trim();
            if (val) currentEvent.consumers.push(val);
            continue;
        }
    }

    return result;
}

// ── Loader ────────────────────────────────────────────────────────────────────

function loadContracts() {
    const contracts = {};
    for (const [domainId, domainKey] of Object.entries(DOMAIN_KEYS)) {
        const emitPath   = path.join(DOMAINS_DIR, domainKey, 'contracts', 'emit.yaml');
        const acceptPath = path.join(DOMAINS_DIR, domainKey, 'contracts', 'accept.yaml');

        let emit   = null;
        let accept = null;
        try { emit   = parseContractYaml(fs.readFileSync(emitPath,   'utf8')); } catch { /* no file */ }
        try { accept = parseContractYaml(fs.readFileSync(acceptPath,  'utf8')); } catch { /* no file */ }

        contracts[domainId] = { domainKey, emit, accept };
    }
    return contracts;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate all domain contracts for consistency.
 * Advisory mode: ok is always true, all findings are warnings.
 *
 * @returns {{ ok, mode, summary, domains, generated_at }}
 */
function validate() {
    const contracts = loadContracts();

    // Build emit index: domainId → Set<eventName>
    const emitIndex = {};
    for (const [domainId, { emit }] of Object.entries(contracts)) {
        emitIndex[domainId] = new Set((emit?.events || []).map(e => e.name));
    }

    // Build accept index: eventName → Set<acceptorDomainId>
    const acceptIndex = {};
    for (const [domainId, { accept }] of Object.entries(contracts)) {
        for (const ev of (accept?.events || [])) {
            if (!acceptIndex[ev.name]) acceptIndex[ev.name] = new Set();
            acceptIndex[ev.name].add(domainId);
        }
    }

    const domainResults = [];
    let totalPhantoms   = 0;
    let totalOrphans    = 0;
    let totalMismatches = 0;
    let totalMissing    = 0;

    for (const [domainId, { domainKey, emit, accept }] of Object.entries(contracts)) {
        const phantoms   = [];
        const orphans    = [];
        const mismatches = [];
        const warnings   = [];

        if (!emit && !accept) {
            warnings.push('no contract files found');
            totalMissing++;
        }

        // Check 1: Phantom events — accepted from a source that doesn't emit them
        for (const ev of (accept?.events || [])) {
            if (!ev.from) continue;
            if (!emitIndex[ev.from]?.has(ev.name)) {
                const finding = `accepts ${ev.name} from ${ev.from} but ${ev.from} does not emit ${ev.name}`;
                phantoms.push({ event: ev.name, from: ev.from, detail: finding });
                warnings.push(finding);
            }
        }

        // Check 2: Orphan events — emitted with no accepting domain
        for (const ev of (emit?.events || [])) {
            const hasConsumerInAccept = acceptIndex[ev.name]?.size > 0;
            const hasConsumerInList   = ev.consumers?.length > 0;
            if (!hasConsumerInAccept && !hasConsumerInList) {
                const finding = `emits ${ev.name} with no known consumers`;
                orphans.push({ event: ev.name, detail: finding });
                warnings.push(finding);
            }
        }

        // Check 3: Consumer mismatches — emit.yaml consumers list vs accept.yaml
        for (const ev of (emit?.events || [])) {
            for (const consumerId of (ev.consumers || [])) {
                const consumerContracts = contracts[consumerId];
                if (!consumerContracts) continue;
                const consumerAccepts = consumerContracts.accept?.events || [];
                const declaresAccept  = consumerAccepts.some(a => a.name === ev.name && a.from === domainId);
                if (!declaresAccept) {
                    const finding = `lists ${consumerId} as consumer of ${ev.name}, but ${consumerId} does not declare accepting it`;
                    mismatches.push({ event: ev.name, consumer: consumerId, detail: finding });
                    warnings.push(finding);
                }
            }
        }

        totalPhantoms   += phantoms.length;
        totalOrphans    += orphans.length;
        totalMismatches += mismatches.length;

        domainResults.push({
            domain_id:   domainId,
            domain_key:  domainKey,
            ok:          true,       // advisory — always ok
            emit_count:  emit?.events?.length  || 0,
            accept_count:accept?.events?.length || 0,
            phantoms,
            orphans,
            mismatches,
            warnings,
        });
    }

    return {
        ok:   true,  // Phase 3: advisory — never blocks
        mode: 'advisory',
        summary: {
            domains:            Object.keys(contracts).length,
            phantoms:           totalPhantoms,
            orphans:            totalOrphans,
            mismatches:         totalMismatches,
            missing_contracts:  totalMissing,
            clean_domains:      domainResults.filter(d => d.warnings.length === 0).length,
        },
        domains:      domainResults,
        generated_at: new Date().toISOString(),
    };
}

/**
 * Validate a single domain's contracts.
 * @param {string} domainId — e.g. 'DOM-000004'
 */
function validateDomain(domainId) {
    const domainKey = DOMAIN_KEYS[domainId];
    if (!domainKey) return { ok: false, error: `Unknown domain: ${domainId}` };
    const full = validate();
    return full.domains.find(d => d.domain_id === domainId) || { ok: false, error: 'not found' };
}

module.exports = { validate, validateDomain, parseContractYaml, loadContracts, DOMAIN_KEYS };
