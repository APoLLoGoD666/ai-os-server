'use strict';
require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');
const expandPrompt = require('./agent-system/prompt-expander.js');
const runAgentTeam = require('./agent-system/orchestrator.js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TASK = process.argv[2] || 'Add a GET /api/healthz route returning { ok: true }';

async function getRowCount() {
    const { count } = await sb.from('apex_agent_stages').select('*', { count: 'exact', head: true });
    return count || 0;
}

async function run() {
    const taskId = 'run-' + Date.now().toString(36);
    const startTs = new Date().toISOString();
    const rowsBefore = await getRowCount();
    console.log('TASK_ID:', taskId);
    console.log('START_TIME:', startTs);
    console.log('ROWS_BEFORE:', rowsBefore);

    let result;
    try {
        const spec = await expandPrompt(TASK);
        result = await runAgentTeam(spec, taskId);
    } catch (e) {
        console.log('PIPELINE_ERROR:', e.message);
        process.exit(1);
    }

    const endTs = new Date().toISOString();
    // Wait for fire-and-forget stage inserts at orchestrator.js:814 to complete
    await new Promise(r => setTimeout(r, 6000));
    const rowsAfter = await getRowCount();

    console.log('END_TIME:', endTs);
    console.log('ROWS_AFTER:', rowsAfter);
    console.log('STAGE_ROWS_ADDED:', rowsAfter - rowsBefore);
    console.log('EXECUTION_SUCCESS:', result.success);
    console.log('COMMIT_HASH:', result.commitHash || 'none');
    console.log('COST_USD:', result.cost || 0);
    if (result.agentLogs && result.agentLogs.length) {
        for (const l of result.agentLogs) {
            const pass = (l.result && (l.result.passed === false || l.result.error)) ? 'FAIL' : 'PASS';
            console.log('STAGE', l.role, pass, (l.duration || 0) + 'ms');
        }
    }
    process.exit(0);
}

run().catch(e => { console.log('FATAL:', e.message); process.exit(1); });
