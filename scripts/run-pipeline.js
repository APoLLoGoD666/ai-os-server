'use strict';
require('dotenv').config({ path: '.env' });
const runAgentTeam  = require('./agent-system/orchestrator');
const expandPrompt  = require('./agent-system/prompt-expander');

const TASK = process.argv[2] || 'Add periodic hasCookie check to dashboard.html — setInterval every 60s that re-shows the apex login overlay if the cookie has expired mid-session';

async function run() {
    console.log('[Pipeline] Expanding prompt...');
    const spec = await expandPrompt(TASK);
    console.log('[Pipeline] Spec:', JSON.stringify(spec, null, 2));

    const taskId = `run-${Date.now().toString(36)}`;
    console.log(`\n[Pipeline] Starting runAgentTeam — taskId=${taskId}`);

    const result = await runAgentTeam(spec, taskId);

    console.log('\n[Pipeline] ── RESULT ──');
    console.log('success:   ', result.success);
    console.log('commitHash:', result.commitHash);
    console.log('cost:      ', result.cost);
    console.log('complexity:', result.complexity);
    console.log('error:     ', result.error || 'none');
    if (result.agentLogs?.length) {
        console.log('\n[Pipeline] Agent log summary:');
        for (const l of result.agentLogs) {
            const status = l.result?.passed === false || l.result?.error ? '✗' : '✓';
            console.log(`  ${status} ${l.role} (${l.duration}ms)`);
        }
    }
}

run().catch(e => {
    console.error('[Pipeline] Fatal:', e.message);
    process.exit(1);
});
