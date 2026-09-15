'use strict';

// Governance Agent Plugin Discovery
// Scans a directory for .js files and auto-registers any callable exports
// as governed agents with default capability set = ['untrusted.generic'].
// NEVER throws. All outputs frozen.

const fs      = require('fs');
const path    = require('path');
const adapter = require('./governance_agent_adapter');

// discover_agents(directory)
// Returns a frozen discovery report.
function discover_agents(directory) {
    const agents = [];
    const errors = [];
    let discovered = 0;
    let registered = 0;
    let failed     = 0;

    try {
        let files;
        try {
            files = fs.readdirSync(directory).filter(f => f.endsWith('.js'));
        } catch (e) {
            return Object.freeze({
                discovered: 0, registered: 0, failed: 0,
                agents:     Object.freeze([]),
                errors:     Object.freeze([{ file: directory, reason: `DIRECTORY_ERROR: ${e?.message ?? 'unknown'}` }]),
            });
        }

        for (const file of files) {
            const full_path = path.join(directory, file);
            const agent_id  = path.basename(file, '.js');
            discovered++;

            const reg = adapter.register_external_agent(full_path, {
                agent_id,
                capabilities: ['untrusted.generic'],
                metadata:     { source: 'discovery', file, directory },
            });

            if (reg.success) {
                registered++;
                agents.push(Object.freeze({ agent_id, file, trust_level: reg.trust_level ?? 'UNTRUSTED' }));
            } else {
                failed++;
                errors.push(Object.freeze({ agent_id, file, reason: reg.reason }));
            }
        }
    } catch (_) {
        // absorb unexpected errors — report what was processed so far
    }

    return Object.freeze({
        discovered,
        registered,
        failed,
        agents: Object.freeze([...agents]),
        errors: Object.freeze([...errors]),
    });
}

module.exports = Object.freeze({ discover_agents });
