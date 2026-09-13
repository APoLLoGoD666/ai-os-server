'use strict';
require('dotenv').config();
const { backup } = require('./lib/integrity-crons');
const { createClient } = require('@supabase/supabase-js');

(async () => {
    console.log('Running backup()...');
    await backup();
    console.log('backup() complete. Reading checkpoint row...');

    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await sb
        .from('apex_sync_checkpoints')
        .select('key, value, updated_at')
        .eq('key', 'integrity:backup:last_manifest')
        .maybeSingle();

    if (error) { console.error('Checkpoint read error:', error.message); process.exit(1); }
    if (!data)  { console.error('No checkpoint row found.'); process.exit(1); }

    const manifest = JSON.parse(data.value);
    console.log('\n=== CHECKPOINT ROW ===');
    console.log('key:        ', data.key);
    console.log('updated_at: ', data.updated_at);
    console.log('manifest.ts:', manifest.ts);
    console.log('\ncounts:');
    for (const [tbl, n] of Object.entries(manifest.counts)) {
        const label = n === null ? 'null (table absent)' : String(n);
        console.log(`  ${tbl.padEnd(26)} ${label}`);
    }

    const nullCount = Object.values(manifest.counts).filter(v => v === null).length;
    const realCount = Object.values(manifest.counts).filter(v => v !== null).length;
    console.log(`\nSummary: ${realCount} real counts, ${nullCount} null (absent tables)`);

    // Also check whether cron:integrity_backup:last_run has been written
    const { data: lastRun } = await sb
        .from('apex_sync_checkpoints')
        .select('key, value, updated_at')
        .eq('key', 'cron:integrity_backup:last_run')
        .maybeSingle();
    console.log('\n=== cron:integrity_backup:last_run ===');
    if (lastRun) {
        console.log('EXISTS — last advanced:', lastRun.updated_at);
        console.log('value:', lastRun.value);
    } else {
        console.log('NOT FOUND — unattended Render firing has NOT written this key yet.');
    }

    process.exit(0);
})();
