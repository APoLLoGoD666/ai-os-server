'use strict';
// tests/registry/_runner.js — Shared test harness (no external deps)

let _passed = 0;
let _failed = 0;
let _skipped = 0;
let _suiteName = '';

async function test(name, fn) {
    try {
        await fn();
        console.log('    PASS', name);
        _passed++;
    } catch (e) {
        console.error('    FAIL', name, '—', e.message);
        _failed++;
    }
}

function skip(name, _fn) {
    console.log('    SKIP', name);
    _skipped++;
}

async function suite(name, fn) {
    _suiteName = name;
    console.log('\n  ' + name);
    await fn();
}

function totals() {
    return { passed: _passed, failed: _failed, skipped: _skipped };
}

function reset() {
    _passed = 0; _failed = 0; _skipped = 0;
}

module.exports = { test, skip, suite, totals, reset };
