'use strict';
// test-v11j-schema.js
// V-11-J schema contract verification (source-level assertions only —
// no DB or server calls). Verifies that:
//   * Migration 093 exists and adds top-level `evidence_refs jsonb` column.
//   * Writer (lib/intelligence/opportunity-engine.js) emits structured
//     evidence_refs objects (with label/source/ts fields) into both the
//     top-level column and the legacy roi_forecast nested location.
//   * Reader (routes/intelligence.js) selects the top-level column,
//     falls back to nested, and always projects into the canonical
//     Array<{label,source,ts}> contract via _normalizeEvidenceRefs.
//   * Frontend (public/dashboard.html) consumes the canonical shape
//     (ref.label || ref.source, ref.ts).
//   * Canonical response envelope { ok, error, message, requestId } is
//     preserved on both success and error paths.

const fs = require('fs');
const path = require('path');

const MIGRATION_PATH = path.join(__dirname, 'migrations', '093_opportunities_evidence_refs.sql');
const WRITER_PATH    = path.join(__dirname, 'lib', 'intelligence', 'opportunity-engine.js');
const READER_PATH    = path.join(__dirname, 'routes', 'intelligence.js');
const FRONTEND_PATH  = path.join(__dirname, 'public', 'dashboard.html');

let pass = 0, fail = 0;
function assert(name, condition, detail) {
    if (condition) { console.log('PASS  ' + name); pass++; }
    else           { console.log('FAIL  ' + name + (detail ? ' :: ' + detail : '')); fail++; }
}

// ── Migration 093 ────────────────────────────────────────────────────────────
const migSrc = fs.existsSync(MIGRATION_PATH) ? fs.readFileSync(MIGRATION_PATH, 'utf8') : '';
assert('J-1: migration 093 exists', migSrc.length > 0, MIGRATION_PATH);
assert('J-2: migration adds top-level evidence_refs jsonb column',
    /ALTER\s+TABLE\s+opportunities[\s\S]*ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+evidence_refs\s+jsonb/i.test(migSrc));
assert('J-3: migration is idempotent (IF NOT EXISTS)',
    /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i.test(migSrc));
assert('J-4: migration has default \'[]\' (existing rows validate contract)',
    /DEFAULT\s+'\[\]'::jsonb/i.test(migSrc));
assert('J-5: migration wrapped in transaction',
    /BEGIN;/i.test(migSrc) && /COMMIT;/i.test(migSrc));

// ── Writer: opportunity-engine.js ────────────────────────────────────────────
const writerSrc = fs.readFileSync(WRITER_PATH, 'utf8');
assert('J-6: writer builds structured evidence_refs (_projectRef helper)',
    writerSrc.includes('_projectRef'));
assert('J-7: writer emits top-level evidence_refs column into insert row',
    /evidence_refs:\s*structuredRefs/.test(writerSrc));
assert('J-8: writer preserves legacy roi_forecast.evidence_refs nesting',
    /roi_forecast:\s*\{[\s\S]*evidence_refs:\s*structuredRefs/.test(writerSrc));
assert('J-9: writer projects EVT- refs into structured shape',
    /startsWith\(['"]EVT-['"]\)/.test(writerSrc));
assert('J-10: writer projects MEM- refs into structured shape',
    /startsWith\(['"]MEM-['"]\)/.test(writerSrc));
assert('J-11: writer projects SIG- refs into structured shape',
    /startsWith\(['"]SIG-['"]\)/.test(writerSrc));
assert('J-12: writer produces canonical {label, source, ts} shape',
    /label:\s*[^,]+,\s*source:\s*[^,]+,\s*ts:/.test(writerSrc));

// ── Reader: routes/intelligence.js ───────────────────────────────────────────
const readerSrc = fs.readFileSync(READER_PATH, 'utf8');
assert('J-13: reader SELECTs top-level evidence_refs column',
    /\.select\(['"][^'"]*evidence_refs[^'"]*['"]\)/.test(readerSrc));
assert('J-14: reader defines _normalizeEvidenceRefs helper',
    readerSrc.includes('_normalizeEvidenceRefs'));
assert('J-15: reader falls back to roi_forecast.evidence_refs (legacy data)',
    /roi_forecast\?\.evidence_refs|roi_forecast\.evidence_refs/.test(readerSrc));
assert('J-16: reader handles missing-column error path (pre-migration env)',
    /column .*evidence_refs.* does not exist/i.test(readerSrc) || /error\.code\s*===\s*['"]42703['"]/.test(readerSrc));
assert('J-17: reader response envelope preserves canonical {ok, error, message, requestId}',
    /res\.json\(\{\s*ok:\s*true,\s*opportunities/.test(readerSrc));
assert('J-18: reader error path uses canonical error code + requestId',
    /error:\s*CODES\.DATABASE_UNAVAILABLE[\s\S]*requestId/.test(readerSrc));
assert('J-19: reader projects legacy string refs (EVT-/MEM-/SIG-) into objects',
    /startsWith\(['"]EVT-['"]\)/.test(readerSrc) && /startsWith\(['"]MEM-['"]\)/.test(readerSrc) && /startsWith\(['"]SIG-['"]\)/.test(readerSrc));
assert('J-20: reader emits canonical {label, source, ts} shape in normaliser',
    /return\s*\{\s*label:[\s\S]*source:[\s\S]*ts:/.test(readerSrc));

// ── Frontend: dashboard.html ─────────────────────────────────────────────────
const feSrc = fs.readFileSync(FRONTEND_PATH, 'utf8');
assert('J-21: frontend consumes canonical ref.label/ref.source',
    feSrc.includes('ref.label || ref.source'));
assert('J-22: frontend renders optional ref.ts timestamp',
    /ref\.ts\s*\?/.test(feSrc));
assert('J-23: frontend guards evidence_refs as array (no shape assumption break)',
    feSrc.includes('Array.isArray(o.evidence_refs)'));

// ── Canonical envelope preservation (V-11-C) ─────────────────────────────────
assert('J-24: reader does not use success: envelope (canonical uses ok:)',
    !/res\.json\(\{\s*success:/.test(readerSrc));
assert('J-25: reader includes requestId on both success and error paths',
    (readerSrc.match(/requestId/g) || []).length >= 2);

// ── Ownership / privacy invariants (V-11-H-B + V-11-I) unchanged ─────────────
assert('J-26: /intelligence/opportunities still gated by requireAppAccess',
    /router\.get\(['"]\/intelligence\/opportunities['"],\s*requireAppAccess/.test(readerSrc));

// ── Report ───────────────────────────────────────────────────────────────────
console.log('\nV-11-J schema: ' + pass + ' passed / ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
