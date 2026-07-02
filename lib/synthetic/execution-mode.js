'use strict';

// SRE — Execution Mode Guard
// Defines the PRODUCTION / SYNTHETIC boundary. Default is PRODUCTION.
// Every SRE entry point calls assertSyntheticMode(mode, caller) before doing anything.
// No module-level mutable state — mode is always passed explicitly per invocation.

const EXECUTION_MODE = Object.freeze({
    PRODUCTION: 'PRODUCTION',
    SYNTHETIC:  'SYNTHETIC',
});

const DEFAULT_MODE = EXECUTION_MODE.PRODUCTION;

/**
 * Throws if mode is not SYNTHETIC.
 * Must be called at the top of every public SRE function.
 */
function assertSyntheticMode(mode, caller) {
    if (mode !== EXECUTION_MODE.SYNTHETIC) {
        throw new Error(
            `[SRE] ABORT — ${caller} requires mode=SYNTHETIC. ` +
            `Received: ${mode ?? 'undefined'}. ` +
            `Default is PRODUCTION. Synthetic execution requires explicit opt-in.`
        );
    }
}

function isSynthetic(mode)  { return mode === EXECUTION_MODE.SYNTHETIC; }
function isProduction(mode) { return mode === EXECUTION_MODE.PRODUCTION; }

module.exports = { EXECUTION_MODE, DEFAULT_MODE, assertSyntheticMode, isSynthetic, isProduction };
