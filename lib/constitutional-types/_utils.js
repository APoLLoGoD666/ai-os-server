'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/_utils.js
// Task: W1-02A — Canonical Pattern Remediation (DEF-001)
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: W1-GATE-A DEF-001; D2 URO-A1 (Constitutional Completeness);
//            D2 URO-A2 (Constitutional Legibility)
//
// ENGINEERING INFRASTRUCTURE — not a constitutional object; not exported as a type.
// Implements shared constitutional obligations that apply equally to all 83 types
// across all 16 constitutional runtimes.
//
// USAGE:    const { _validate, _create } = require('./_utils');
// MANDATE:  All Wave 1 type files (W1-02 through W1-15) MUST require this module.
//           Do NOT re-implement these functions locally in any type file.
//           Any change to this file is a constitutional amendment affecting all types
//           and requires W1-GATE level review before merging.
// ─────────────────────────────────────────────────────────────────────────────


// ENGINEERING CONVENTION: implements constitutional completeness (D2 URO-A1)
// and constitutional legibility (D2 URO-A2) by enforcing required fields,
// type constraints, and enum constraints at object-formation time.
function _validate(typeName, schema, data) {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: [`${typeName}: data must be a non-null, non-array object`] };
  }
  const errors = [];
  for (const [field, spec] of Object.entries(schema)) {
    const value = data[field];
    const absent = value === undefined || value === null;
    if (spec.required && absent) {
      errors.push(`${field}: required field missing`);
      continue;
    }
    if (absent) continue;
    if (spec.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${field}: expected array, got ${typeof value}`);
      }
    } else if (spec.type && typeof value !== spec.type) {
      errors.push(`${field}: expected ${spec.type}, got ${typeof value}`);
    }
    if (spec.enum && !spec.enum.includes(value)) {
      errors.push(`${field}: must be one of [${spec.enum.join(', ')}]; got '${value}'`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ENGINEERING CONVENTION: stamps constitutional type metadata onto validated
// plain objects, enabling duck-typing identification across module boundaries
// (observability requirement: D2 URO-A2 Constitutional Legibility).
function _create(typeName, schema, constitutional, data) {
  const result = _validate(typeName, schema, data);
  if (!result.valid) {
    throw new TypeError(
      `[${typeName}] Constitutional validation failed: ${result.errors.join('; ')}`
    );
  }
  return Object.assign({}, data, {
    __type:     constitutional.type,
    __runtime:  constitutional.runtime_id,
    __baseline: constitutional.baseline,
    __version:  constitutional.version,
  });
}

module.exports = Object.freeze({ _validate, _create });
