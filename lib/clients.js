'use strict';
const Anthropic           = require('@anthropic-ai/sdk');
const { createClient }    = require('@supabase/supabase-js');

// ── Anthropic singleton ───────────────────────────────────────────────────────
let _anthropic = null;
function getAnthropicClient() {
    if (!_anthropic) {
        _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return _anthropic;
}

// ── Supabase admin singleton ──────────────────────────────────────────────────
let _supabase = null;
function getSupabaseClient() {
    if (!_supabase) {
        _supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    return _supabase;
}

// ── Supabase restricted singleton (anon key — respects RLS) ──────────────────
// Used exclusively by runHoldoutBenchmark to read benchmark_holdout_scenarios.
// The anon key cannot write to tables protected by RLS deny-by-default policy.
// This closes the credential-level write path for the holdout evaluation apparatus.
// Residual gap: service_role key still exists in env and bypasses RLS — see Gap-4 audit.
let _holdout = null;
function getHoldoutClient() {
    if (!_holdout) {
        _holdout = createClient(
            process.env.SUPABASE_HOLDOUT_URL,
            process.env.SUPABASE_HOLDOUT_ANON_KEY
        );
    }
    return _holdout;
}

module.exports = { getAnthropicClient, getSupabaseClient, getHoldoutClient };
