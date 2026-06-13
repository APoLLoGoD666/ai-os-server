'use strict';
// Quick check: does apex_agent_stages exist in Supabase yet?
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await sb
        .from('apex_agent_stages')
        .select('id')
        .limit(1);

    if (error) {
        console.log('TABLE_MISSING:', error.message);
        process.exit(1);
    } else {
        console.log('TABLE_EXISTS: row_count_sample=' + (data?.length ?? 0));
        process.exit(0);
    }
}
check().catch(e => { console.log('CHECK_ERROR:', e.message); process.exit(2); });
