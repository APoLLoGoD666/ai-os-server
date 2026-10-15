'use strict';
// domains/infrastructure/src/runtime/index.js — Infrastructure domain runtime operations

const DOMAIN_ID = 'DOM-000007';

function healthCheck() {
    const uptime = process.uptime();
    const mem    = process.memoryUsage();
    return {
        ok:        true,
        domain_id: DOMAIN_ID,
        op:        'health_check',
        uptime_s:  Math.floor(uptime),
        mem_mb:    Math.round(mem.rss / 1_048_576),
        generated_at: new Date().toISOString(),
    };
}

module.exports = Object.freeze({ healthCheck, DOMAIN_ID });
