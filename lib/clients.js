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

module.exports = { getAnthropicClient, getSupabaseClient };
