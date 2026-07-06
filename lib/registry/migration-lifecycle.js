'use strict';
// lib/registry/migration-lifecycle.js — Step 3: Registry-Driven Migration
//
// Every migration must declare which Registry entities it creates or modifies.
// States: PROPOSED → VALIDATED → APPROVED → EXECUTING → EXECUTED → VERIFIED
//
// Header format (at top of any .sql migration file):
//   -- @apex-migration
//   -- @ent-refs:   ENT-001204, ENT-001207
//   -- @arch-refs:  ARCH-15
//   -- @block:      24
//   -- @status:     PROPOSED
//   -- @description: Creates governance_records table

const fs   = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

const LIFECYCLE_STATES = ['PROPOSED', 'VALIDATED', 'APPROVED', 'EXECUTING', 'EXECUTED', 'VERIFIED'];

// ── Header parser ────────────────────────────────────────────────────────────

function parseMigrationHeader(sqlContent) {
    const header = {};
    const lines  = sqlContent.split('\n').slice(0, 30);
    let isApex   = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '-- @apex-migration') { isApex = true; continue; }
        if (!isApex) continue;
        const m = trimmed.match(/^--\s*@([\w-]+):\s*(.+)$/);
        if (!m) continue;
        const [, key, value] = m;
        header[key.toLowerCase().replace(/-/g, '_')] = value.trim();
    }

    if (!isApex) return null;

    return {
        isApexMigration: true,
        entRefs:    (header.ent_refs  || '').split(',').map(s => s.trim()).filter(Boolean),
        archRefs:   (header.arch_refs || '').split(',').map(s => s.trim()).filter(Boolean),
        block:      header.block ? parseInt(header.block) : null,
        status:     (header.status      || 'PROPOSED').toUpperCase(),
        description: header.description || '',
    };
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateMigration(sqlContent, filename) {
    const engine = require('./engine');
    const findings = [];
    const push = (severity, rule, detail) => findings.push({ severity, rule, file: filename, detail });

    const header = parseMigrationHeader(sqlContent);

    if (!header) {
        push('WARN', 'MISSING_APEX_HEADER', 'Migration has no @apex-migration header — not Registry-governed');
        return { valid: false, governed: false, findings, header: null };
    }

    // Validate ENT refs exist in registry
    for (const id of header.entRefs) {
        if (!/^ENT-\d{6}$/.test(id)) {
            push('ERROR', 'INVALID_ENT_REF', `"${id}" is not a valid ENT-NNNNNN identifier`);
            continue;
        }
        const entity = engine.lookup(id);
        if (!entity) {
            push('ERROR', 'UNKNOWN_ENT_REF', `${id} is not registered in the Registry`);
        }
    }

    if (header.entRefs.length === 0) {
        push('ERROR', 'NO_ENT_REFS', 'Migration declares no @ent-refs — must reference at least one Registry entity');
    }

    if (header.archRefs.length === 0) {
        push('WARN', 'NO_ARCH_REFS', 'Migration declares no @arch-refs — recommended to cite architectural authority');
    }

    if (!header.status || !LIFECYCLE_STATES.includes(header.status)) {
        push('ERROR', 'INVALID_STATUS', `Status "${header.status}" is not in lifecycle: ${LIFECYCLE_STATES.join(' → ')}`);
    }

    const errors = findings.filter(f => f.severity === 'ERROR');
    return {
        valid:    errors.length === 0,
        governed: true,
        findings,
        header,
    };
}

// ── File scanner ─────────────────────────────────────────────────────────────

function scanMigrations() {
    const results = [];
    let files;
    try { files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort(); }
    catch (_) { return results; }

    for (const filename of files) {
        let content;
        try { content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8'); }
        catch (_) { continue; }

        const header   = parseMigrationHeader(content);
        const governed = !!header;
        results.push({
            filename,
            governed,
            status:    governed ? header.status     : null,
            entRefs:   governed ? header.entRefs    : [],
            archRefs:  governed ? header.archRefs   : [],
            block:     governed ? header.block      : null,
            description: governed ? header.description : '',
        });
    }

    return results;
}

// ── Pre-flight check ─────────────────────────────────────────────────────────
// Run before applying any migration. Returns pass/fail + detailed findings.

function preflight(filename) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    let content;
    try { content = fs.readFileSync(filepath, 'utf8'); }
    catch (_) { return { ok: false, error: `File not found: ${filename}` }; }

    const result = validateMigration(content, filename);
    const errors = result.findings.filter(f => f.severity === 'ERROR');
    const warns  = result.findings.filter(f => f.severity === 'WARN');

    return {
        ok:       result.valid,
        governed: result.governed,
        header:   result.header,
        errors:   errors.length,
        warnings: warns.length,
        findings: result.findings,
    };
}

// ── Compliance report ────────────────────────────────────────────────────────
// How many migrations are Registry-governed vs. ungoverned?

function complianceReport() {
    const all        = scanMigrations();
    const governed   = all.filter(m => m.governed);
    const ungoverned = all.filter(m => !m.governed);
    const byStatus   = {};
    for (const m of governed) {
        byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    }

    return {
        total:      all.length,
        governed:   governed.length,
        ungoverned: ungoverned.length,
        compliance: all.length ? Math.round((governed.length / all.length) * 100) : 0,
        byStatus,
        ungoverned_files: ungoverned.map(m => m.filename),
    };
}

module.exports = {
    LIFECYCLE_STATES,
    parseMigrationHeader,
    validateMigration,
    scanMigrations,
    preflight,
    complianceReport,
};
