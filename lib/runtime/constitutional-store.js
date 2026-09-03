'use strict';
// lib/runtime/constitutional-store.js
// T3-00 (MR-08): Wave 3 constitutional record persistence via Supabase.
//
// write() is fire-and-forget — callers must not await or handle errors.
// No-throw contract: all errors are logged and swallowed.
//
// To enable debug logging: CONSTITUTIONAL_STORE_DEBUG=1 node server.js

const { getSupabaseClient } = require('../clients');

async function write(record) {
    if (process.env.CONSTITUTIONAL_STORE_DEBUG) {
        console.log('[constitutional-store]', JSON.stringify({
            type:     record?.__type,
            baseline: record?.__baseline,
            runtime:  record?.__runtime,
        }));
    }
    try {
        const sb = getSupabaseClient();
        await sb.from('constitutional_records').insert({
            record_type:          record.__type,
            runtime_id:           record.__runtime,
            baseline:             record.__baseline || 'APEX-CONSTITUTION-v1.0',
            wave:                 record.__wave    || null,
            record_data:          record,
            structural_immutable: record.__structural_immutable || false,
        });
    } catch (err) {
        console.error('[constitutional-store] write failed:', record?.__type, err?.message);
    }
}

module.exports = Object.freeze({ write });
